# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [0.1.2] - 2026-09-25

### Agregado
- Sección "Observaciones de la comunidad" en la ficha pública de obra: muestra
  los reportes ciudadanos ya **aprobados** por un moderador (mensaje, nombre
  o "Anónimo", foto adjunta si la hay, fecha). El correo del remitente nunca
  se expone públicamente.

## [0.1.1] - 2026-09-25

### Agregado
- Bandeja de moderación de reportes ciudadanos en `/admin/reportes`, con
  pestañas por estado (Pendientes, Aprobados, Rechazados, Todos) y acciones
  de aprobar/rechazar.
- Enlace "Reportes" en el nav compartido del panel administrativo.

## [0.1.0] - 2026-09-25

Versión inicial del piloto: SIGOP (Sistema de Información Geográfica de
Obras Públicas).

### Agregado

**Portal público**
- Mapa interactivo (MapLibre GL + OpenStreetMap) centrado en Venezuela, con
  marcadores coloreados por tipo de obra y agrupación por PostGIS.
- Panel lateral con resumen (obras registradas, culminadas/inauguradas,
  avance promedio) y filtro interactivo por tipo de obra.
- Panel de detalle al hacer clic en un punto del mapa, con acceso directo a
  reportar una observación.
- Ficha completa de obra (`/obras/[slug]`): datos generales, mini-mapa,
  galería con comparador antes/después, línea de tiempo de fechas e hitos,
  gráfico de avance físico/financiero con indicador de atraso, ejecución
  financiera, código QR generado localmente y botón de compartir.
- Pantalla de equipo de trabajo con organigrama por nivel jerárquico y perfil
  de cada persona — respetando la regla de privacidad: sin consentimiento
  explícito, solo se muestra el cargo, nunca la identidad.
- Canal de reporte ciudadano por obra, sin necesidad de cuenta, con honeypot
  y límite de envíos por IP como control anti-spam.
- Página 404 personalizada con la marca de SIGOP.
- Header y footer institucionales.

**Panel administrativo**
- Login con JWT (cookies httpOnly), bloqueo tras intentos fallidos, y
  bitácora de auditoría de cada acción sensible.
- CRUD completo de obras, con selector de ubicación en el mapa (clic para
  fijar el punto) y flujo de publicación (Borrador → En revisión →
  Publicado).
- Gestión de personal por obra: directorio único de personas y asignación
  con cargo, área, jerarquía (supervisor) y control de consentimiento de
  publicación.

**Base de datos e infraestructura**
- Modelo de datos completo en PostgreSQL + PostGIS (obras, avances, hitos,
  multimedia, personal, catálogos, auditoría, reportes ciudadanos).
- Migraciones versionadas, incluyendo los índices espaciales GiST.
- Seed de datos de demostración (catálogos, región piloto, 5 obras de
  ejemplo, organigrama, usuario administrador).
- Documentación: `PLAN_PROYECTO.md`, `MODULOS_AVANZADOS.md`,
  `prisma/POSTGIS_NOTAS.md`.
