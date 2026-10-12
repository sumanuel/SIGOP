'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ChevronLeft, CopyX, Download, FileSpreadsheet } from 'lucide-react';
import { AdminNav } from '@/components/admin/admin-nav';

type EstadoFila = 'valida' | 'duplicada' | 'error';

interface FilaResumen {
  fila: number;
  nombre: string;
  estado: EstadoFila;
  mensajes: string[];
}

interface Resumen {
  total: number;
  validas: number;
  duplicadas: number;
  conError: number;
  filas: FilaResumen[];
  creadas?: number;
}

const ETIQUETA: Record<EstadoFila, string> = { valida: 'Válida', duplicada: 'Duplicada', error: 'Error' };
const CLASE: Record<EstadoFila, string> = {
  valida: 'bg-success/10 text-success',
  duplicada: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
  error: 'bg-destructive/10 text-destructive',
};

export default function ImportarPersonasPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [terminado, setTerminado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(modo: 'revisar' | 'importar', file: File) {
    setOcupado(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('archivo', file);
      const res = await fetch(`/api/admin/personas/importar?modo=${modo}`, { method: 'POST', body: form });
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? 'No se pudo procesar el archivo.');
        if (modo === 'revisar') setResumen(null);
        return;
      }
      setResumen(data);
      if (modo === 'importar') setTerminado(true);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setOcupado(false);
    }
  }

  function alElegirArchivo(e: ChangeEvent<HTMLInputElement>) {
    const elegido = e.target.files?.[0] ?? null;
    setArchivo(elegido);
    setResumen(null);
    setTerminado(false);
    setError(null);
    if (elegido) void enviar('revisar', elegido);
  }

  function empezarDeNuevo() {
    setArchivo(null);
    setResumen(null);
    setTerminado(false);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const filasConProblemas = resumen?.filas.filter((f) => f.estado !== 'valida') ?? [];

  return (
    <main className="p-8">
      <AdminNav />
      <Link
        href="/admin/personas"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver a personas
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Importar personas desde Excel</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Carga muchas personas de una vez. Primero se revisa el archivo y no se guarda nada hasta que confirmes.
      </p>

      <section className="mt-6 max-w-3xl rounded-xl border border-border bg-card p-5 shadow-sm">
        <ol className="list-decimal space-y-3 pl-5 text-sm">
          <li>
            <a
              href="/api/admin/personas/importar/plantilla"
              download
              className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
            >
              <Download className="size-4" aria-hidden="true" />
              Descarga la plantilla
            </a>{' '}
            <span className="text-muted-foreground">
              y complétala (la hoja «Instrucciones» explica cada columna; el consentimiento queda en «No» si lo dejas
              vacío).
            </span>
          </li>
          <li>
            <span className="text-muted-foreground">Sube el archivo (.xlsx, máximo 2 MB y 1.000 filas):</span>
            <div className="mt-2">
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={alElegirArchivo}
                disabled={ocupado || terminado}
                aria-label="Archivo Excel de personas"
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-muted disabled:opacity-50"
              />
            </div>
          </li>
        </ol>
      </section>

      {ocupado && <p className="mt-4 text-sm text-muted-foreground">Procesando…</p>}
      {error && (
        <p className="mt-4 max-w-3xl rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {resumen && (
        <section className="mt-6 max-w-3xl rounded-xl border border-border bg-card p-5 shadow-sm">
          {terminado ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-6 shrink-0 text-success" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold">
                  Se importaron {resumen.creadas} {resumen.creadas === 1 ? 'persona' : 'personas'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {resumen.duplicadas + resumen.conError > 0
                    ? `Se omitieron ${resumen.duplicadas} duplicadas y ${resumen.conError} con errores.`
                    : 'No hubo filas omitidas.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <FileSpreadsheet className="size-5" aria-hidden="true" />
                Resultado de la revisión
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Dato etiqueta="Filas leídas" valor={resumen.total} />
                <Dato etiqueta="Se importarán" valor={resumen.validas} clase="text-success" />
                <Dato etiqueta="Duplicadas" valor={resumen.duplicadas} clase="text-amber-700 dark:text-amber-400" />
                <Dato etiqueta="Con error" valor={resumen.conError} clase="text-destructive" />
              </dl>
            </>
          )}

          {filasConProblemas.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Filas que no se importarán</caption>
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Fila</th>
                    <th className="py-2 pr-3">Persona</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {filasConProblemas.map((f) => (
                    <tr key={f.fila} className="border-t border-border align-top">
                      <td className="py-2 pr-3 tabular-nums">{f.fila}</td>
                      <td className="py-2 pr-3">{f.nombre}</td>
                      <td className="py-2 pr-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${CLASE[f.estado]}`}>
                          {f.estado === 'error' ? (
                            <AlertTriangle className="size-3" aria-hidden="true" />
                          ) : (
                            <CopyX className="size-3" aria-hidden="true" />
                          )}
                          {ETIQUETA[f.estado]}
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground">{f.mensajes.join(' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {terminado ? (
              <>
                <Link
                  href="/admin/personas"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Ver el directorio
                </Link>
                <button
                  type="button"
                  onClick={empezarDeNuevo}
                  className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
                >
                  Importar otro archivo
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={ocupado || resumen.validas === 0 || !archivo}
                  onClick={() => archivo && enviar('importar', archivo)}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {resumen.validas === 0
                    ? 'No hay filas para importar'
                    : `Importar ${resumen.validas} ${resumen.validas === 1 ? 'persona' : 'personas'}`}
                </button>
                <button
                  type="button"
                  onClick={empezarDeNuevo}
                  className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
                >
                  Elegir otro archivo
                </button>
              </>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function Dato({ etiqueta, valor, clase }: { etiqueta: string; valor: number; clase?: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className={`text-xl font-semibold tabular-nums ${clase ?? ''}`}>{valor}</dd>
    </div>
  );
}
