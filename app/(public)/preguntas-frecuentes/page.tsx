import Link from 'next/link';

export const metadata = {
  title: 'Preguntas frecuentes — SIGOP',
  description: 'Respuestas a las dudas más comunes sobre los datos y el funcionamiento de SIGOP.',
};

const PREGUNTAS = [
  {
    pregunta: '¿Qué es SIGOP y quién lo mantiene?',
    respuesta:
      'SIGOP es una plataforma de transparencia sobre obras públicas. La información de cada obra es cargada y mantenida por el personal autorizado del ente responsable de ejecutarla, no por terceros.',
  },
  {
    pregunta: '¿De dónde vienen los datos de las obras?',
    respuesta:
      'De los propios entes ejecutores (ministerios, gobernaciones, alcaldías). Cada obra pasa por un flujo de aprobación interno — borrador, revisión y publicación — antes de aparecer en el mapa público.',
  },
  {
    pregunta: '¿Qué significa cada estatus de una obra?',
    respuesta:
      'Planificada: aún no inicia. En ejecución: en construcción. Paralizada: detenida temporalmente. Culminada: terminada. Inaugurada: entregada y en uso.',
  },
  {
    pregunta: '¿Cómo se calcula el "avance físico" de una obra?',
    respuesta:
      'Es el porcentaje de la obra física realmente construida, reportado por el supervisor de la obra en cada actualización — no es lo mismo que el avance financiero (cuánto del presupuesto se ha ejecutado), que se muestra por separado en la ficha de cada obra.',
  },
  {
    pregunta: '¿Puedo reportar una obra con información desactualizada o incorrecta?',
    respuesta:
      'Sí. En la ficha de cada obra hay una opción para enviar una observación. Todos los reportes pasan por moderación antes de hacerse visibles.',
  },
  {
    pregunta: '¿Los datos del personal que aparece en el organigrama de una obra son públicos?',
    respuesta:
      'Solo se muestra el nombre y la foto de una persona si ella dio su consentimiento explícito para publicarlos. Nunca se publican cédula, dirección, teléfono ni salario — si alguien no autorizó su publicación, solo se muestra su cargo, sin identificarla.',
  },
  {
    pregunta: '¿Puedo descargar los datos de las obras?',
    respuesta:
      'La descarga de datos abiertos (CSV / GeoJSON) está planificada pero todavía no está disponible en esta versión del portal.',
  },
];

export default function PreguntasFrecuentesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Preguntas frecuentes</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Si tu duda no está aquí, puedes{' '}
        <Link href="/contacto" className="text-primary hover:underline">
          escribirnos
        </Link>
        .
      </p>

      <div className="mt-6 flex flex-col divide-y divide-border rounded-lg border border-border">
        {PREGUNTAS.map((item) => (
          <details key={item.pregunta} className="group p-4 open:bg-muted/30">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium sm:text-base">
              {item.pregunta}
              <span className="shrink-0 text-muted-foreground transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.respuesta}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
