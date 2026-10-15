'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Share2, Copy, Check, Users, FileDown } from 'lucide-react';
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

  // Enlaces de compartir directos de cada red: sin botones ni scripts de
  // terceros, que rastrearían a quien visita el portal.
  const texto = `${nombre} — obra pública en SIGOP`;
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(texto);
  const redes = [
    { nombre: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}` },
    { nombre: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { nombre: 'X', href: `https://x.com/intent/post?text=${t}&url=${u}` },
    { nombre: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
    { nombre: 'Correo', href: `mailto:?subject=${t}&body=${encodeURIComponent(`${texto}\n${url}`)}` },
  ];

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold print:hidden">Compartir y equipo</h2>

      <Link
        href={`/obras/${slug}/equipo`}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background print:hidden"
      >
        <Users className="size-4" aria-hidden="true" />
        Ver equipo de trabajo
      </Link>

      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden"
      >
        <FileDown className="size-4" aria-hidden="true" />
        Descargar ficha en PDF
      </button>

      <div className="flex gap-2 print:hidden">
        <button
          type="button"
          onClick={compartir}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Share2 className="size-4" aria-hidden="true" />
          Compartir
        </button>
        <button
          type="button"
          onClick={copiarEnlace}
          aria-label={copiado ? 'Enlace copiado' : 'Copiar enlace'}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border px-3 py-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copiado ? (
            <Check className="size-4 text-success" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
        </button>
        <span role="status" aria-live="polite" className="sr-only">
          {copiado ? 'Enlace copiado al portapapeles' : ''}
        </span>
      </div>

      <div className="flex flex-col gap-2 print:hidden">
        <p className="text-xs font-medium text-muted-foreground">Compartir en</p>
        <ul className="flex flex-wrap gap-2">
          {redes.map((red) => (
            <li key={red.nombre}>
              <a
                href={red.href}
                target={red.nombre === 'Correo' ? undefined : '_blank'}
                rel="noopener noreferrer"
                aria-label={`Compartir en ${red.nombre}${red.nombre === 'Correo' ? '' : ' (se abre en otra pestaña)'}`}
                className="inline-flex min-h-11 items-center rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {red.nombre}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col items-center gap-2 border-t border-border pt-4 print:border-0 print:pt-0">
        <Image
          src={qrDataUrl}
          alt="Código QR de la obra"
          width={140}
          height={140}
          unoptimized
          className="rounded-md border border-border bg-white p-1"
        />
        <p className="text-center text-xs text-muted-foreground">
          Escanea para ver esta obra desde el teléfono — ideal para la valla informativa en campo.
        </p>
      </div>
    </section>
  );
}
