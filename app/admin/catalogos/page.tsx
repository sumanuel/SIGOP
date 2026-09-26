import { AdminNav } from '@/components/admin/admin-nav';
import { CatalogoEditor } from '@/components/admin/catalogo-editor';

export default function AdminCatalogosPage() {
  return (
    <main className="p-8">
      <AdminNav />

      <h1 className="text-2xl font-semibold">Catálogos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Valores compartidos por todas las obras. Reservado al super administrador — ver
        PLAN_PROYECTO.md sección 3.2.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <CatalogoEditor
          recurso="tipos-obra"
          titulo="Tipos de obra"
          descripcion="Categoría de la obra (Salud, Educación, Vialidad…): define el ícono y color de sus marcadores en el mapa."
          campos={[
            { key: 'nombre', label: 'Nombre', tipo: 'text' },
            { key: 'icono', label: 'Ícono (nombre en lucide-react, ej. hospital)', tipo: 'text' },
            { key: 'color', label: 'Color', tipo: 'color' },
          ]}
        />

        <CatalogoEditor
          recurso="estatus-obra"
          titulo="Estatus de obra"
          descripcion="Planificada, En ejecución, Paralizada, Culminada, Inaugurada… el orden define cómo se listan en los filtros."
          campos={[
            { key: 'nombre', label: 'Nombre', tipo: 'text' },
            { key: 'color', label: 'Color', tipo: 'color' },
            { key: 'orden', label: 'Orden', tipo: 'number' },
          ]}
        />

        <CatalogoEditor
          recurso="entes"
          titulo="Entes / organismos"
          descripcion="Organismo responsable de ejecutar cada obra."
          campos={[
            { key: 'nombre', label: 'Nombre', tipo: 'text' },
            { key: 'siglas', label: 'Siglas', tipo: 'text' },
          ]}
        />

        <CatalogoEditor
          recurso="contratistas"
          titulo="Contratistas"
          descripcion="Empresas que ejecutan obras por contrato."
          campos={[
            { key: 'razonSocial', label: 'Razón social', tipo: 'text' },
            { key: 'rif', label: 'RIF', tipo: 'text' },
            { key: 'contacto', label: 'Contacto', tipo: 'text' },
            { key: 'telefono', label: 'Teléfono', tipo: 'text' },
            { key: 'email', label: 'Correo', tipo: 'text' },
          ]}
        />

        <CatalogoEditor
          recurso="fuentes-financiamiento"
          titulo="Fuentes de financiamiento"
          descripcion="Origen del presupuesto (Nacional, Regional, Municipal, Fondo Mixto…)."
          campos={[{ key: 'nombre', label: 'Nombre', tipo: 'text' }]}
        />

        <CatalogoEditor
          recurso="cargos"
          titulo="Cargos"
          descripcion="Roles del personal en el organigrama de una obra — el nivel jerárquico ordena el organigrama (1 = más alto)."
          campos={[
            { key: 'nombre', label: 'Nombre', tipo: 'text' },
            { key: 'nivelJerarquico', label: 'Nivel jerárquico', tipo: 'number' },
            { key: 'area', label: 'Área', tipo: 'text' },
          ]}
        />
      </div>
    </main>
  );
}
