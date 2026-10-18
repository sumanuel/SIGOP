'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BellRing } from 'lucide-react';

// Aviso del panel: cuántas alertas de gestión hay sin resolver (y cuántas críticas).
export function AvisoAlertas() {
  const [resumen, setResumen] = useState<{ total: number; criticas: number } | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch('/api/admin/alertas')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelado && data) setResumen(data.resumen);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  if (!resumen || resumen.total === 0) return null;

  return (
    <Link
      href="/admin/alertas"
      className="mt-6 flex w-fit items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10"
    >
      <BellRing className="size-4" aria-hidden="true" />
      {resumen.total} alerta{resumen.total === 1 ? '' : 's'} de gestión activa{resumen.total === 1 ? '' : 's'}
      {resumen.criticas > 0 && ` (${resumen.criticas} crítica${resumen.criticas === 1 ? '' : 's'})`} →
    </Link>
  );
}
