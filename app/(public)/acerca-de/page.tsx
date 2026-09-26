export const metadata = {
  title: 'Acerca de — SIGOP',
  description: 'Qué es SIGOP, sus objetivos y cómo funciona la plataforma.',
};

export default function AcercaDePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Acerca de SIGOP</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sistema de Información Geográfica de Obras Públicas
      </p>

      <div className="mt-8 flex flex-col gap-8 text-sm leading-relaxed sm:text-base">
        <section>
          <h2 className="text-lg font-semibold">¿Qué es SIGOP?</h2>
          <p className="mt-2 text-muted-foreground">
            SIGOP es una plataforma pública que muestra en un mapa las obras públicas en ejecución
            o culminadas — hospitales, escuelas, vías, acueductos y más — junto con su presupuesto,
            avance físico y financiero, fechas, fotografías y el equipo humano responsable de
            ejecutarlas. Cada punto en el mapa lleva a una ficha con el detalle completo de esa
            obra.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Objetivos</h2>
          <ul className="mt-2 flex flex-col gap-1.5 text-muted-foreground">
            <li>• Mostrar de forma transparente la gestión de obras públicas.</li>
            <li>• Facilitar el seguimiento del avance físico y financiero de cada proyecto.</li>
            <li>• Dar visibilidad al talento humano que ejecuta cada obra.</li>
            <li>• Servir como piloto escalable a nivel nacional, regional o municipal.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Cómo funciona</h2>
          <p className="mt-2 text-muted-foreground">
            La información que ves en el portal público pasa primero por el personal autorizado
            del ente responsable, que la carga en un panel administrativo. Ningún dato llega al
            mapa público sin antes seguir un flujo de aprobación (borrador → en revisión →
            publicado), y cada creación, edición o cambio de estado queda registrado de forma
            permanente en una bitácora de auditoría interna.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Principios</h2>
          <p className="mt-2 text-muted-foreground">
            SIGOP está construido enteramente con tecnología de código abierto, sin depender de
            servicios propietarios externos — un principio de soberanía tecnológica tan importante
            como la transparencia de los datos que muestra. La meta a mediano plazo es que toda la
            información pública del portal pueda descargarse como datos abiertos (CSV / GeoJSON)
            para periodistas, investigadores y contraloría social.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-muted-foreground">
            Este es un proyecto piloto. Los datos que ves hoy pueden incluir información de
            demostración mientras se completa la carga con el ente responsable.
          </p>
        </section>
      </div>
    </div>
  );
}
