'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Share2, Copy, Check, Users } from 'lucide-react';
import Link from 'next/link';

interface ObraAccionesProps {
  nombre: string;
  url: string;
  qrDataUrl: string;
  slug: string;
}

export function ObraAcciones({ nombre, url, qrDataUrl, slug }: ObraAccionesProps) {
  const [copiado, setCopiado] = useState(false);

  async function compartir() {
    if (navigator.share) {
      try {
        await navigator.share({ title: nombre, url });
        return;
      } catch {
        // El usuario canceló el share nativo — no hacer nada.
        return;
      }
    }
    await copiarEnlace();
  }

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Portapapeles no disponible (ej. sin HTTPS) — silencioso.
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Acciones</h2>

      <Link
        href={`/obras/${slug}/equipo`}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Users className="size-4" />
        Ver equipo de trabajo
      </Link>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={compartir}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          <Share2 className="size-4" />
          Compartir
        </button>
        <button
          type="button"
          onClick={copiarEnlace}
          aria-label="Copiar enlace"
          className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 hover:bg-muted"
        >
          {copiado ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
        </button>
      </div>

      <div className="flex flex-col items-center gap-2 border-t border-border pt-4">
        <Image src={qrDataUrl} alt="Código QR de la obra" width={140} height={140} unoptimized />
        <p className="text-center text-xs text-muted-foreground">
          Escanea para ver esta obra desde el teléfono — ideal para la valla informativa en campo.
        </p>
      </div>
    </section>
  );
}
