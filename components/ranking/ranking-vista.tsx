'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { formatearMoneda } from '@/lib/format';
import type { DatosRanking, FilaComparador, FilaTerritorio } from '@/lib/server/services/ranking.service';

type Vista = 'estado' | 'municipio' | 'comparar';
type Direccion = 'asc' | 'desc';

const PESTANAS: { clave: Vista; etiqueta: string }[] = [
  { clave: 'estado', etiqueta: 'Por estado' },
  { clave: 'municipio', etiqueta: 'Por municipio' },
  { clave: 'comparar', etiqueta: 'Comparar obras similares' },
];

// Los nulos (sin dato) siempre van al final, sea cual sea la dirección.
function comparar(a: number | string | null, b: number | string | null, dir: Direccion): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const r = typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b, 'es') : Number(a) - Number(b);
  return dir === 'asc' ? r : -r;
}

export function RankingVista({ datos }: { datos: DatosRanking }) {
  const [vista, setVista] = useState<Vista>('estado');

  return (
    <div className="mt-6">
      <div role="tablist" aria-label="Tipo de comparación" className="flex flex-wrap gap-2">
        {PESTANAS.map((p) => (
          <button
            key={p.clave}
            type="button"
            role="tab"
            aria-selected={vista === p.clave}
            onClick={() => setVista(p.clave)}
            className={`min-h-11 rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              vista === p.clave ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      <div className="mt-4" role="tabpanel">
        {vista === 'comparar' ? (
          <Comparador datos={datos} />
        ) : (
          <TablaTerritorio
            filas={vista === 'estado' ? datos.porEstado : datos.porMunicipio}
            monedas={datos.monedas}
            conEstado={vista === 'municipio'}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- territorio

type ClaveTerritorio = 'nombre' | 'totalObras' | 'pctCulminadas' | 'avancePromedio' | 'pctATiempo' | 'atrasoPromedioDias' | string;

function valorTerritorio(f: FilaTerritorio, clave: ClaveTerritorio): number | string | null {
  if (clave.startsWith('inv:')) return f.inversionPorMoneda[clave.slice(4)] ?? 0;
  return f[clave as 'nombre' | 'totalObras' | 'pctCulminadas' | 'avancePromedio' | 'pctATiempo' | 'atrasoPromedioDias'];
}

function TablaTerritorio({ filas, monedas, conEstado }: { filas: FilaTerritorio[]; monedas: string[]; conEstado: boolean }) {
  const [clave, setClave] = useState<ClaveTerritorio>('avancePromedio');
  const [dir, setDir] = useState<Direccion>('desc');

  const ordenadas = useMemo(
    () => [...filas].sort((a, b) => comparar(valorTerritorio(a, clave), valorTerritorio(b, clave), dir)),
    [filas, clave, dir]
  );

  function ordenarPor(nueva: ClaveTerritorio) {
    if (nueva === clave) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setClave(nueva);
      setDir(nueva === 'nombre' || nueva === 'atrasoPromedioDias' ? 'asc' : 'desc');
    }
  }

  if (filas.length === 0) return <p className="text-sm text-muted-foreground">Aún no hay obras publicadas.</p>;

  const columnas: { clave: ClaveTerritorio; etiqueta: string; ayuda?: string }[] = [
    { clave: 'totalObras', etiqueta: 'Obras' },
    { clave: 'pctCulminadas', etiqueta: '% culminadas', ayuda: 'Obras culminadas o inauguradas sobre el total' },
    { clave: 'avancePromedio', etiqueta: 'Avance promedio' },
    { clave: 'pctATiempo', etiqueta: '% a tiempo', ayuda: 'Obras con fecha estimada que no van atrasadas' },
    { clave: 'atrasoPromedioDias', etiqueta: 'Atraso prom. (días)', ayuda: 'Promedio de días de atraso; a tiempo cuenta 0' },
    ...monedas.map((m) => ({ clave: `inv:${m}`, etiqueta: `Inversión (${m})`, ayuda: 'Presupuesto aprobado, sin mezclar monedas' })),
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <caption className="sr-only">Ranking de obras por territorio, ordenable por columna</caption>
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="w-10 px-3 py-2">#</th>
            <EncabezadoOrdenable etiqueta={conEstado ? 'Municipio' : 'Estado'} activa={clave === 'nombre'} dir={dir} onClick={() => ordenarPor('nombre')} />
            {columnas.map((c) => (
              <EncabezadoOrdenable key={c.clave} etiqueta={c.etiqueta} ayuda={c.ayuda} activa={clave === c.clave} dir={dir} onClick={() => ordenarPor(c.clave)} derecha />
            ))}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((f, i) => (
            <tr key={f.clave} className="border-t border-border">
              <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2.5 font-medium">
                {f.nombre}
                {f.estado && <span className="block text-xs font-normal text-muted-foreground">{f.estado}</span>}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{f.totalObras}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{f.pctCulminadas}%</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{f.avancePromedio}%</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{f.pctATiempo === null ? '—' : `${f.pctATiempo}%`}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{f.atrasoPromedioDias === null ? '—' : f.atrasoPromedioDias}</td>
              {monedas.map((m) => (
                <td key={m} className="px-3 py-2.5 text-right tabular-nums">
                  {f.inversionPorMoneda[m] ? formatearMoneda(f.inversionPorMoneda[m], m) : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EncabezadoOrdenable({
  etiqueta,
  ayuda,
  activa,
  dir,
  onClick,
  derecha,
}: {
  etiqueta: string;
  ayuda?: string;
  activa: boolean;
  dir: Direccion;
  onClick: () => void;
  derecha?: boolean;
}) {
  const Icono = !activa ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={activa ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-3 py-2 ${derecha ? 'text-right' : ''}`}
      title={ayuda}
    >
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {etiqueta}
        <Icono className={`size-3 ${activa ? 'text-foreground' : 'opacity-50'}`} aria-hidden="true" />
      </button>
    </th>
  );
}

// ---------------------------------------------------------------- comparador

type ClaveObra = 'nombre' | 'presupuesto' | 'beneficiarios' | 'costoPorBeneficiario' | 'avanceFisico' | 'atrasoDias';

function Comparador({ datos }: { datos: DatosRanking }) {
  const [tipoId, setTipoId] = useState(datos.tipos[0]?.id ?? '');
  const [moneda, setMoneda] = useState(datos.monedas.includes('VES') ? 'VES' : (datos.monedas[0] ?? 'VES'));
  const [clave, setClave] = useState<ClaveObra>('costoPorBeneficiario');
  const [dir, setDir] = useState<Direccion>('asc');

  const filas = useMemo(
    () =>
      datos.obras
        .filter((o) => o.tipoObraId === tipoId && o.moneda === moneda)
        .sort((a, b) => comparar(a[clave as keyof FilaComparador] as number | string | null, b[clave as keyof FilaComparador] as number | string | null, dir)),
    [datos.obras, tipoId, moneda, clave, dir]
  );

  const costos = filas.map((f) => f.costoPorBeneficiario).filter((c): c is number => c !== null);
  const menor = costos.length > 1 ? Math.min(...costos) : null;
  const mayor = costos.length > 1 ? Math.max(...costos) : null;

  function ordenarPor(nueva: ClaveObra) {
    if (nueva === clave) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setClave(nueva);
      setDir(nueva === 'nombre' || nueva === 'costoPorBeneficiario' || nueva === 'atrasoDias' ? 'asc' : 'desc');
    }
  }

  if (datos.obras.length === 0) return <p className="text-sm text-muted-foreground">Aún no hay obras publicadas.</p>;

  const otraMoneda = datos.obras.filter((o) => o.tipoObraId === tipoId && o.moneda !== moneda).length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Compara obras del mismo tipo. Los costos solo se comparan dentro de una misma moneda, y el costo por beneficiario
        solo se calcula en las obras que declaran beneficiarios.
      </p>

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Tipo de obra</span>
          <select value={tipoId} onChange={(e) => setTipoId(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2">
            {datos.tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Moneda</span>
          <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2">
            {datos.monedas.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          No hay obras de este tipo en {moneda}.{otraMoneda > 0 && ` Hay ${otraMoneda} en otra moneda: cámbiala arriba.`}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <caption className="sr-only">Obras del mismo tipo comparadas por costo, avance y atraso</caption>
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="w-10 px-3 py-2">#</th>
                <EncabezadoOrdenable etiqueta="Obra" activa={clave === 'nombre'} dir={dir} onClick={() => ordenarPor('nombre')} />
                <EncabezadoOrdenable etiqueta={`Presupuesto (${moneda})`} activa={clave === 'presupuesto'} dir={dir} onClick={() => ordenarPor('presupuesto')} derecha />
                <EncabezadoOrdenable etiqueta="Beneficiarios" activa={clave === 'beneficiarios'} dir={dir} onClick={() => ordenarPor('beneficiarios')} derecha />
                <EncabezadoOrdenable etiqueta="Costo por beneficiario" activa={clave === 'costoPorBeneficiario'} dir={dir} onClick={() => ordenarPor('costoPorBeneficiario')} derecha />
                <EncabezadoOrdenable etiqueta="Avance" activa={clave === 'avanceFisico'} dir={dir} onClick={() => ordenarPor('avanceFisico')} derecha />
                <EncabezadoOrdenable etiqueta="Atraso (días)" ayuda="Negativo = adelantada" activa={clave === 'atrasoDias'} dir={dir} onClick={() => ordenarPor('atrasoDias')} derecha />
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={f.slug} className="border-t border-border">
                  <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <Link href={`/obras/${f.slug}`} className="font-medium hover:text-primary hover:underline">
                      {f.nombre}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {f.municipio}, {f.estado} · {f.estatus}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatearMoneda(f.presupuesto, f.moneda)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{f.beneficiarios?.toLocaleString('es-VE') ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {f.costoPorBeneficiario === null ? (
                      '—'
                    ) : (
                      <span>
                        {formatearMoneda(f.costoPorBeneficiario, f.moneda)}
                        {menor !== null && f.costoPorBeneficiario === menor && <Etiqueta clase="bg-success/10 text-success">menor</Etiqueta>}
                        {mayor !== null && f.costoPorBeneficiario === mayor && <Etiqueta clase="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">mayor</Etiqueta>}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{f.avanceFisico}%</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{f.atrasoDias === null ? '—' : f.atrasoDias}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Etiqueta({ clase, children }: { clase: string; children: React.ReactNode }) {
  return <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${clase}`}>{children}</span>;
}
