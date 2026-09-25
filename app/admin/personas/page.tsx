'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, ShieldCheck, ShieldOff } from 'lucide-react';
import { AdminNav } from '@/components/admin/admin-nav';

interface PersonaFila {
  id: string;
  nombres: string;
  apellidos: string;
  profesion: string | null;
  consentimientoPublicacion: boolean;
  _count: { asignaciones: number };
}

export default function AdminPersonasPage() {
  const router = useRouter();
  const [personas, setPersonas] = useState<PersonaFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        const res = await fetch('/api/admin/personas');
        if (res.status === 401) {
          router.replace('/admin/login');
          return;
        }
        if (!res.ok) throw new Error();
        const data: { personas: PersonaFila[] } = await res.json();
        if (!cancelado) setPersonas(data.personas);
      } catch {
        if (!cancelado) setError('No se pudo cargar el directorio de personas.');
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [router]);

  async function eliminar(persona: PersonaFila) {
    if (
      !window.confirm(
        `¿Eliminar a "${persona.nombres} ${persona.apellidos}" del directorio? También se quitará de todas las obras donde esté asignada.`
      )
    )
      return;

    const res = await fetch(`/api/admin/personas/${persona.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      window.alert(data?.error ?? 'No se pudo eliminar la persona.');
      return;
    }
    setPersonas((prev) => prev.filter((p) => p.id !== persona.id));
  }

  return (
    <main className="p-8">
      <AdminNav />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Personas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Directorio único — una persona puede estar asignada a varias obras.
          </p>
        </div>
        <Link
          href="/admin/personas/nueva"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Nueva persona
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {cargando ? (
        <p className="mt-8 text-sm text-muted-foreground">Cargando…</p>
      ) : personas.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Todavía no hay personas registradas.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Profesión</th>
                <th className="px-4 py-2">Obras asignadas</th>
                <th className="px-4 py-2">Consentimiento</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {personas.map((persona) => (
                <tr key={persona.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">
                    {persona.nombres} {persona.apellidos}
                  </td>
                  <td className="px-4 py-3">{persona.profesion ?? '—'}</td>
                  <td className="px-4 py-3">{persona._count.asignaciones}</td>
                  <td className="px-4 py-3">
                    {persona.consentimientoPublicacion ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="size-4" /> Sí
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <ShieldOff className="size-4" /> No
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/admin/personas/${persona.id}/editar`}
                        className="text-primary hover:underline"
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => eliminar(persona)}
                        className="text-destructive hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
