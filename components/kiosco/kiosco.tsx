'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pause, Play, Star, X } from 'lucide-react';
import ObrasMapLoader from '@/components/map/obras-map-loader';
import { BarraProgreso } from '@/components/kiosco/barra-progreso';
import { formatearMoneda } from '@/lib/format';
import {
  indiceTrasActualizar,
  indicadoresGlobales,
  moverIndice,
  obrasDelRecorrido,
  type OpcionesKiosco,
} from '@/lib/kiosco';
import type { ObraMapa } from '@/lib/types/obra';

const REFRESCO_MS = 5 * 60 * 1000; // los datos se vuelven a pedir cada 5 minutos
const REINTENTO_MS = 30 * 1000;

const botonControl =
  'flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-base font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary';

// Modo kiosco / presentación (PLAN_PROYECTO.md sección 4): recorre las obras destacadas una por
// una, acercando el mapa a cada una, para pantallas en actos públicos. Opciones por URL:
// `?intervalo=20` (segundos por obra), `?todas=1` (no solo destacadas), `?capa=satelite`.
export function Kiosco({ opciones }: { opciones: OpcionesKiosco }) {
  const [obras, setObras] = useState<ObraMapa[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [qr, setQr] = useState<{ url: string; imagen: string } | null>(null);
  const obraActualRef = useRef<ObraMapa | undefined>(undefined);

  const recorrido = useMemo(() => obrasDelRecorrido(obras ?? [], opciones.todas), [obras, opciones.todas]);
  const total = recorrido.obras.length;
  const actual: ObraMapa | undefined = total > 0 ? recorrido.obras[indice % total] : undefined;
  const indicadores = useMemo(() => indicadoresGlobales(obras ?? []), [obras]);

  useEffect(() => {
    obraActualRef.current = actual;
  }, [actual]);

  // Carga y recarga periódica. Si falla, se sigue mostrando lo último que se tenía y se reintenta pronto.
  useEffect(() => {
    let cancelado = false;
    let temporizador: ReturnType<typeof setTimeout>;

    async function cargar() {
      try {
        const res = await fetch('/api/obras', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const data: { obras: ObraMapa[] } = await res.json();
        if (cancelado) return;
        setObras(data.obras);
        setFallo(false);
        // Conserva la obra que se estaba mostrando si sigue en el recorrido.
        setIndice(indiceTrasActualizar(obraActualRef.current, obrasDelRecorrido(data.obras, opciones.todas).obras));
        temporizador = setTimeout(cargar, REFRESCO_MS);
      } catch {
        if (cancelado) return;
        setFallo(true);
        temporizador = setTimeout(cargar, REINTENTO_MS);
      }
    }

    void cargar();
    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [opciones.todas]);

  const avanzar = useCallback((paso: 1 | -1) => setIndice((i) => moverIndice(i, paso, total)), [total]);

  // Teclado: flechas para cambiar de obra, espacio para pausar.
  useEffect(() => {
    function alPulsar(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') avanzar(1);
      else if (e.key === 'ArrowLeft') avanzar(-1);
      else if (e.key === ' ') {
        e.preventDefault();
        setPausado((p) => !p);
      }
    }
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [avanzar]);

  // Mantiene la pantalla encendida mientras el kiosco está abierto (si el navegador lo permite).
  useEffect(() => {
    let candado: WakeLockSentinel | null = null;
    async function pedir() {
      try {
        if (document.visibilityState === 'visible') candado = await navigator.wakeLock?.request('screen');
      } catch {
        candado = null; // sin soporte o rechazado: la pantalla se comportará como siempre
      }
    }
    void pedir();
    document.addEventListener('visibilitychange', pedir);
    return () => {
      document.removeEventListener('visibilitychange', pedir);
      void candado?.release();
    };
  }, []);

  // Código QR de la ficha de la obra en pantalla, para que el público la abra en su celular.
  const urlFicha = actual && typeof window !== 'undefined' ? `${window.location.origin}/obras/${actual.slug}` : null;
  useEffect(() => {
    if (!urlFicha) return;
    let cancelado = false;
    import('qrcode')
      .then((m) => m.toDataURL(urlFicha, { margin: 1, width: 280 }))
      .then((imagen) => !cancelado && setQr({ url: urlFicha, imagen }))
      .catch(() => !cancelado && setQr(null));
    return () => {
      cancelado = true;
    };
  }, [urlFicha]);

  const enfoque = useMemo(() => (actual ? { obra: actual, token: indice } : null), [actual, indice]);

  return (
    <main className="fixed inset-0 flex flex-col bg-background text-foreground">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-8 gap-y-2 border-b-2 border-primary/15 px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-xl font-bold text-primary-foreground">
            S
          </span>
          <div className="leading-tight">
            <p className="text-2xl font-bold">SIGOP</p>
            <p className="hidden text-sm text-foreground/60 md:block">Sistema de Información Geográfica de Obras Públicas</p>
          </div>
        </div>

        <dl className="flex gap-8 text-center">
          <Indicador etiqueta="Obras" valor={indicadores.total} />
          <Indicador etiqueta="Culminadas" valor={indicadores.culminadas} />
          <Indicador etiqueta="Avance promedio" valor={`${indicadores.avancePromedio}%`} />
        </dl>

        <Link href="/" className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-foreground/60 hover:bg-muted hover:text-foreground">
          <X className="size-4" aria-hidden="true" />
          Salir del modo kiosco
        </Link>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative min-h-[40%] flex-1">
          {obras && <ObrasMapLoader obras={obras} enfoque={enfoque} capa={opciones.capa} />}
        </div>

        <aside className="flex w-full shrink-0 flex-col border-t-2 border-primary/15 lg:w-[30rem] lg:border-l-2 lg:border-t-0 xl:w-[36rem]">
          {actual && total > 1 && (
            <BarraProgreso key={`${actual.id}-${indice}`} duracionMs={opciones.intervaloSeg * 1000} pausado={pausado} onCompletar={() => avanzar(1)} />
          )}

          <div className="flex flex-1 flex-col justify-center gap-4 overflow-y-auto p-6 xl:p-10">
            {!obras ? (
              <p className="text-center text-xl text-muted-foreground" role="status">
                {fallo ? 'No se pudo cargar la información. Reintentando…' : 'Cargando obras…'}
              </p>
            ) : !actual ? (
              <p className="text-center text-xl text-muted-foreground">Todavía no hay obras publicadas.</p>
            ) : (
              <>
                <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  {recorrido.soloDestacadas && <Star className="size-4 fill-amber-500 text-amber-500" aria-hidden="true" />}
                  {recorrido.soloDestacadas ? 'Obra destacada' : 'Obra'} {(indice % total) + 1} de {total}
                </p>

                {/* aria-live: un lector de pantalla anuncia la obra cuando cambia el turno. */}
                <div aria-live="polite" className="flex flex-col gap-4">
                  <p className="text-lg font-semibold xl:text-2xl" style={{ color: actual.tipoObra.color }}>
                    {actual.tipoObra.nombre}
                  </p>
                  <h1 className="text-3xl font-bold leading-tight xl:text-5xl">{actual.nombre}</h1>
                  <p className="text-lg text-muted-foreground xl:text-2xl">
                    {actual.parroquia ? `${actual.parroquia}, ` : ''}
                    {actual.municipio}, {actual.estado}
                  </p>
                </div>

                <span
                  className="w-fit rounded-full px-4 py-1.5 text-base font-semibold text-white xl:text-xl"
                  style={{ backgroundColor: actual.estatus.color }}
                >
                  {actual.estatus.nombre}
                </span>

                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg text-muted-foreground xl:text-xl">Avance físico</span>
                    <span className="text-5xl font-bold tabular-nums xl:text-7xl">{actual.avanceFisico}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Avance físico"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={actual.avanceFisico}
                    className="mt-2 h-4 overflow-hidden rounded-full bg-muted"
                  >
                    <div className="h-full rounded-full bg-primary" style={{ width: `${actual.avanceFisico}%` }} />
                  </div>
                </div>

                {actual.presupuestoAprobado > 0 && (
                  <p className="text-lg xl:text-2xl">
                    <span className="text-muted-foreground">Presupuesto aprobado: </span>
                    <span className="font-semibold tabular-nums">{formatearMoneda(actual.presupuestoAprobado, actual.moneda)}</span>
                  </p>
                )}

                {qr && qr.url === urlFicha && (
                  <div className="flex items-center gap-4 rounded-xl border border-border p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- código QR generado en el navegador (data URL) */}
                    <img src={qr.imagen} alt={`Código QR de la ficha de ${actual.nombre}`} className="size-28 rounded bg-white xl:size-36" />
                    <p className="text-sm text-muted-foreground xl:text-lg">
                      Escanea el código con tu celular para ver la ficha completa de esta obra.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-center gap-3 border-t border-border p-4">
            <button type="button" onClick={() => avanzar(-1)} disabled={total < 2} aria-label="Obra anterior" className={botonControl}>
              <ChevronLeft className="size-6" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setPausado((p) => !p)} disabled={total < 2} aria-pressed={pausado} className={`${botonControl} min-w-36`}>
              {pausado ? <Play className="size-6" aria-hidden="true" /> : <Pause className="size-6" aria-hidden="true" />}
              {pausado ? 'Reanudar' : 'Pausar'}
            </button>
            <button type="button" onClick={() => avanzar(1)} disabled={total < 2} aria-label="Obra siguiente" className={botonControl}>
              <ChevronRight className="size-6" aria-hidden="true" />
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Indicador({ etiqueta, valor }: { etiqueta: string; valor: string | number }) {
  return (
    <div>
      <dd className="text-3xl font-bold tabular-nums">{valor}</dd>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
    </div>
  );
}
