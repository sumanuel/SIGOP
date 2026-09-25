'use client';

import { useState, type FormEvent } from 'react';

interface ReportarObraFormProps {
  obraId: string;
  onCerrar: () => void;
}

type Estado = 'editando' | 'enviando' | 'enviado' | 'error';

// Formulario público, sin login (ver decisión en el chat: exigir cuenta
// para participar mata la participación y no aporta nada — el control
// real contra abuso es la moderación, no la autenticación).
export function ReportarObraForm({ obraId, onCerrar }: ReportarObraFormProps) {
  const [estado, setEstado] = useState<Estado>('editando');
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEstado('enviando');
    setMensajeError(null);

    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/obras/${obraId}/reportes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.get('nombre') || undefined,
          correo: form.get('correo') || undefined,
          mensaje: form.get('mensaje'),
          // Honeypot: campo oculto con CSS, invisible para una persona pero
          // que un bot que auto-rellena formularios sí completa.
          sitioWeb: form.get('sitioWeb') || '',
        }),
      });

      if (res.status === 429) {
        setMensajeError('Demasiados envíos desde esta conexión. Intenta de nuevo más tarde.');
        setEstado('error');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setMensajeError(data?.error ?? 'No se pudo enviar el reporte.');
        setEstado('error');
        return;
      }

      setEstado('enviado');
    } catch {
      setMensajeError('No se pudo enviar el reporte. Verifica tu conexión.');
      setEstado('error');
    }
  }

  if (estado === 'enviado') {
    return (
      <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
        <p>Gracias, tu reporte fue recibido y será revisado antes de publicarse.</p>
        <button type="button" onClick={onCerrar} className="mt-2 text-xs text-primary underline">
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-2 rounded-md border border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">
        Reportar una observación sobre esta obra
      </p>

      <textarea
        name="mensaje"
        required
        minLength={10}
        maxLength={2000}
        rows={3}
        placeholder="Ej.: esta foto está desactualizada, la obra parece detenida..."
        className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/50"
      />

      <div className="grid grid-cols-2 gap-2">
        <input
          name="nombre"
          type="text"
          maxLength={120}
          placeholder="Tu nombre (opcional)"
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/50"
        />
        <input
          name="correo"
          type="email"
          maxLength={200}
          placeholder="Correo (opcional)"
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>

      {/* Honeypot: oculto visualmente y del lector de pantalla; un bot que
          autocompleta todos los campos sí lo llena. */}
      <input
        type="text"
        name="sitioWeb"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-0 w-0 opacity-0"
      />

      {mensajeError && <p className="text-xs text-destructive">{mensajeError}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={estado === 'enviando'}
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {estado === 'enviando' ? 'Enviando…' : 'Enviar reporte'}
        </button>
      </div>
    </form>
  );
}
