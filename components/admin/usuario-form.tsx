'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ROL_LEGIBLE, ROLES_USUARIO } from '@/lib/rol-legible';

interface UsuarioFormValues {
  nombre: string;
  email: string;
  password: string;
  rol: (typeof ROLES_USUARIO)[number];
  enteId: string;
  activo: boolean;
}

const VALORES_VACIOS: UsuarioFormValues = {
  nombre: '',
  email: '',
  password: '',
  rol: 'CONSULTA',
  enteId: '',
  activo: true,
};

interface UsuarioFormProps {
  usuarioId?: string;
  valoresIniciales?: Partial<UsuarioFormValues>;
  entes: { id: string; nombre: string }[];
}

export function UsuarioForm({ usuarioId, valoresIniciales, entes }: UsuarioFormProps) {
  const router = useRouter();
  const esEdicion = Boolean(usuarioId);
  const [valores, setValores] = useState<UsuarioFormValues>({ ...VALORES_VACIOS, ...valoresIniciales });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [esUnoMismo, setEsUnoMismo] = useState(false);

  useEffect(() => {
    if (!esEdicion) return;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { usuario: { id: string } } | null) => {
        if (data?.usuario.id === usuarioId) setEsUnoMismo(true);
      })
      .catch(() => {});
  }, [esEdicion, usuarioId]);

  function actualizar<K extends keyof UsuarioFormValues>(campo: K, valor: UsuarioFormValues[K]) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);

    const payload = {
      nombre: valores.nombre,
      email: valores.email,
      rol: valores.rol,
      // `null` explícito solo tiene sentido en edición (limpiar el ente ya
      // asignado); crearUsuarioSchema.enteId es opcional pero no nullable.
      enteId: valores.enteId || (esEdicion ? null : undefined),
      ...(esEdicion ? { activo: valores.activo } : {}),
      ...(valores.password ? { password: valores.password } : {}),
    };

    try {
      const res = await fetch(esEdicion ? `/api/admin/usuarios/${usuarioId}` : '/api/admin/usuarios', {
        method: esEdicion ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? 'No se pudo guardar el usuario.');
        return;
      }

      router.push('/admin/usuarios');
      router.refresh();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Nombre completo">
          <input
            required
            value={valores.nombre}
            onChange={(e) => actualizar('nombre', e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label="Correo">
          <input
            type="email"
            required
            value={valores.email}
            onChange={(e) => actualizar('email', e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label={esEdicion ? 'Rol' : 'Rol'}>
          <select
            required
            disabled={esUnoMismo}
            value={valores.rol}
            onChange={(e) => actualizar('rol', e.target.value as UsuarioFormValues['rol'])}
            className={`${inputClass} disabled:opacity-50`}
          >
            {ROLES_USUARIO.map((rol) => (
              <option key={rol} value={rol}>
                {ROL_LEGIBLE[rol]}
              </option>
            ))}
          </select>
          {esUnoMismo && <p className="text-xs text-muted-foreground">No puedes cambiar tu propio rol.</p>}
        </Campo>
        <Campo label="Ente (opcional)">
          <select
            value={valores.enteId}
            onChange={(e) => actualizar('enteId', e.target.value)}
            className={inputClass}
          >
            <option value="">Sin asignar</option>
            {entes.map((ente) => (
              <option key={ente.id} value={ente.id}>
                {ente.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label={esEdicion ? 'Nueva contraseña (opcional)' : 'Contraseña'}>
          <input
            type="password"
            required={!esEdicion}
            minLength={8}
            placeholder={esEdicion ? 'Dejar vacío para no cambiarla' : undefined}
            value={valores.password}
            onChange={(e) => actualizar('password', e.target.value)}
            className={inputClass}
          />
        </Campo>

        {esEdicion && (
          <Campo label="">
            <label className="mt-6 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={esUnoMismo}
                checked={valores.activo}
                onChange={(e) => actualizar('activo', e.target.checked)}
                className="size-4 rounded border-input disabled:opacity-50"
              />
              Usuario activo (puede iniciar sesión)
            </label>
            {esUnoMismo && <p className="text-xs text-muted-foreground">No puedes desactivar tu propia cuenta.</p>}
          </Campo>
        )}
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push('/admin/usuarios')}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={enviando}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {enviando ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear usuario'}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50';

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium">{label}</span>}
      {children}
    </label>
  );
}
