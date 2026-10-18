import type { TipoAlerta } from '@prisma/client';
import { diasEntre } from '@/lib/paralizacion';

// Reglas del motor de alertas (MODULOS_AVANZADOS.md, módulo 3). Son funciones
// puras: reciben los datos de una obra y devuelven qué alertas le corresponden
// hoy, así se pueden probar sin base de datos.

export const DIAS_SIN_ACTUALIZACION = 30;
export const UMBRAL_DESFASE_FINANCIERO = 20; // puntos porcentuales
export const DIAS_VENCIMIENTO_PROXIMO = 30;
export const AVANCE_MINIMO_ANTES_DE_VENCER = 90; // % físico
export const DIAS_PARALIZADA_PROLONGADA = 90;
/** Una alerta resuelta a mano no vuelve a crearse durante estos días, aunque la condición siga. */
export const DIAS_SILENCIO_TRAS_RESOLVER = 7;

const ESTATUS_TERMINADOS = ['culminada', 'inaugurada'];
const ESTATUS_EN_EJECUCION = 'en ejecución';

export interface DatosObraParaAlertas {
  estatus: string;
  avanceFisico: number;
  avanceFinanciero: number;
  createdAt: Date;
  fechaInicio: Date | null;
  fechaFinEstimada: Date | null;
  ultimoAvance: Date | null;
  paralizadaDesde: Date | null;
}

export interface AlertaCalculada {
  tipo: TipoAlerta;
  severidad: 1 | 2 | 3;
  mensaje: string;
}

const fecha = new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' });

export function evaluarObra(obra: DatosObraParaAlertas, ahora = new Date()): AlertaCalculada[] {
  const alertas: AlertaCalculada[] = [];
  const estatus = obra.estatus.toLowerCase();
  const terminada = ESTATUS_TERMINADOS.includes(estatus);
  if (terminada) return alertas;

  // Sin avances recientes: solo para obras que deberían estar avanzando.
  if (estatus === ESTATUS_EN_EJECUCION && !obra.paralizadaDesde) {
    const referencia = obra.ultimoAvance ?? obra.fechaInicio ?? obra.createdAt;
    const dias = diasEntre(referencia, ahora);
    if (dias > DIAS_SIN_ACTUALIZACION) {
      alertas.push({
        tipo: 'SIN_ACTUALIZACION',
        severidad: dias > DIAS_SIN_ACTUALIZACION * 3 ? 3 : 2,
        mensaje: obra.ultimoAvance
          ? `Sin avances registrados hace ${dias} días (el último fue el ${fecha.format(obra.ultimoAvance)}).`
          : `Nunca se ha registrado un avance; la obra lleva ${dias} días sin actualizarse.`,
      });
    }
  }

  const desfase = obra.avanceFinanciero - obra.avanceFisico;
  if (desfase > UMBRAL_DESFASE_FINANCIERO) {
    alertas.push({
      tipo: 'DESFASE_FINANCIERO',
      severidad: 3,
      mensaje: `El avance financiero (${obra.avanceFinanciero}%) supera al físico (${obra.avanceFisico}%) por ${Math.round(desfase)} puntos.`,
    });
  }

  if (obra.fechaFinEstimada) {
    if (obra.fechaFinEstimada.getTime() < ahora.getTime() && obra.avanceFisico < 100) {
      alertas.push({
        tipo: 'OBRA_VENCIDA',
        severidad: 3,
        mensaje: `La fecha de fin estimada (${fecha.format(obra.fechaFinEstimada)}) pasó hace ${diasEntre(obra.fechaFinEstimada, ahora)} días y el avance físico es ${obra.avanceFisico}%.`,
      });
    } else {
      const faltan = diasEntre(ahora, obra.fechaFinEstimada);
      if (faltan <= DIAS_VENCIMIENTO_PROXIMO && obra.avanceFisico < AVANCE_MINIMO_ANTES_DE_VENCER) {
        alertas.push({
          tipo: 'VENCIMIENTO_PROXIMO',
          severidad: 2,
          mensaje: `Faltan ${faltan} días para la fecha de fin estimada (${fecha.format(obra.fechaFinEstimada)}) y el avance físico es solo ${obra.avanceFisico}%.`,
        });
      }
    }
  }

  if (obra.paralizadaDesde) {
    const dias = diasEntre(obra.paralizadaDesde, ahora);
    if (dias > DIAS_PARALIZADA_PROLONGADA) {
      alertas.push({
        tipo: 'PARALIZADA_PROLONGADA',
        severidad: dias > 365 ? 3 : 2,
        mensaje: `La obra lleva ${dias} días paralizada (desde el ${fecha.format(obra.paralizadaDesde)}).`,
      });
    }
  }

  return alertas;
}

export const TIPO_ALERTA_LEGIBLE: Record<TipoAlerta, string> = {
  SIN_ACTUALIZACION: 'Sin actualización',
  DESFASE_FINANCIERO: 'Desfase financiero',
  VENCIMIENTO_PROXIMO: 'Vencimiento próximo',
  OBRA_VENCIDA: 'Obra vencida',
  PARALIZADA_PROLONGADA: 'Paralizada por mucho tiempo',
};
