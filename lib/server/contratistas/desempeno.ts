import { nivelDePuntaje, type NivelDesempeno } from '@/lib/contratacion';

// Puntaje de desempeño de un contratista (MODULOS_AVANZADOS.md, módulo 1).
// Función pura: se calcula al vuelo con los datos declarados, no se almacena.

export interface ObraParaDesempeno {
  /** Solo las obras culminadas o inauguradas puntúan. */
  culminada: boolean;
  fechaFinReal: Date | null;
  /** Fecha límite del contrato (con adendas); si no hay contrato, la fecha estimada de la obra. */
  fechaLimite: Date | null;
  montoOriginal: number | null;
  montoActual: number | null;
  tuvoParalizacion: boolean;
}

export interface Desempeno {
  /** 0-100, o null si todavía no hay obras culminadas con las que calcularlo. */
  puntaje: number | null;
  nivel: NivelDesempeno | null;
  obrasEvaluadas: number;
  /** % de obras entregadas dentro de plazo (de las que tienen fechas); null sin datos. */
  pctATiempo: number | null;
  /** Sobrecosto promedio de los contratos, en %; null sin contratos. */
  sobrecostoPromedioPct: number | null;
  /** % de obras sin periodos de paralización. */
  pctSinParalizacion: number | null;
}

// Pesos del documento: 50% plazos, 30% sobrecosto, 20% paralizaciones. Si falta
// información de un componente (por ejemplo una obra sin contrato), su peso se
// reparte entre los demás en vez de penalizar o premiar por un dato que no existe.
const PESO_PLAZOS = 0.5;
const PESO_SOBRECOSTO = 0.3;
const PESO_SIN_PARALIZACION = 0.2;

const redondear = (n: number) => Math.round(n);

export function calcularDesempeno(obras: ObraParaDesempeno[]): Desempeno {
  const culminadas = obras.filter((o) => o.culminada);
  if (culminadas.length === 0) {
    return { puntaje: null, nivel: null, obrasEvaluadas: 0, pctATiempo: null, sobrecostoPromedioPct: null, pctSinParalizacion: null };
  }

  const conFechas = culminadas.filter((o) => o.fechaFinReal && o.fechaLimite);
  const aTiempo = conFechas.filter((o) => (o.fechaFinReal as Date).getTime() <= (o.fechaLimite as Date).getTime()).length;
  const ratioPlazos = conFechas.length > 0 ? aTiempo / conFechas.length : null;

  const conContrato = culminadas.filter((o) => o.montoOriginal !== null && o.montoActual !== null && o.montoOriginal > 0);
  const sobrecostos = conContrato.map((o) => Math.max(0, ((o.montoActual as number) - (o.montoOriginal as number)) / (o.montoOriginal as number)));
  const sobrecostoPromedio = sobrecostos.length > 0 ? sobrecostos.reduce((s, x) => s + x, 0) / sobrecostos.length : null;
  const ratioSobrecosto = sobrecostoPromedio === null ? null : 1 - Math.min(1, sobrecostoPromedio);

  const ratioSinParalizacion = culminadas.filter((o) => !o.tuvoParalizacion).length / culminadas.length;

  const componentes: [number, number | null][] = [
    [PESO_PLAZOS, ratioPlazos],
    [PESO_SOBRECOSTO, ratioSobrecosto],
    [PESO_SIN_PARALIZACION, ratioSinParalizacion],
  ];
  const disponibles = componentes.filter((c): c is [number, number] => c[1] !== null);
  const pesoTotal = disponibles.reduce((s, [peso]) => s + peso, 0);
  const puntaje = redondear((disponibles.reduce((s, [peso, valor]) => s + peso * valor, 0) / pesoTotal) * 100);

  return {
    puntaje,
    nivel: nivelDePuntaje(puntaje),
    obrasEvaluadas: culminadas.length,
    pctATiempo: ratioPlazos === null ? null : redondear(ratioPlazos * 100),
    sobrecostoPromedioPct: sobrecostoPromedio === null ? null : Math.round(sobrecostoPromedio * 1000) / 10,
    pctSinParalizacion: redondear(ratioSinParalizacion * 100),
  };
}
