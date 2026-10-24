'use client';

import { RefreshCw } from 'lucide-react';

export function BotonReintentar() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
    >
      <RefreshCw className="size-4" aria-hidden="true" />
      Reintentar
    </button>
  );
}
