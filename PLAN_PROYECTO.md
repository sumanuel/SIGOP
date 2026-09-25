# SIGOP — Plan del Proyecto

> **Plataforma de transparencia y seguimiento georreferenciado de obras públicas**
> *"Cada obra, a la vista de todos."*

---

## 1. Nombre del proyecto

### **SIGOP** — Sistema de Información Geográfica de Obras Públicas
- Nombre único de punta a punta: marca pública, nombre técnico, dominio y `package.json`.
- Corto, fácil de recordar y de pronunciar.
- El nombre completo (Sistema de Información Geográfica de Obras Públicas) transmite con precisión de qué se trata, y la sigla queda natural para hablar de él en el día a día.
- Funciona bien como dominio (`sigop.gob.ve`) y como marca institucional.

### Alternativas descartadas
| Nombre | Enfoque |
|---|---|
| ObraVisible | Transparencia en la obra pública — se manejó como opción inicial, descartada a favor de SIGOP |
| Mapa de Obras | Descriptivo y directo |
| ObraClara | Transparencia y claridad |
| Venezuela Construye | Tono institucional/positivo, ideal para presentación gubernamental |

---

## 2. Visión general

Una plataforma web con dos caras:

1. **Portal público**: cualquier ciudadano entra y ve un **mapa interactivo de Venezuela** con todas las obras públicas (hospitales, escuelas, carreteras, viviendas, acueductos, etc.). Al tocar un punto, ve la ficha completa del proyecto: presupuesto, fechas, avance, imágenes y el equipo humano que la ejecuta.
2. **Panel administrativo**: el personal autorizado del ente carga, actualiza y publica la información de cada obra, controla el avance, sube fotos y gestiona al personal.

### Objetivos
- Mostrar de forma **transparente** la gestión de obras públicas.
- Facilitar el **seguimiento** del avance físico y financiero.
- Dar **visibilidad** al talento humano que ejecuta cada obra.
- Servir como **piloto** escalable a nivel nacional, regional o municipal.

---

## 3. Funcionalidades

### 3.1 Portal público

#### Mapa principal (pantalla de inicio)
- Mapa interactivo a pantalla completa centrado en Venezuela.
- Marcadores con **ícono y color según tipo de obra** (🏥 salud, 🏫 educación, 🛣️ vialidad, 🏠 vivienda, 💧 agua, ⚡ electricidad, etc.).
- **Agrupación de marcadores (clustering)** al alejar el zoom, con conteo por zona.
- Obras lineales (carreteras, tuberías, tendidos eléctricos) dibujadas como **líneas** en el mapa, no solo como puntos.
- Panel lateral de **filtros**:
  - Estado / municipio / parroquia
  - Tipo de obra
  - Estatus (planificada, en ejecución, paralizada, culminada, inaugurada)
  - Rango de presupuesto
  - Rango de avance (%)
  - Año de aprobación
- **Buscador** por nombre de obra o código.
- Alternar vista **Mapa / Lista**.
- Barra superior con **indicadores globales**: total de obras, inversión total, obras culminadas, avance promedio.

#### Ficha del proyecto (al presionar un punto)
Se abre un panel deslizable (en escritorio) o pantalla completa (en móvil) con:

**Datos generales**
- Nombre del proyecto y código único
- Tipo / categoría
- Estatus (con distintivo de color)
- Ubicación (estado, municipio, parroquia, dirección) + mini mapa
- Descripción y alcance
- Ente responsable / organismo ejecutor
- Empresa contratista (si aplica)

**Datos financieros**
- Presupuesto aprobado
- Monto ejecutado a la fecha
- Barra de ejecución financiera (ejecutado vs. aprobado)
- Fuente de financiamiento
- Moneda (Bs. / USD) con fecha de referencia

**Fechas**
- Fecha de aprobación
- Fecha de inicio
- Fecha estimada de finalización
- Fecha real de finalización
- **Línea de tiempo** visual con los hitos

**Avance**
- Porcentaje de **avance físico** (gráfico circular grande)
- Historial de avance (gráfico de línea en el tiempo)
- Indicador de **atraso**: compara avance real vs. avance esperado según las fechas

**Galería de imágenes**
- Fotos organizadas por fecha/etapa
- Comparador **"Antes / Después"** (control deslizante)
- Visor a pantalla completa
- Video opcional (enlace o archivo)

**Impacto**
- Beneficiarios estimados (ej.: "12.000 habitantes")
- Capacidad (ej.: "120 camas", "800 estudiantes", "14 km")

**Acciones**
- Compartir (WhatsApp, X, Facebook, enlace directo)
- **Código QR** de la obra (para colocar en la valla física de la obra)
- Botón **"Ver equipo de trabajo"**

#### Pantalla de equipo de trabajo (sección aparte)
Al presionar "Ver equipo de trabajo" se abre una nueva vista con:
- **Organigrama** visual: director/jefe de obra → ingenieros/supervisores → técnicos → obreros → personal de apoyo (mantenimiento, limpieza, seguridad).
- Tarjetas por persona agrupadas por área o nivel.
- Filtro por cargo/área y buscador.
- Al presionar una tarjeta → **perfil de la persona**:
  - Foto
  - Nombre
  - Cargo / función en la obra
  - Área o cuadrilla
  - Profesión / especialidad
  - Años de experiencia (opcional)
  - Fecha de incorporación a la obra
  - Otras obras en las que ha participado (enlaces)

> ⚠️ **Protección de datos personales** (ver sección 8): nunca se publicarán cédula, dirección, teléfono, salario ni datos sensibles. Solo se muestra lo que la persona haya autorizado.

#### Otras secciones públicas
- **Estadísticas / Dashboard público**: inversión por estado, obras por tipo, obras culminadas por año, ranking de avance.
- **Datos abiertos**: descarga de información pública en CSV / Excel / GeoJSON.
- **Participación ciudadana** (opcional, fase 2): el ciudadano puede enviar un reporte u observación sobre una obra (con foto), que pasa por moderación antes de publicarse.
- **Suscripción a una obra**: recibir notificación por correo cuando se actualice su avance.
- Páginas institucionales: Acerca de, Preguntas frecuentes, Contacto.

---

### 3.2 Panel administrativo

#### Autenticación y seguridad
- Inicio de sesión con correo y contraseña.
- **Doble factor de autenticación (2FA)** para roles administrativos.
- Recuperación de contraseña.
- Bloqueo tras intentos fallidos.

#### Roles y permisos
| Rol | Permisos |
|---|---|
| **Super administrador** | Todo: usuarios, catálogos, configuración |
| **Administrador de ente** | Gestiona obras de su organismo |
| **Editor / Supervisor de obra** | Carga avances, fotos y personal de obras asignadas |
| **Revisor / Aprobador** | Revisa y **aprueba la publicación** de cambios |
| **Consulta** | Solo lectura interna |

> Opcional: permisos por **territorio** (un usuario solo ve obras de su estado).

#### Flujo de publicación
`Borrador → En revisión → Publicado`
Ningún cambio llega al portal público sin aprobación, lo que evita errores y da control institucional.

#### Módulos
1. **Dashboard interno**: métricas, obras con atraso, últimas actualizaciones, pendientes por aprobar.
2. **Gestión de obras**
   - Crear/editar obra con formulario por pasos (datos generales → ubicación → finanzas → fechas → impacto).
   - **Selector de ubicación en mapa**: hacer clic en el mapa o dibujar una línea/polígono para obras lineales o de área.
   - Cambio de estatus.
3. **Registro de avances**
   - Nuevo reporte de avance: % físico, % financiero, fecha, comentario, fotos.
   - Historial de avances (queda registrado, no se sobrescribe).
4. **Galería / Multimedia**
   - Carga múltiple de imágenes (arrastrar y soltar).
   - Compresión y generación automática de miniaturas.
   - Marcar foto de portada, etapa, "antes/después".
   - Lectura de coordenadas GPS y fecha de la foto (EXIF) como evidencia.
5. **Gestión de personal**
   - Registro de personas (directorio único; una persona puede estar en varias obras).
   - Asignación a obras con cargo, área, nivel jerárquico y fechas.
   - Carga de foto de perfil.
   - Control de **consentimiento** de publicación.
   - Importación masiva desde Excel.
6. **Catálogos**: tipos de obra, estatus, entes, contratistas, fuentes de financiamiento, cargos, estados/municipios/parroquias.
7. **Usuarios y roles**.
8. **Moderación de reportes ciudadanos** (fase 2).
9. **Bitácora de auditoría**: quién cambió qué, cuándo y desde dónde (clave para un ente público).
10. **Reportes exportables**: PDF con ficha de obra, Excel con listados.

---

## 4. Ideas adicionales (valor agregado para la presentación)

- 📍 **Código QR en la valla de la obra** → el ciudadano escanea y ve la ficha en su teléfono. Muy vistoso para una presentación.
- 📊 **Semáforo de atraso** automático (verde/amarillo/rojo) comparando avance real vs. programado.
- 🖼️ **Comparador Antes/Después** con control deslizante.
- 📱 **App/PWA para supervisores de campo**: cargar avances y fotos desde la obra, incluso **sin conexión** (se sincroniza al recuperar señal — importante en zonas con baja conectividad).
- 🗺️ **Capas del mapa**: satélite, calles, límites político-territoriales.
- 🔔 **Alertas internas**: obras sin actualización en X días, obras vencidas.
- 🧾 **Modo presentación / kiosco**: recorrido automático por las obras destacadas, ideal para pantallas en actos públicos.
- 🌐 **Datos abiertos** (CSV/GeoJSON/API pública) para periodistas, universidades y contraloría social.
- 🏅 **Obras destacadas / inauguradas recientemente** en la portada.
- ♿ **Accesibilidad** (contraste, lectura por pantalla, tamaños de texto).
- 🌙 **Modo oscuro**.

---

## 5. Arquitectura y stack tecnológico

> **Decisión clave de arquitectura:** en `tienda-web`, el frontend (Next.js, puerto 3000) y el backend (Express, puerto 4000) son **dos procesos separados**, coordinados por un script PowerShell que libera puertos, abre una terminal nueva y espera por polling a que el backend arranque. Es frágil (procesos huérfanos, condiciones de carrera) y por eso da problemas.
>
> En `Fincrick`, Nuxt resuelve esto de forma nativa con **Nitro server routes**: un solo proceso sirve páginas y API a la vez, con un único comando (`yarn dev`). Sin proxy, sin dos terminales, sin puertos que coordinar.
>
> Para SIGOP replicamos el enfoque de `Fincrick` pero con Next.js: usamos sus **Route Handlers** (`app/api/**/route.ts`), el equivalente directo a Nitro. Frontend y API viven en **el mismo proyecto, el mismo proceso y el mismo puerto**. Un solo `npm run dev` levanta todo — nada de scripts PowerShell para desarrollo.

### Propuesta

| Capa | Tecnología | Motivo |
|---|---|---|
| **Frontend + API (un solo proyecto)** | **Next.js** (React, TypeScript, App Router + Route Handlers) | Un único proceso sirve páginas y endpoints — igual de simple que `yarn dev` en Fincrick, sin los problemas de dos procesos de `tienda-web` |
| **Estilos / UI** | **Tailwind CSS + shadcn/ui** | Diseño moderno, profesional y consistente — ya usado en `tienda-web` |
| **Estado / formularios** | **Zustand + React Hook Form + Zod** | Ya son parte de tu stack habitual, sin curva de aprendizaje |
| **Mapa** | **MapLibre GL JS** + mapas de **OpenStreetMap** (o MapTiler) | Gratis, sin depender de API de Google, rápido y personalizable |
| **Gráficos** | Recharts | Ya usado en `tienda-web`; dashboards y gráficos de avance |
| **Capa de servicios (lógica de negocio)** | `lib/server/services/*.ts` (funciones TypeScript puras, llamadas desde los Route Handlers) | Mismo espíritu de separación que `controllers/` en `tienda-web`, pero sin un servidor Express aparte — cada Route Handler es "delgado" y delega al servicio |
| **ORM** | **Prisma** | Igual que en `tienda-web/backend`; migraciones versionadas y tipado end-to-end, ahora usado directo desde Next.js |
| **Base de datos** | **PostgreSQL + PostGIS** | Ya disponible en tu servidor; PostGIS agrega consultas geográficas (puntos, líneas, "obras cerca de mí", por estado). Prisma soporta geometría vía `Unsupported("geometry")` |
| **Almacenamiento de archivos** | Carpeta local en el servidor (ej. `/uploads`) + `formidable`/API nativa de `FormData` | Nada de servicios externos. Se puede migrar a S3/MinIO más adelante si se necesita replicar en varios servidores |
| **Procesamiento de imágenes** | Sharp | Compresión, miniaturas, formato WebP antes de guardar en disco |
| **Autenticación** | JWT + bcrypt (igual que `tienda-web`) vía cookies httpOnly, + `proxy.ts` de Next.js para proteger `/admin` y las rutas de API — 2FA TOTP para roles administrativos | Seguridad por roles, sin dependencias nuevas y sin problema de CORS entre puertos (mismo origen) |
| **Caché** | En memoria del propio proceso (opcional) | Para un piloto en un solo servidor no hace falta Redis |
| **Despliegue (sin Docker)** | **Un solo proceso Node** (`next build && next start`) gestionado con **PM2** (Linux) o el mismo patrón de scripts PowerShell que ya usas, pero simplificado a un único proceso — + **Nginx** (Linux) o **IIS** (Windows) como proxy inverso, HTTPS con Let's Encrypt (o certificado del ente) | Un solo puerto que exponer, un solo proceso que monitorear/reiniciar |

### Diagrama general

```
 Ciudadano (web/móvil)          Personal administrativo / campo
          │                                  │
          ▼                                  ▼
          └───────────────┬──────────────────┘
                           │  HTTPS (Nginx / IIS)
                           ▼
              ┌────────────────────────────┐
              │   Next.js (un solo proceso) │
              │   ─────────────────────────│
              │   app/           → páginas  │
              │   app/admin/     → panel    │
              │   app/api/*/route.ts → API  │
              │        (Auth · Roles ·      │
              │         Auditoría)          │
              │   PM2                       │
              └──────────┬──────────┬───────┘
                         │          │
                         ▼          ▼
          ┌──────────────────┐   ┌──────────────────┐
          │ PostgreSQL       │   │ Carpeta local    │
          │ + PostGIS        │   │ /uploads (fotos) │
          └──────────────────┘   └──────────────────┘
```

> Un solo `npm run dev` (o `npm run build && npm start` en producción) levanta frontend público, panel admin y API. Un solo puerto, un solo proceso, sin scripts que liberen puertos ni terminales adicionales — igual de directo que el `yarn dev` de Fincrick.

### ¿Cuándo sí separar la API en un backend independiente?
Solo si más adelante:
- Necesitas que **otro cliente** (app móvil nativa, integraciones externas) consuma la misma API sin pasar por Next.js.
- El equipo crece y conviene desplegar frontend y backend de forma independiente.

Para el piloto, ninguna de esas condiciones aplica — empezar unificado es más simple y se puede separar después sin rehacer la lógica, ya que los servicios en `lib/server/` quedan desacoplados del framework.

---

## 6. Modelo de datos (PostgreSQL + PostGIS)

### Tablas principales

**Territorio**
- `estados` (id, nombre, código, geometría)
- `municipios` (id, estado_id, nombre, geometría)
- `parroquias` (id, municipio_id, nombre, geometría)

**Catálogos**
- `tipos_obra` (id, nombre, ícono, color)
- `estatus_obra` (id, nombre, color, orden)
- `entes` (id, nombre, siglas, logo) — organismos responsables
- `contratistas` (id, razón social, RIF, contacto)
- `fuentes_financiamiento` (id, nombre)
- `cargos` (id, nombre, nivel_jerarquico, área)

**Obras**
- `obras`
  - id, código (único, ej. `OBR-2026-00123`), nombre, slug, descripción
  - tipo_obra_id, estatus_id, ente_id, contratista_id, fuente_financiamiento_id
  - estado_id, municipio_id, parroquia_id, dirección
  - **ubicación** `geometry(Point, 4326)`
  - **trazado** `geometry(Geometry, 4326)` (línea o polígono, opcional)
  - presupuesto_aprobado, monto_ejecutado, moneda
  - fecha_aprobación, fecha_inicio, fecha_fin_estimada, fecha_fin_real
  - avance_fisico (%), avance_financiero (%)
  - beneficiarios, capacidad_descripción
  - destacada (bool), estado_publicación (borrador / revisión / publicado)
  - creado_por, actualizado_por, timestamps
- `avances` (id, obra_id, fecha, avance_fisico, avance_financiero, comentario, registrado_por, aprobado_por)
- `hitos` (id, obra_id, nombre, fecha_planificada, fecha_real, completado)
- `multimedia` (id, obra_id, avance_id?, tipo [imagen/video/documento], url, miniatura_url, título, etapa, es_portada, es_antes/después, fecha_captura, coordenadas_exif, orden)

**Personal**
- `personas` (id, nombres, apellidos, foto_url, profesión, especialidad, años_experiencia, bio_corta, **consentimiento_publicación**, fecha_consentimiento, **documento_identidad (privado, nunca público)**)
- `obra_personal` (id, obra_id, persona_id, cargo_id, área/cuadrilla, supervisor_id (jerarquía para organigrama), fecha_ingreso, fecha_salida, visible_público)

**Sistema**
- `usuarios` (id, email, hash_contraseña, nombre, 2fa_secret, activo, ente_id, estado_id [restricción territorial])
- `roles`, `usuario_roles`
- `auditoria` (id, usuario_id, acción, entidad, entidad_id, datos_antes (JSONB), datos_después (JSONB), ip, fecha)
- `reportes_ciudadanos` (fase 2) (id, obra_id, nombre, correo, mensaje, foto_url, estado_moderación, fecha)
- `suscripciones` (id, obra_id, correo, confirmado)

### Índices clave
- Índice espacial **GiST** en `obras.ubicacion` y `obras.trazado`.
- Índices en `estatus_id`, `tipo_obra_id`, `estado_id`, `estado_publicacion`.
- Búsqueda de texto completo (`tsvector` en español) sobre nombre y descripción.

---

## 7. Diseño visual (UI/UX)

### Principios
- **Institucional pero moderno**: limpio, con mucho espacio en blanco, tipografía clara y datos protagonistas.
- **Mobile-first**: la mayoría de los ciudadanos accederá desde el teléfono.
- **Datos visuales**: gráficos circulares de avance, barras de ejecución, líneas de tiempo, semáforos.

### Identidad propuesta
- **Paleta**: azul profundo institucional (confianza) + amarillo/dorado de acento (referencia al tricolor sin saturar) + verde/amarillo/rojo solo para semáforos de estado. Neutros grises para fondos.
  > Si el ente tiene manual de identidad, se adapta a sus colores y logo.
- **Tipografía**: *Inter* o *Plus Jakarta Sans* (moderna, excelente legibilidad).
- **Íconos**: Lucide Icons (consistentes y ligeros).
- **Componentes**: tarjetas con esquinas redondeadas, sombras suaves, efecto *glass* en paneles sobre el mapa, microanimaciones.

### Pantallas clave a diseñar (en Figma antes de programar)
1. Portada / mapa con filtros e indicadores
2. Ficha de obra (escritorio y móvil)
3. Equipo de trabajo (organigrama + tarjetas)
4. Perfil de persona
5. Dashboard de estadísticas público
6. Login administrativo
7. Dashboard administrativo
8. Formulario de obra con selector de mapa
9. Registro de avance con carga de fotos
10. Gestión de personal

---

## 8. Seguridad, privacidad y marco legal

### Protección de datos del personal (muy importante)
Publicar perfiles de trabajadores —especialmente del personal obrero y de apoyo— requiere cuidado:
- **Consentimiento explícito** de cada persona antes de publicar su foto y datos (registrado con fecha en el sistema).
- Publicar solo datos **laborales**: nombre, cargo, profesión, foto. **Nunca**: cédula, dirección, teléfono, salario, datos familiares.
- Opción de mostrar a una persona **solo con cargo** (sin nombre ni foto) si no autoriza.
- Base legal a considerar: art. 28 y 60 de la Constitución (habeas data, honor y privacidad), Ley de Infogobierno, normativas del ente.

### Seguridad técnica
- HTTPS obligatorio.
- Contraseñas con hash (Argon2/bcrypt), 2FA para administradores.
- Control de acceso por rol en cada endpoint.
- Protección contra inyección SQL, XSS, CSRF; límites de peticiones (rate limiting).
- Validación de archivos subidos (tipo, tamaño) y eliminación de metadatos EXIF sensibles en imágenes públicas (conservándolos solo en el registro interno).
- Bitácora de auditoría inmutable.
- **Respaldos automáticos diarios** de la base de datos y de los archivos, con pruebas de restauración.
- Recomendado: alojar todo en servidores nacionales/del ente (soberanía de datos).

---

## 9. Plan de trabajo por fases

### Fase 0 — Preparación (1–2 semanas)
- Levantamiento de requerimientos con el ente (qué datos tienen, en qué formato).
- Definición de identidad visual y nombre.
- Diseño de pantallas en Figma (prototipo navegable para mostrar antes de programar).
- Configuración del servidor: instalación nativa de PostgreSQL + extensión PostGIS, Node.js, PM2, Nginx/IIS, y repositorio Git.

### Fase 1 — MVP / Piloto (6–8 semanas)
**Objetivo: tener algo funcional y vistoso para presentar.**
- Modelo de datos y migraciones.
- Carga de división político-territorial de Venezuela.
- API: obras, avances, multimedia, personal, catálogos, autenticación.
- Panel admin: login, CRUD de obras con selector de mapa, avances, fotos, personal.
- Portal público: mapa con marcadores y filtros básicos, ficha de obra, galería, equipo de trabajo y perfil.
- Diseño responsive completo.
- Carga de **10–30 obras reales o de demostración** en una región piloto.

### Fase 2 — Consolidación (4–6 semanas)
- Flujo de aprobación (borrador → revisión → publicado).
- Bitácora de auditoría y roles avanzados/territoriales.
- Dashboard público de estadísticas.
- Semáforo de atraso, línea de tiempo, comparador antes/después.
- Códigos QR por obra.
- Exportaciones (PDF, Excel, datos abiertos).
- Importación masiva desde Excel.

### Fase 3 — Expansión (continua)
- PWA para supervisores de campo con modo sin conexión.
- Reportes ciudadanos con moderación.
- Suscripciones y notificaciones.
- Modo presentación/kiosco.
- API pública documentada.
- Escalamiento a nivel nacional.

---

## 10. Estructura sugerida del repositorio

> **Un solo proyecto Next.js**, sin carpeta `backend/` separada — así se evita el problema de dos procesos de `tienda-web`. La API vive dentro de `app/api/`, siguiendo la misma convención "una carpeta por recurso, un archivo por acción" que ya usas en `Fincrick` (`server/routes/apiV2/<recurso>/<accion>.<metodo>.ts`).

```
sigop/
├── app/
│   ├── (public)/                # Portal público
│   │   ├── page.tsx              # Mapa principal
│   │   └── obras/[slug]/         # Ficha de obra + equipo de trabajo
│   ├── admin/                    # Panel administrativo (protegido por proxy.ts)
│   │   ├── obras/
│   │   ├── personal/
│   │   └── ...
│   └── api/                      # Route Handlers = la API (mismo proceso, mismo puerto)
│       ├── obras/
│       │   ├── route.ts          # GET (listar) / POST (crear)
│       │   └── [id]/
│       │       ├── route.ts      # GET / PUT / DELETE de una obra
│       │       └── avances/route.ts
│       ├── personal/route.ts
│       ├── auth/
│       │   ├── login/route.ts
│       │   └── refresh/route.ts
│       └── uploads/route.ts      # Subida de imágenes
├── lib/
│   ├── server/
│   │   ├── services/             # Lógica de negocio (equivalente a los "controllers" de tienda-web)
│   │   │   ├── obras.service.ts
│   │   │   ├── avances.service.ts
│   │   │   └── personal.service.ts
│   │   ├── auth.ts                # JWT, bcrypt, verificación de sesión
│   │   ├── prisma.ts              # Cliente Prisma compartido
│   │   └── validators/            # Esquemas Zod por recurso
│   ├── api-client.ts               # Cliente fetch usado por los componentes (llama a /api/*)
│   └── utils/                      # Mapas, moneda, fechas
├── components/                    # Componentes (shadcn/ui)
├── hooks/
├── store/                          # Zustand
├── types/                          # Tipos TypeScript compartidos
├── proxy.ts                   # Protege /admin y valida sesión antes de servir la página
├── prisma/
│   ├── schema.prisma                # Modelo de datos (obras, avances, personal, PostGIS)
│   ├── migrations/
│   └── seed.ts                      # Estados, municipios, parroquias, catálogos, obras demo
├── public/
├── uploads/                          # Imágenes de las obras (servidas por Nginx/IIS o por Next.js)
├── docs/                             # Planes, QA, resúmenes de sesión (igual que tienda-web)
└── README.md
```

### Cómo se arranca
- **Desarrollo:** `npm run dev` (o `yarn dev`) — un único comando, un único proceso, igual que en Fincrick. No hace falta liberar puertos ni scripts adicionales.
- **Producción:** `npm run build && npm start`, gestionado por **PM2** como un solo proceso (o, si el servidor es Windows sin PM2, un `start.ps1` mínimo de una sola línea que ya no necesita coordinar dos procesos ni hacer polling de salud).

---

## 11. Estrategia para la presentación al ente

1. **Prototipo en Figma** navegable (antes incluso de programar) para validar la idea.
2. **Demo en vivo** con datos reales de una región piloto (un municipio o estado).
3. Mostrar el **flujo completo**: el supervisor carga un avance con foto desde el teléfono → el aprobador lo publica → aparece en el mapa público al instante.
4. Mostrar el **código QR** escaneado desde un teléfono.
5. Destacar: **transparencia, contraloría social, soberanía tecnológica** (software libre, servidores propios, sin dependencia de servicios extranjeros) y **bajo costo** de operación.
6. Entregar un documento breve con: objetivos, beneficios, cronograma y requerimientos de infraestructura.

---

## 12. Requerimientos de infraestructura (piloto, sin Docker)

| Recurso | Mínimo recomendado |
|---|---|
| CPU | 4 núcleos |
| RAM | 8 GB |
| Disco | 100 GB SSD (crece según fotos) |
| SO | Windows Server o Ubuntu Server 22.04/24.04 LTS (según lo que tenga el equipo/servidor disponible) |
| Software (Linux) | Node.js LTS, PM2, PostgreSQL 16 + PostGIS 3, Nginx |
| Software (Windows) | Node.js LTS, PostgreSQL 16 + PostGIS 3, IIS (o Nginx para Windows) como proxy inverso, scripts PowerShell de arranque/parada |
| Dominio | ej. `sigop.gob.ve` + certificado SSL (Let's Encrypt o el del ente) |

> Si más adelante el proyecto necesita escalar a varios servidores o entornos, Docker se puede introducir en ese momento sin rediseñar la aplicación — pero no es un requisito para el piloto.

---

## 14. Módulos y mejoras adicionales (ampliación del alcance)

Estas son funcionalidades que elevan el proyecto de "mapa de obras" a **plataforma integral de gestión y contraloría social**. No todas deben ir en el piloto; se marcan por prioridad.

> 📄 Profundización técnica (modelo de datos, flujos, código de ejemplo) de los 10 módulos más relevantes en [MODULOS_AVANZADOS.md](MODULOS_AVANZADOS.md).

### 🟢 Alto impacto para el piloto (fáciles de justificar ante el ente)

**Contratación y licitación**
- Módulo de **licitaciones/contratos**: empresa contratista, número de contrato, modalidad de contratación, monto contractual, fecha de firma, adendas/modificaciones (con historial de cada una).
- **Historial de desempeño del contratista**: en cuántas obras ha participado, cuántas entregó a tiempo, promedio de atraso. Esto genera un "puntaje de confiabilidad" muy útil para el ente y muy atractivo para presentar.
- Repositorio de **documentos públicos** de la obra (contrato, permisos ambientales, informes técnicos) descargables en PDF.

**Obras paralizadas (módulo especial)**
- Muy relevante en Venezuela: sección dedicada a obras **paralizadas o reactivadas**, con motivo de paralización, tiempo paralizada, fecha de reactivación. Da una narrativa fuerte de transparencia y "rescate de obras".

**Alertas y control de gestión**
- **Alertas automáticas**: obra sin actualización en X días, obra con avance financiero muy superior al físico (posible señal de alerta para contraloría), obra vencida sin culminar.
- **Indicador de riesgo/atraso** calculado automáticamente (no solo semáforo visual, sino un score).
- Notificaciones internas por correo o Telegram/WhatsApp a los responsables.

**Canal de denuncia ciudadana**
- Además del "reporte de observación" ya contemplado, un **canal de denuncia** más formal (posible irregularidad, incumplimiento), con opción de anonimato y protección del denunciante, enrutado a la Contraloría o al ente correspondiente. Refuerza fuertemente el enfoque de transparencia.

**Comparador y ranking**
- **Comparar obras similares** (ej. todas las escuelas construidas) por costo por m², costo por beneficiario, tiempo de ejecución.
- **Ranking por estado/municipio**: quién tiene más inversión, más obras culminadas, mejor cumplimiento de plazos — genera sana competencia entre gobernaciones/alcaldías.

### 🟡 Valor medio (fase 2–3)

**Comunicación y accesibilidad**
- **Bot de WhatsApp/Telegram**: el ciudadano escribe el nombre de un municipio o el código de una obra y recibe el estatus por chat, sin necesidad de entrar a la web (clave por la conectividad limitada en Venezuela).
- **Accesibilidad ampliada**: lectura por voz de la ficha de obra, alto contraste, tamaños de fuente ajustables — importante para un proyecto gubernamental (cumplimiento de estándares de accesibilidad).
- Soporte multi-idioma incluyendo **lenguas indígenas** si el piloto lo amerita (valor simbólico alto).
- Integración para **auto-publicar en redes sociales** (X/Instagram) cuando una obra alcanza un hito (ej. "🏗️ Escuela X alcanzó 50% de avance").

**Presupuesto y finanzas**
- Vincular el presupuesto de cada obra con el **presupuesto nacional/regional** (código presupuestario), para trazabilidad entre lo aprobado en ley y lo ejecutado en campo.
- **Historial de modificaciones presupuestarias** de una obra (aumentos, recortes) con justificación — muy valioso para contraloría.
- Gráfico de **desembolsos** en el tiempo (cuándo y cuánto se ha pagado).

**Impacto y sostenibilidad**
- Etiquetado de obras según los **Objetivos de Desarrollo Sostenible (ODS)** de la ONU — le da al proyecto un marco internacional reconocible, útil si se busca cooperación o financiamiento externo.
- **Estudio de impacto ambiental** adjunto y estado de permisos.
- Encuesta rápida de **satisfacción ciudadana** una vez la obra es inaugurada ("¿Esta obra mejoró tu comunidad?").

**Datos y predicción**
- **Predicción de atraso con IA/estadística simple**: basado en el histórico, estimar la probabilidad de que una obra no cumpla su fecha, y resaltarla proactivamente.
- **Detección de anomalías**: obras con costo por unidad muy fuera del promedio (posible sobrecosto) — bandera automática para revisión, sin acusar, solo señalar para análisis humano.

### 🔵 Innovación / diferenciador fuerte (para destacar en la presentación)

- **Anclaje del historial en blockchain (o hash firmado) por hito**: cada vez que se publica un avance, se genera un hash inmutable con fecha, lo que hace imposible alterar el historial retroactivamente sin dejar rastro. Es un argumento muy fuerte de "transparencia a prueba de manipulación" para un piloto gubernamental.
- **Línea de tiempo histórica de "legado"**: un archivo permanente de obras culminadas por período de gestión, para que el proyecto sobreviva a cambios de administración y se convierta en memoria institucional del país.
- **App móvil nativa ligera** (además de la PWA) para descarga en tiendas, con notificaciones push de obras cercanas a la ubicación del usuario ("obras cerca de mí").
- **Modo "sala de prensa"**: paquete de datos, imágenes en alta resolución y cifras clave listos para que medios de comunicación los usen, con atribución automática a la fuente oficial.
- **API pública documentada (estilo gob abierto)** para que universidades, ONGs y desarrolladores construyan sus propias visualizaciones — refuerza el compromiso real de datos abiertos.

### Recomendación de priorización para la demo al ente

Si el objetivo es maximizar impacto en la presentación sin inflar el piloto, yo agregaría a la Fase 2 (no al MVP) estas cuatro, por ser las de mayor "efecto wow" con costo de desarrollo razonable:
1. Módulo de **obras paralizadas/reactivadas**.
2. **Ranking por estado/municipio** con datos comparativos.
3. **Bot de WhatsApp** de consulta de estatus.
4. **Hash/anclaje de integridad** en cada actualización de avance (transparencia "a prueba de manipulación").

---

## 13. Próximos pasos inmediatos

1. ✅ Validar nombre y alcance del piloto.
2. ✅ Definir stack técnico (Next.js + Express + Prisma + PostgreSQL/PostGIS, sin Docker).
3. ⬜ Confirmar versión de PostgreSQL del servidor y si se puede instalar la extensión **PostGIS**.
4. ⬜ Definir la región piloto y conseguir datos de 10–30 obras.
5. ⬜ Diseñar las pantallas clave en Figma.
6. ⬜ Iniciar el repositorio y la Fase 1.
