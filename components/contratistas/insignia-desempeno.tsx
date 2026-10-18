import { NIVEL_DESEMPENO_LEGIBLE, type NivelDesempeno } from '@/lib/contratacion';

const CLASE: Record<NivelDesempeno, string> = {
  CONFIABLE: 'bg-success/10 text-success',
  REGULAR: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
  BAJO: 'bg-destructive/10 text-destructive',
};

// Se muestra el nivel con texto (no solo con color) y el puntaje numérico.
export function InsigniaDesempeno({ puntaje, nivel }: { puntaje: number | null; nivel: NivelDesempeno | null }) {
  if (puntaje === null || nivel === null) {
    return <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Sin historial suficiente</span>;
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${CLASE[nivel]}`}>
      {NIVEL_DESEMPENO_LEGIBLE[nivel]} · {puntaje}/100
    </span>
  );
}
