'use client';

import { Tags, ListChecks, Landmark, HardHat, Coins, UserCog } from 'lucide-react';
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

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CatalogoEditor
          recurso="tipos-obra"
          titulo="Tipos de obra"
          descripcion="Categoría de la obra (Salud, Educación, Vialidad…): define el ícono y color de sus marcadores en el mapa."
          icono={Tags}
          colorClase="border-primary/25 bg-primary/10 text-primary"
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
          icono={ListChecks}
          colorClase="border-amber-300/60 bg-amber-500/10 text-amber-700 dark:text-amber-400"
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
          icono={Landmark}
          colorClase="border-violet-300/60 bg-violet-500/10 text-violet-700 dark:text-violet-400"
          campos={[
            { key: 'nombre', label: 'Nombre', tipo: 'text' },
            { key: 'siglas', label: 'Siglas', tipo: 'text' },
          ]}
        />

        <div className="xl:col-span-2">
          <CatalogoEditor
            recurso="contratistas"
            titulo="Contratistas"
            descripcion="Empresas que ejecutan obras por contrato."
            icono={HardHat}
            colorClase="border-orange-300/60 bg-orange-500/10 text-orange-700 dark:text-orange-400"
            campos={[
              { key: 'razonSocial', label: 'Razón social', tipo: 'text' },
              { key: 'rif', label: 'RIF', tipo: 'text' },
              { key: 'contacto', label: 'Contacto', tipo: 'text' },
              { key: 'telefono', label: 'Teléfono', tipo: 'text' },
              { key: 'email', label: 'Correo', tipo: 'text' },
            ]}
          />
        </div>

        <CatalogoEditor
          recurso="fuentes-financiamiento"
          titulo="Fuentes de financiamiento"
          descripcion="Origen del presupuesto (Nacional, Regional, Municipal, Fondo Mixto…)."
          icono={Coins}
          colorClase="border-emerald-300/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          campos={[{ key: 'nombre', label: 'Nombre', tipo: 'text' }]}
        />

        <CatalogoEditor
          recurso="cargos"
          titulo="Cargos"
          descripcion="Roles del personal en el organigrama de una obra — el nivel jerárquico ordena el organigrama (1 = más alto)."
          icono={UserCog}
          colorClase="border-sky-300/60 bg-sky-500/10 text-sky-700 dark:text-sky-400"
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
