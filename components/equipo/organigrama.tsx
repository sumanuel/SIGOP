'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { PersonaPerfilModal } from '@/components/equipo/persona-perfil-modal';

export interface AsignacionPersonal {
  id: string;
  cargo: string;
  nivelJerarquico: number;
  area: string | null;
  supervisorId: string | null;
  fechaIngreso: Date | null;
  persona: {
    nombreCompleto: string;
    fotoUrl: string | null;
    profesion: string | null;
    especialidad: string | null;
    aniosExperiencia: number | null;
    bioCorta: string | null;
  } | null;
}

interface OrganigramaProps {
  personal: AsignacionPersonal[];
}

// Organigrama simple por niveles (PLAN_PROYECTO.md sección 3.1): cada fila
// es un nivel jerárquico, cada tarjeta una persona (o solo su cargo, si no
// dio consentimiento de publicación — ver obtenerObraDetalle en el servicio).
export function Organigrama({ personal }: OrganigramaProps) {
  const [seleccionada, setSeleccionada] = useState<AsignacionPersonal | null>(null);

  const niveles = useMemo(() => {
    const grupos = new Map<number, AsignacionPersonal[]>();
    for (const asignacion of personal) {
      const lista = grupos.get(asignacion.nivelJerarquico) ?? [];
      lista.push(asignacion);
      grupos.set(asignacion.nivelJerarquico, lista);
    }
    return Array.from(grupos.entries()).sort(([a], [b]) => a - b);
  }, [personal]);

  if (personal.length === 0) {
    return <p className="text-sm text-muted-foreground">Aún no se ha registrado personal para esta obra.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {niveles.map(([nivel, asignaciones]) => (
        <div key={nivel} className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Nivel {nivel}
          </p>
          <div className="flex flex-wrap gap-3">
            {asignaciones.map((asignacion) => (
              <TarjetaPersona
                key={asignacion.id}
                asignacion={asignacion}
                onClick={() => asignacion.persona && setSeleccionada(asignacion)}
              />
            ))}
          </div>
        </div>
      ))}

      {seleccionada?.persona && (
        <PersonaPerfilModal
          cargo={seleccionada.cargo}
          area={seleccionada.area}
          fechaIngreso={seleccionada.fechaIngreso}
          persona={seleccionada.persona}
          onCerrar={() => setSeleccionada(null)}
        />
      )}
    </div>
  );
}

function TarjetaPersona({ asignacion, onClick }: { asignacion: AsignacionPersonal; onClick: () => void }) {
  const { persona, cargo, area } = asignacion;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!persona}
      className={`flex w-40 flex-col items-center gap-2 rounded-lg border border-border p-3 text-center ${
        persona ? 'hover:border-primary hover:shadow-sm' : 'cursor-default opacity-70'
      }`}
    >
      <div className="relative h-14 w-14 overflow-hidden rounded-full bg-muted">
        {persona?.fotoUrl ? (
          <Image src={persona.fotoUrl} alt={persona.nombreCompleto} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
            {persona ? persona.nombreCompleto.charAt(0) : cargo.charAt(0)}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium leading-tight">
          {persona ? persona.nombreCompleto : cargo}
        </p>
        <p className="text-xs text-muted-foreground">{persona ? cargo : area ?? 'Sin identidad publicada'}</p>
      </div>
    </button>
  );
}
