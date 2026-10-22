import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/server/prisma';
import { firmarTokenTemporal, verificarTokenTemporal } from '@/lib/server/auth';
import { enviarCorreo } from '@/lib/server/mail';

/** Error de suscripción (enlace inválido, obra inexistente…); el Route Handler lo traduce a su status. */
export class SuscripcionError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Suscripción a avisos de una obra (PLAN_PROYECTO.md sección 3.1). Doble
// confirmación: la persona debe abrir un enlace enviado a su correo, para que
// nadie pueda suscribir (y molestar) a otra persona.

const DIEZ_ANIOS_SEG = 10 * 365 * 24 * 60 * 60;
const MENSAJE_SOLICITUD = 'Te enviamos un correo para confirmar tu suscripción. Si no llega, revisa la carpeta de spam.';

const urlSitio = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

/** Enlace de baja: firmado, sin vencimiento práctico (debe funcionar en un correo de hace años), no adivinable. */
function enlaceBaja(suscripcionId: string): string {
  const token = firmarTokenTemporal('baja-suscripcion', { sub: suscripcionId }, DIEZ_ANIOS_SEG);
  return `${urlSitio()}/suscripcion/baja?token=${encodeURIComponent(token)}`;
}

/**
 * Pide la suscripción. La respuesta es la misma haya o no una suscripción previa
 * para ese correo, para no revelar quién está suscrito a qué.
 */
export async function solicitarSuscripcion(obraSlug: string, correo: string): Promise<string> {
  const obra = await prisma.obra.findFirst({
    where: { slug: obraSlug, estadoPublicacion: 'PUBLICADO' },
    select: { id: true, nombre: true },
  });
  if (!obra) throw new SuscripcionError(404, 'La obra no existe.');

  const existente = await prisma.suscripcion.findUnique({ where: { obraId_correo: { obraId: obra.id, correo } } });
  if (existente?.confirmado) return MENSAJE_SOLICITUD; // ya está suscrito: no se le manda nada nuevo

  const token = randomBytes(24).toString('base64url');
  await prisma.suscripcion.upsert({
    where: { obraId_correo: { obraId: obra.id, correo } },
    update: { tokenConfirmacion: token },
    create: { obraId: obra.id, correo, tokenConfirmacion: token },
  });

  void enviarCorreo({
    para: correo,
    asunto: `Confirma tu suscripción a "${obra.nombre}"`,
    texto: [
      'Hola,',
      '',
      `Alguien (esperamos que tú) pidió recibir avisos sobre la obra "${obra.nombre}" en SIGOP.`,
      'Para confirmar, abre este enlace:',
      '',
      `${urlSitio()}/suscripcion/confirmar?token=${encodeURIComponent(token)}`,
      '',
      'Si no fuiste tú, ignora este mensaje: no recibirás nada.',
    ].join('\n'),
  }).catch((error) => console.error('[suscripción] no se pudo enviar la confirmación:', error instanceof Error ? error.message : error));

  return MENSAJE_SOLICITUD;
}

export async function confirmarSuscripcion(token: string) {
  const suscripcion = await prisma.suscripcion.findUnique({
    where: { tokenConfirmacion: token },
    include: { obra: { select: { nombre: true } } },
  });
  if (!suscripcion) throw new SuscripcionError(400, 'El enlace no es válido o ya se usó.');

  await prisma.suscripcion.update({ where: { id: suscripcion.id }, data: { confirmado: true, tokenConfirmacion: null } });
  return { obra: suscripcion.obra.nombre };
}

export async function darDeBaja(token: string) {
  const claims = verificarTokenTemporal('baja-suscripcion', token);
  if (!claims) throw new SuscripcionError(400, 'El enlace de baja no es válido.');

  const suscripcion = await prisma.suscripcion.findUnique({ where: { id: claims.sub }, include: { obra: { select: { nombre: true } } } });
  // Si ya se dio de baja antes, se responde igual: el resultado que la persona quiere ya se cumplió.
  if (suscripcion) await prisma.suscripcion.delete({ where: { id: suscripcion.id } });
  return { obra: suscripcion?.obra.nombre ?? null };
}

// ---------------------------------------------------------------- avisos

// Máximo un aviso de "nuevo avance" por obra cada hora: si se cargan varios
// avances seguidos, los suscriptores no reciben una ráfaga de correos.
const INTERVALO_AVISO_AVANCE_MS = 60 * 60 * 1000;
const ultimoAvisoAvance = new Map<string, number>();

export type EventoObra =
  | { tipo: 'AVANCE'; avanceFisico: number; avanceFinanciero: number }
  | { tipo: 'PARALIZADA'; motivo: string }
  | { tipo: 'REACTIVADA' };

/**
 * Avisa a los suscriptores confirmados de una obra PUBLICADA. Nunca lanza ni
 * bloquea a quien dispara el evento: un fallo de correo no debe romper el guardado
 * de un avance. Úsalo con `void`.
 */
export async function notificarSuscriptores(obraId: string, evento: EventoObra): Promise<void> {
  try {
    if (evento.tipo === 'AVANCE') {
      const ultimo = ultimoAvisoAvance.get(obraId) ?? 0;
      if (Date.now() - ultimo < INTERVALO_AVISO_AVANCE_MS) return;
    }

    const obra = await prisma.obra.findUnique({
      where: { id: obraId },
      select: { nombre: true, slug: true, estadoPublicacion: true },
    });
    if (!obra || obra.estadoPublicacion !== 'PUBLICADO') return; // nada de avisar sobre obras no publicadas

    const suscriptores = await prisma.suscripcion.findMany({ where: { obraId, confirmado: true } });
    if (suscriptores.length === 0) return;
    if (evento.tipo === 'AVANCE') ultimoAvisoAvance.set(obraId, Date.now());

    const { asunto, linea } = describirEvento(obra.nombre, evento);
    const enlaceObra = `${urlSitio()}/obras/${obra.slug}`;

    for (const s of suscriptores) {
      const baja = enlaceBaja(s.id);
      await enviarCorreo({
        para: s.correo,
        asunto,
        texto: [
          linea,
          '',
          `Ver la obra: ${enlaceObra}`,
          '',
          '—',
          'Recibes este correo porque te suscribiste a esta obra en SIGOP.',
          `Para dejar de recibirlo: ${baja}`,
        ].join('\n'),
        encabezados: { 'List-Unsubscribe': `<${baja}>` },
      }).catch((error) => console.error('[suscripción] falló un aviso:', error instanceof Error ? error.message : error));
    }
  } catch (error) {
    console.error('[suscripción] no se pudo avisar a los suscriptores:', error instanceof Error ? error.message : error);
  }
}

function describirEvento(nombre: string, evento: EventoObra) {
  if (evento.tipo === 'AVANCE') {
    return {
      asunto: `Nuevo avance en "${nombre}"`,
      linea: `La obra "${nombre}" tiene un nuevo avance: ${evento.avanceFisico}% de avance físico y ${evento.avanceFinanciero}% de avance financiero.`,
    };
  }
  if (evento.tipo === 'PARALIZADA') {
    return { asunto: `"${nombre}" fue paralizada`, linea: `La obra "${nombre}" fue paralizada. Motivo declarado: ${evento.motivo}.` };
  }
  return { asunto: `"${nombre}" fue reactivada`, linea: `La obra "${nombre}" fue reactivada y vuelve a estar en ejecución.` };
}
