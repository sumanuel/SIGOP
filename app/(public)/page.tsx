'use client';

import { useEffect, useState } from 'react';
import ObrasMapLoader from '@/components/map/obras-map-loader';
import { MapSidebar } from '@/components/map/map-sidebar';
import { ObraDetallePanel } from '@/components/map/obra-detalle-panel';
import { OBRAS_DEMO } from '@/lib/data/obras-demo';
import { normalizarTexto } from '@/lib/texto';
import type { ObraMapa } from '@/lib/types/obra';

type EstadoCarga = 'cargando' | 'ok' | 'error';

function calcularLimitesPresupuesto(obras: ObraMapa[]): [number, number] {
  if (obras.length === 0) return [0, 0];
  const montos = obras.map((o) => o.presupuestoAprobado);
  return [Math.min(...montos), Math.max(...montos)];
}

export default function MapaPage() {
  const [obras, setObras] = useState<ObraMapa[]>([]);
  const [estado, setEstado] = useState<EstadoCarga>('cargando');
  const [modoDemo, setModoDemo] = useState(false);
  const [obraSeleccionada, setObraSeleccionada] = useState<ObraMapa | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [tiposActivos, setTiposActivos] = useState<Set<string>>(new Set());
  const [estadosActivos, setEstadosActivos] = useState<Set<string>>(new Set());
  const [municipiosActivos, setMunicipiosActivos] = useState<Set<string>>(new Set());
  const [estatusActivos, setEstatusActivos] = useState<Set<string>>(new Set());
  const [rangoAvance, setRangoAvance] = useState<[number, number]>([0, 100]);
  const [rangoPresupuesto, setRangoPresupuesto] = useState<[number, number]>([0, 0]);
  const [limitesPresupuesto, setLimitesPresupuesto] = useState<[number, number]>([0, 0]);

  // Guarda las obras y, en el mismo paso, activa todos sus valores en cada
  // filtro (evita un segundo efecto encadenado solo para derivar esto).
  function aplicarObras(nuevas: ObraMapa[]) {
    setObras(nuevas);
    setTiposActivos(new Set(nuevas.map((o) => o.tipoObra.nombre)));
    setEstadosActivos(new Set(nuevas.map((o) => o.estado)));
    setMunicipiosActivos(new Set(nuevas.map((o) => o.municipio)));
    setEstatusActivos(new Set(nuevas.map((o) => o.estatus.nombre)));

    const limites = calcularLimitesPresupuesto(nuevas);
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

  function alternarEnSet(set: Set<string>, valor: string): Set<string> {
    const next = new Set(set);
    if (next.has(valor)) {
      next.delete(valor);
    } else {
      next.add(valor);
    }
    return next;
  }

  const busquedaNormalizada = normalizarTexto(busqueda);

  const obrasFiltradas = obras.filter((o) => {
    if (!tiposActivos.has(o.tipoObra.nombre)) return false;
    if (!estadosActivos.has(o.estado)) return false;
    if (!municipiosActivos.has(o.municipio)) return false;
    if (!estatusActivos.has(o.estatus.nombre)) return false;
    if (o.avanceFisico < rangoAvance[0] || o.avanceFisico > rangoAvance[1]) return false;
    if (o.presupuestoAprobado < rangoPresupuesto[0] || o.presupuestoAprobado > rangoPresupuesto[1]) {
      return false;
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
        tiposActivos={tiposActivos}
        onToggleTipo={(tipo) => setTiposActivos((prev) => alternarEnSet(prev, tipo))}
        estadosActivos={estadosActivos}
        onToggleEstado={(estadoNombre) => setEstadosActivos((prev) => alternarEnSet(prev, estadoNombre))}
        municipiosActivos={municipiosActivos}
        onToggleMunicipio={(municipio) => setMunicipiosActivos((prev) => alternarEnSet(prev, municipio))}
        estatusActivos={estatusActivos}
        onToggleEstatus={(estatusNombre) => setEstatusActivos((prev) => alternarEnSet(prev, estatusNombre))}
        rangoAvance={rangoAvance}
        onCambiarRangoAvance={setRangoAvance}
        rangoPresupuesto={rangoPresupuesto}
        limitesPresupuesto={limitesPresupuesto}
        onCambiarRangoPresupuesto={setRangoPresupuesto}
      />

      <div className="relative flex-1">
        <ObrasMapLoader obras={obrasFiltradas} onSeleccionarObra={setObraSeleccionada} />

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
