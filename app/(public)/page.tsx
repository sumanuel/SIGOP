'use client';

import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import ObrasMapLoader from '@/components/map/obras-map-loader';
import { MapSidebar, claveAnio, claveParroquia, type Vista } from '@/components/map/map-sidebar';
import { ObrasLista } from '@/components/map/obras-lista';
import { ObraDetallePanel } from '@/components/map/obra-detalle-panel';
import { SelectorCapas } from '@/components/map/selector-capas';
import { CAPA_POR_DEFECTO, esCapaMapa, type CapaMapa } from '@/lib/map-style';
import { OBRAS_DEMO } from '@/lib/data/obras-demo';
import { normalizarTexto } from '@/lib/texto';
import type { ObraMapa } from '@/lib/types/obra';

type EstadoCarga = 'cargando' | 'ok' | 'error';

const CLAVE_CAPA = 'sigop-capa-mapa';

/** La capa elegida se recuerda en este navegador; si el almacenamiento no está disponible se usa la de siempre. */
function leerCapaGuardada(): CapaMapa {
  try {
    const guardada = window.localStorage.getItem(CLAVE_CAPA);
    return esCapaMapa(guardada) ? guardada : CAPA_POR_DEFECTO;
  } catch {
    return CAPA_POR_DEFECTO;
  }
}

// Los montos de monedas distintas no se pueden comparar (9.600.000 USD no son
// 9.600.000 Bs.): el filtro de presupuesto trabaja siempre dentro de UNA moneda.
function calcularLimitesPresupuesto(obras: ObraMapa[], moneda: string): [number, number] {
  const montos = obras.filter((o) => o.moneda === moneda).map((o) => o.presupuestoAprobado);
  if (montos.length === 0) return [0, 0];
  return [Math.min(...montos), Math.max(...montos)];
}

/** Monedas presentes en las obras: bolívares primero, el resto en orden alfabético. */
function monedasDe(obras: ObraMapa[]): string[] {
  return [...new Set(obras.map((o) => o.moneda))].sort((a, b) => (a === 'VES' ? -1 : b === 'VES' ? 1 : a.localeCompare(b)));
}

export default function MapaPage() {
  const [obras, setObras] = useState<ObraMapa[]>([]);
  const [estado, setEstado] = useState<EstadoCarga>('cargando');
  const [modoDemo, setModoDemo] = useState(false);
  const [obraSeleccionada, setObraSeleccionada] = useState<ObraMapa | null>(null);
  // Pedido de acercar el mapa a una obra; `token` cambia en cada pedido para poder repetir la misma.
  const [enfoque, setEnfoque] = useState<{ obra: ObraMapa; token: number } | null>(null);
  const [vista, setVista] = useState<Vista>('mapa');
  // Se lee de localStorage al montar; el selector no se dibuja hasta que cargan las obras, así que no hay desajuste de hidratación.
  const [capa, setCapa] = useState<CapaMapa>(() => (typeof window === 'undefined' ? CAPA_POR_DEFECTO : leerCapaGuardada()));

  function cambiarCapa(nueva: CapaMapa) {
    setCapa(nueva);
    try {
      window.localStorage.setItem(CLAVE_CAPA, nueva);
    } catch {
      /* sin almacenamiento: la elección vale solo para esta visita */
    }
  }
  const [filtrosAbiertosEnMovil, setFiltrosAbiertosEnMovil] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [tiposActivos, setTiposActivos] = useState<Set<string>>(new Set());
  const [estadosActivos, setEstadosActivos] = useState<Set<string>>(new Set());
  const [municipiosActivos, setMunicipiosActivos] = useState<Set<string>>(new Set());
  const [parroquiasActivas, setParroquiasActivas] = useState<Set<string>>(new Set());
  const [estatusActivos, setEstatusActivos] = useState<Set<string>>(new Set());
  const [aniosActivos, setAniosActivos] = useState<Set<string>>(new Set());
  const [rangoAvance, setRangoAvance] = useState<[number, number]>([0, 100]);
  const [rangoPresupuesto, setRangoPresupuesto] = useState<[number, number]>([0, 0]);
  const [limitesPresupuesto, setLimitesPresupuesto] = useState<[number, number]>([0, 0]);
  const [monedaPresupuesto, setMonedaPresupuesto] = useState('VES');

  // Guarda las obras y, en el mismo paso, activa todos sus valores en cada
  // filtro (evita un segundo efecto encadenado solo para derivar esto).
  function aplicarObras(nuevas: ObraMapa[]) {
    setObras(nuevas);
    setTiposActivos(new Set(nuevas.map((o) => o.tipoObra.nombre)));
    setEstadosActivos(new Set(nuevas.map((o) => o.estado)));
    setMunicipiosActivos(new Set(nuevas.map((o) => o.municipio)));
    setParroquiasActivas(new Set(nuevas.map(claveParroquia)));
    setEstatusActivos(new Set(nuevas.map((o) => o.estatus.nombre)));
    setAniosActivos(new Set(nuevas.map(claveAnio)));

    const monedas = monedasDe(nuevas);
    const moneda = monedas[0] ?? 'VES';
    const limites = calcularLimitesPresupuesto(nuevas, moneda);
    setMonedaPresupuesto(moneda);
    setLimitesPresupuesto(limites);
    setRangoPresupuesto(limites);
  }

  // Al cambiar de moneda el rango se reinicia: los límites son otros.
  function cambiarMonedaPresupuesto(moneda: string) {
    const limites = calcularLimitesPresupuesto(obras, moneda);
    setMonedaPresupuesto(moneda);
    setLimitesPresupuesto(limites);
    setRangoPresupuesto(limites);
  }

  useEffect(() => {
    let cancelado = false;

    async function cargarObras() {
      try {
        const res = await fetch('/api/obras');
        if (!res.ok) throw new Error(`API respondió ${res.status}`);

        const data: { obras: ObraMapa[] } = await res.json();
        if (cancelado) return;

        if (data.obras.length === 0) {
          // La API funciona pero la base de datos todavía no tiene obras
          // publicadas (ej. antes de correr `npm run prisma:seed`) — se
          // muestran datos de demostración para no dejar el mapa vacío,
          // dejando claro que no son datos reales.
          aplicarObras(OBRAS_DEMO);
          setModoDemo(true);
        } else {
          aplicarObras(data.obras);
          setModoDemo(false);
        }
        setEstado('ok');
      } catch (error) {
        if (cancelado) return;
        console.error('No se pudo cargar /api/obras:', error);
        // A diferencia del caso "sin datos", aquí la API sí falló (por
        // ejemplo, sin DATABASE_URL configurado) — se avisa explícitamente
        // en vez de disimularlo con datos de demostración.
        aplicarObras(OBRAS_DEMO);
        setModoDemo(true);
        setEstado('error');
      }
    }

    cargarObras();
    return () => {
      cancelado = true;
    };
  }, []);

  const busquedaNormalizada = normalizarTexto(busqueda);

  // El filtro está "activo" cuando el rango se estrechó respecto a sus límites.
  // Mientras no lo está, se ven todas las obras sin importar su moneda; cuando sí,
  // solo las de la moneda elegida que caen dentro del rango.
  const presupuestoActivo = rangoPresupuesto[0] > limitesPresupuesto[0] || rangoPresupuesto[1] < limitesPresupuesto[1];

  const obrasFiltradas = obras.filter((o) => {
    if (!tiposActivos.has(o.tipoObra.nombre)) return false;
    if (!estadosActivos.has(o.estado)) return false;
    if (!municipiosActivos.has(o.municipio)) return false;
    if (!parroquiasActivas.has(claveParroquia(o))) return false;
    if (!estatusActivos.has(o.estatus.nombre)) return false;
    if (!aniosActivos.has(claveAnio(o))) return false;
    if (o.avanceFisico < rangoAvance[0] || o.avanceFisico > rangoAvance[1]) return false;
    if (presupuestoActivo) {
      if (o.moneda !== monedaPresupuesto) return false;
      if (o.presupuestoAprobado < rangoPresupuesto[0] || o.presupuestoAprobado > rangoPresupuesto[1]) return false;
    }
    if (busquedaNormalizada) {
      const coincide =
        normalizarTexto(o.nombre).includes(busquedaNormalizada) ||
        normalizarTexto(o.codigo).includes(busquedaNormalizada);
      if (!coincide) return false;
    }
    return true;
  });

  return (
    <div className="absolute inset-0 flex">
      <MapSidebar
        obras={obras}
        obrasFiltradas={obrasFiltradas}
        busqueda={busqueda}
        onCambiarBusqueda={setBusqueda}
        vista={vista}
        onCambiarVista={(v) => {
          setVista(v);
          setFiltrosAbiertosEnMovil(false);
        }}
        tiposActivos={tiposActivos}
        onCambiarTipos={setTiposActivos}
        estadosActivos={estadosActivos}
        onCambiarEstados={setEstadosActivos}
        municipiosActivos={municipiosActivos}
        onCambiarMunicipios={setMunicipiosActivos}
        parroquiasActivas={parroquiasActivas}
        onCambiarParroquias={setParroquiasActivas}
        estatusActivos={estatusActivos}
        onCambiarEstatus={setEstatusActivos}
        aniosActivos={aniosActivos}
        onCambiarAnios={setAniosActivos}
        rangoAvance={rangoAvance}
        onCambiarRangoAvance={setRangoAvance}
        rangoPresupuesto={rangoPresupuesto}
        limitesPresupuesto={limitesPresupuesto}
        onCambiarRangoPresupuesto={setRangoPresupuesto}
        monedaPresupuesto={monedaPresupuesto}
        monedasDisponibles={monedasDe(obras)}
        onCambiarMonedaPresupuesto={cambiarMonedaPresupuesto}
        presupuestoActivo={presupuestoActivo}
        abiertoEnMovil={filtrosAbiertosEnMovil}
        onCerrarEnMovil={() => setFiltrosAbiertosEnMovil(false)}
        onSeleccionarObra={(obra) => {
          setObraSeleccionada(obra);
          setEnfoque((previo) => ({ obra, token: (previo?.token ?? 0) + 1 }));
          setFiltrosAbiertosEnMovil(false);
        }}
      />

      <div className="relative flex-1">
        {vista === 'mapa' ? (
          <ObrasMapLoader obras={obrasFiltradas} onSeleccionarObra={setObraSeleccionada} enfoque={enfoque} capa={capa} />
        ) : (
          <ObrasLista obras={obrasFiltradas} onSeleccionar={setObraSeleccionada} />
        )}

        {vista === 'mapa' && estado !== 'cargando' && <SelectorCapas capa={capa} onCambiar={cambiarCapa} />}

        {/* En escritorio los filtros ya están siempre visibles en el sidebar
            — este botón flotante es el único camino a buscador/filtros/vista
            de lista en pantallas angostas, donde el sidebar es un drawer
            oculto por defecto (ver MapSidebar). */}
        <button
          type="button"
          onClick={() => setFiltrosAbiertosEnMovil(true)}
          className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg sm:hidden"
        >
          <SlidersHorizontal className="size-4" />
          Buscar y filtrar
        </button>

        {estado === 'cargando' && (
          <div className="absolute inset-x-0 top-4 mx-auto w-fit rounded-full bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow">
            Cargando obras…
          </div>
        )}

        {modoDemo && estado !== 'cargando' && (
          <div className="absolute inset-x-0 top-4 mx-auto w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 shadow dark:bg-amber-900/40 dark:text-amber-100">
            {estado === 'error'
              ? 'No se pudo conectar con la base de datos — mostrando datos de demostración.'
              : 'Aún no hay obras publicadas — mostrando datos de demostración.'}
          </div>
        )}

        {obraSeleccionada && (
          <ObraDetallePanel obra={obraSeleccionada} onCerrar={() => setObraSeleccionada(null)} />
        )}
      </div>
    </div>
  );
}
