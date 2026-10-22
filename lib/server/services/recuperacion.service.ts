import { createHash } from 'node:crypto';
import { prisma } from '@/lib/server/prisma';
import { firmarTokenTemporal, hashPassword, verificarTokenTemporal } from '@/lib/server/auth';
import { enviarCorreo } from '@/lib/server/mail';
import { registrarAuditoria } from '@/lib/server/services/auditoria.service';

/** Error de recuperación de contraseña (enlace vencido o ya usado); el Route Handler lo traduce a su status. */
export class RecuperacionError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const VIGENCIA_SEG = 30 * 60;

// Huella corta de la contraseña actual dentro del enlace: en cuanto la contraseña
// cambia (con este mismo enlace o de cualquier otra forma), el enlace deja de
// valer. Así un enlace es de un solo uso sin necesidad de una tabla de tokens.
const huellaPassword = (hash: string) => createHash('sha256').update(hash).digest('hex').slice(0, 16);

const MENSAJE_GENERICO = 'Si el correo está registrado, te enviamos un enlace para restablecer la contraseña. Revisa tu bandeja (y la carpeta de spam).';

/**
 * Pide el enlace de recuperación. Responde SIEMPRE lo mismo, exista o no el
 * correo: así nadie puede usar este formulario para averiguar quién tiene cuenta.
 */
export async function solicitarRecuperacion(email: string, urlSitio: string): Promise<string> {
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (usuario?.activo) {
    const token = firmarTokenTemporal('recuperar-password', { sub: usuario.id, ph: huellaPassword(usuario.password) }, VIGENCIA_SEG);
    const enlace = `${urlSitio}/admin/restablecer?token=${encodeURIComponent(token)}`;

    // Sin await: enviar el correo tarda y esa diferencia de tiempo delataría si la cuenta existe.
    void enviarCorreo({
      para: usuario.email,
      asunto: 'Restablece tu contraseña de SIGOP',
      texto: [
        `Hola ${usuario.nombre},`,
        '',
        'Recibimos una solicitud para restablecer la contraseña de tu cuenta del panel de SIGOP.',
        `Abre este enlace en los próximos ${VIGENCIA_SEG / 60} minutos:`,
        '',
        enlace,
        '',
        'Si no lo pediste tú, ignora este mensaje: tu contraseña no cambia mientras no abras el enlace.',
      ].join('\n'),
    }).catch((error) => console.error('[recuperación] no se pudo enviar el correo:', error instanceof Error ? error.message : error));
  }

  return MENSAJE_GENERICO;
}

export async function restablecerPassword(token: string, nuevaPassword: string) {
  const claims = verificarTokenTemporal('recuperar-password', token);
  const invalido = new RecuperacionError(400, 'El enlace no es válido, venció o ya se usó. Pide uno nuevo.');
  if (!claims) throw invalido;

  const usuario = await prisma.usuario.findUnique({ where: { id: claims.sub } });
  if (!usuario || !usuario.activo || huellaPassword(usuario.password) !== claims.ph) throw invalido;

  await prisma.usuario.update({ where: { id: usuario.id }, data: { password: await hashPassword(nuevaPassword) } });
  // La bitácora deja constancia del cambio, nunca de la contraseña.
  await registrarAuditoria({ usuarioId: usuario.id, accion: 'PASSWORD_RESTABLECIDA', entidad: 'Usuario', entidadId: usuario.id });
}
