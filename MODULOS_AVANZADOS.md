# SIGOP — Módulos avanzados (profundización técnica)

> Complementa la sección 14 de [PLAN_PROYECTO.md](PLAN_PROYECTO.md). Aquí se detalla **cómo se construiría** cada módulo: modelo de datos (extensiones a `prisma/schema.prisma`), flujo de trabajo, pantallas involucradas y por qué es relevante en el contexto venezolano. Están ordenados por el mismo criterio de prioridad del plan (🟢 alto impacto → 🔵 diferenciador).

---

## 🟢 1. Licitaciones, contratos y desempeño de contratistas

### Objetivo
Hoy `Obra` solo tiene un `contratistaId` suelto. Este módulo agrega la trazabilidad completa: **cómo se contrató, cuánto costó el contrato original, qué modificaciones tuvo, y qué tan bien cumplió el contratista** — histórico entre obras, no solo dentro de una.

### Modelo de datos (nuevo)

```prisma
enum ModalidadContratacion {
  LICITACION_GENERAL
  LICITACION_SELECTIVA
  CONTRATACION_DIRECTA
  CONSULTA_PRECIOS
}

model Contrato {
  id                    String                @id @default(uuid())
  obraId                String                @unique // 1 obra ↔ 1 contrato principal
  contratistaId         String
  numeroContrato        String                @unique
  modalidad             ModalidadContratacion
  montoOriginal         Decimal               @db.Decimal(18, 2)
  montoActual           Decimal               @db.Decimal(18, 2) // se actualiza con cada adenda
  fechaFirma            DateTime
  plazoEjecucionDias    Int
  documentoUrl          String?               // PDF del contrato escaneado
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt

  obra                  Obra                  @relation(fields: [obraId], references: [id], onDelete: Cascade)
  contratista           Contratista           @relation(fields: [contratistaId], references: [id], onDelete: Restrict)
  adendas               ContratoAdenda[]

  @@index([contratistaId])
  @@map("contratos")
}

model ContratoAdenda {
  id             String   @id @default(uuid())
  contratoId     String
  numero         Int      // Adenda N°1, N°2...
  motivo         String
  montoAnterior  Decimal  @db.Decimal(18, 2)
  montoNuevo     Decimal  @db.Decimal(18, 2)
  diasAdicionales Int     @default(0)
  documentoUrl   String?
  aprobadoPor    String?
  fecha          DateTime @default(now())

  contrato       Contrato @relation(fields: [contratoId], references: [id], onDelete: Cascade)

  @@index([contratoId])
  @@map("contrato_adendas")
}
```

### Puntaje de desempeño del contratista (calculado, no almacenado)
Se calcula al vuelo (o en un job nocturno que lo cachea en `Contratista.puntajeDesempeno`) combinando, por cada contratista, todas sus obras culminadas:

```
puntaje = 0.5 × (obras entregadas a tiempo / total obras culminadas)
        + 0.3 × (1 − sobrecosto_promedio / montoOriginal_promedio)
        + 0.2 × (obras sin paralización / total obras)
```

Se muestra como una badge simple: 🟢 Confiable (≥80) · 🟡 Regular (50–79) · 🔴 Bajo cumplimiento (<50), visible tanto en el panel admin (para decidir a quién contratar) como en la ficha pública del contratista (transparencia hacia la ciudadanía).

### Flujo
1. Admin crea la obra → crea el contrato asociado (modalidad, monto, plazo).
2. Cada modificación de alcance/monto/plazo se registra como `ContratoAdenda` — nunca se sobrescribe el contrato original.
3. El `montoActual` del contrato retroalimenta `Obra.presupuestoAprobado` (o se muestran ambos: "presupuesto original vs. actual" en la ficha pública).
4. Al culminar la obra, se recalcula el puntaje del contratista.

### Por qué importa
Responde la pregunta que más le importa a un ente de contraloría: *"¿le seguimos dando obras a un contratista que siempre entrega tarde y siempre pide más plata?"* — con datos, no con percepción.

---

## 🟢 2. Obras paralizadas y reactivadas

### Objetivo
En Venezuela las obras paralizadas son casi una categoría en sí misma (muchas veces por años). Modelarlo como un simple cambio de `EstatusObra` pierde el historial de *por qué* y *cuánto tiempo*. Se necesita una tabla de periodos.

### Modelo de datos (nuevo)

```prisma
enum MotivoParalizacion {
  FALTA_PRESUPUESTO
  INCUMPLIMIENTO_CONTRATISTA
  PROBLEMA_LEGAL_PERMISOS
  PROBLEMA_TECNICO
  CONDICIONES_CLIMATICAS
  ORDEN_SUPERIOR
  OTRO
}

model PeriodoParalizacion {
  id               String              @id @default(uuid())
  obraId           String
  motivo           MotivoParalizacion
  descripcion      String?
  fechaInicio      DateTime
  fechaReactivacion DateTime?          // null mientras sigue paralizada
  responsableRegistro String?
  createdAt        DateTime            @default(now())

  obra             Obra                @relation(fields: [obraId], references: [id], onDelete: Cascade)

  @@index([obraId])
  @@index([motivo])
  @@map("periodos_paralizacion")
}
```

### Campos derivados útiles
- `diasParalizadaTotal` (suma de todos los periodos, calculado en el servicio, no en la BD).
- Filtro público **"Obras paralizadas"** con: tiempo total detenida, motivo, y si tiene fecha de reactivación comprometida.

### Flujo
1. Al cambiar `Obra.estatus` a "Paralizada", el formulario **obliga** a crear un `PeriodoParalizacion` con motivo (no se permite paralizar sin explicar por qué — esto es clave para que el dato sea útil y no solo un estatus vacío).
2. Al reactivar, se cierra el periodo con `fechaReactivacion` y el estatus vuelve a "En ejecución".
3. Una obra puede tener **varios periodos** de paralización en su vida (esto ya lo soporta el modelo, a diferencia de guardar un solo campo en `Obra`).

### Pantalla pública
Sección dedicada "Obras Paralizadas" en el portal, tipo galería, con badge de tiempo paralizada ("Detenida hace 2 años y 3 meses") — es contenido con alto valor noticioso y de contraloría social.

### Por qué importa
Le da al proyecto una narrativa política fuerte y neutral: no acusa, solo **documenta con fechas exactas**, y permite mostrar el "antes/después" cuando el ente reactiva una obra (bueno para ellos también, si es su gestión la que la rescata).

---

## 🟢 3. Alertas y control de gestión automatizado

### Objetivo
Pasar de un dashboard pasivo a un sistema que **avisa proactivamente** cuando algo requiere atención, sin que un humano tenga que estar revisando obra por obra.

### Modelo de datos (nuevo)

```prisma
enum TipoAlerta {
  SIN_ACTUALIZACION       // obra sin nuevo Avance en X días
  DESFASE_FINANCIERO      // avanceFinanciero muy superior a avanceFisico
  VENCIMIENTO_PROXIMO     // fechaFinEstimada se acerca y avanceFisico < 90%
  OBRA_VENCIDA            // pasó fechaFinEstimada y no está culminada
  COSTO_ATIPICO           // costo por m²/beneficiario fuera de rango normal
}

model Alerta {
  id          String     @id @default(uuid())
  obraId      String
  tipo        TipoAlerta
  severidad   Int        @default(1) // 1 = info, 2 = advertencia, 3 = crítica
  mensaje     String
  resuelta    Boolean    @default(false)
  resueltaPor String?
  resueltaEn  DateTime?
  createdAt   DateTime   @default(now())

  obra        Obra       @relation(fields: [obraId], references: [id], onDelete: Cascade)

  @@index([obraId])
  @@index([tipo, resuelta])
  @@map("alertas")
}
```

### Motor de reglas (job programado)
Un cron (`node-cron`, igual que ya usas en `Fincrick` con `server/plugins/cron.server.ts`) corre una vez al día y evalúa reglas simples sobre todas las obras activas:

```ts
// lib/server/jobs/evaluarAlertas.ts (ejecutado por node-cron, mismo patrón que Fincrick)
const DIAS_SIN_ACTUALIZACION = 30;
const UMBRAL_DESFASE_FINANCIERO = 20; // puntos porcentuales

for (const obra of obrasActivas) {
  if (diasDesdeUltimoAvance(obra) > DIAS_SIN_ACTUALIZACION) {
    crearAlerta(obra, 'SIN_ACTUALIZACION', severidad: 2);
  }
  if (obra.avanceFinanciero - obra.avanceFisico > UMBRAL_DESFASE_FINANCIERO) {
    crearAlerta(obra, 'DESFASE_FINANCIERO', severidad: 3);
  }
  if (hoy > obra.fechaFinEstimada && obra.avanceFisico < 100) {
    crearAlerta(obra, 'OBRA_VENCIDA', severidad: 3);
  }
}
```

### Notificación
- Panel admin: badge de alertas pendientes por obra + bandeja general "Alertas activas".
- Opcional (fase 3): envío por correo o Telegram al responsable asignado de la obra.

### Por qué importa
Convierte el sistema de "vitrina bonita" a **herramienta real de gestión** — el ente lo puede usar internamente para su propio control, no solo para mostrarle al público.

---

## 🟢 4. Canal de denuncia ciudadana (distinto del "reporte")

### Objetivo
`ReporteCiudadano` (ya en el schema base) es para observaciones livianas ("esta foto está desactualizada"). La **denuncia** es un canal más serio (posible irregularidad, corrupción, incumplimiento grave) y necesita protección al denunciante.

### Modelo de datos (nuevo)

```prisma
enum EstadoDenuncia {
  RECIBIDA
  EN_REVISION
  DERIVADA_CONTRALORIA
  CERRADA
}

model Denuncia {
  id              String         @id @default(uuid())
  obraId          String?        // puede no estar ligada a una obra específica
  codigoSeguimiento String       @unique // ej. DEN-2026-00042, se le da al denunciante
  esAnonima       Boolean        @default(true)
  contactoCifrado String?        // solo si el denunciante decide dejar contacto, cifrado en reposo
  categoria       String         // "Sobrecosto", "Incumplimiento", "Personal fantasma", ...
  descripcion     String
  evidenciaUrl    String?
  estado          EstadoDenuncia @default(RECIBIDA)
  derivadaA       String?        // ente/organismo al que se envió
  createdAt       DateTime       @default(now())
  actualizadoEn   DateTime       @updatedAt

  obra            Obra?          @relation(fields: [obraId], references: [id], onDelete: SetNull)

  @@index([estado])
  @@index([obraId])
  @@map("denuncias")
}
```

### Flujo clave: seguimiento sin comprometer el anonimato
1. El ciudadano llena el formulario (puede omitir todo dato identificable).
2. El sistema genera un `codigoSeguimiento` único que se le muestra **una sola vez** ("guarda este código: DEN-2026-00042").
3. Con ese código, puede volver más tarde a `/denuncias/seguimiento/DEN-2026-00042` y ver el estado (`Recibida → En revisión → Derivada → Cerrada`) sin necesidad de login ni de revelar quién es.
4. Internamente, solo un rol con permiso especial (`APROBADOR` o un rol nuevo `CONTRALOR`) puede ver el detalle y cambiar el estado.

### Por qué importa
Es el módulo que más credibilidad le da al proyecto frente a organismos de control — convierte la plataforma de "vitrina de transparencia" a **canal funcional de contraloría social**, con protección real al denunciante (clave para que la gente se anime a usarlo).

---

## 🟢 5. Ranking y comparador de obras

### Objetivo
Convertir los datos crudos en **comparaciones que cuentan una historia**: qué estado invierte más, qué tipo de obra cuesta más por unidad, quién cumple mejor los plazos.

### Enfoque técnico
No requiere tablas nuevas — son **consultas agregadas** sobre `Obra`, ideal resolverlas con una vista SQL materializada (refrescada por el mismo cron de alertas) para que el dashboard cargue rápido sin recalcular en cada visita:

```sql
CREATE MATERIALIZED VIEW resumen_por_estado AS
SELECT
  e.id AS estado_id,
  e.nombre AS estado_nombre,
  COUNT(o.id) AS total_obras,
  COUNT(o.id) FILTER (WHERE eo.nombre = 'Culminada') AS obras_culminadas,
  SUM(o."presupuestoAprobado") AS inversion_total,
  AVG(o."avanceFisico") AS avance_promedio,
  AVG(EXTRACT(DAY FROM (o."fechaFinReal" - o."fechaFinEstimada"))) AS atraso_promedio_dias
FROM obras o
JOIN estados e ON e.id = o."estadoId"
JOIN estatus_obra eo ON eo.id = o."estatusId"
GROUP BY e.id, e.nombre;

-- Refrescar en el cron diario:
REFRESH MATERIALIZED VIEW CONCURRENTLY resumen_por_estado;
```

Cálculo de **costo por unidad** (para el comparador "todas las escuelas"), como consulta normal:

```ts
const costoPorM2 = obra.presupuestoAprobado / obra.metrosCuadrados; // requiere agregar metrosCuadrados a Obra
const costoPorBeneficiario = obra.presupuestoAprobado / obra.beneficiarios;
```

> Nota: para que el comparador funcione bien conviene agregar a `Obra` un campo `unidadMedida` (m², km, camas, aulas) y `cantidadUnidad`, así el costo por unidad es comparable entre obras del mismo tipo.

### Pantalla pública
- Tabla/ranking ordenable por estado o municipio: inversión total, % culminadas, atraso promedio.
- Vista "Comparar obras similares": selecciona un tipo de obra (ej. "Escuelas") y muestra todas ordenadas por costo por m².

### Por qué importa
Genera **competencia sana entre gobernaciones/alcaldías** (nadie quiere aparecer último en el ranking) y le da a periodistas/investigadores una herramienta de análisis real, no solo un mapa bonito.

---

## 🔵 6. Hash de integridad (transparencia a prueba de manipulación)

### Objetivo
Argumento fuerte para la presentación: **una vez publicado un avance, no se puede alterar retroactivamente sin dejar evidencia**. No hace falta blockchain real (complejidad innecesaria para un piloto) — una cadena de hashes tipo "libro contable" (el mismo principio que usa blockchain, sin la infraestructura) es suficiente y muchísimo más simple de operar.

### Modelo de datos (nuevo)

```prisma
model RegistroIntegridad {
  id            String   @id @default(uuid())
  entidad       String   // "Avance", "Obra", "Multimedia"
  entidadId     String
  datosHash     String   // SHA-256 del contenido relevante en el momento de publicar
  hashAnterior  String   // encadena con el registro previo (como un blockchain simplificado)
  createdAt     DateTime @default(now())

  @@index([entidad, entidadId])
  @@map("registro_integridad")
}
```

### Cómo se genera el encadenamiento

```ts
import { createHash } from 'crypto';

async function registrarIntegridad(entidad: string, entidadId: string, datos: unknown) {
  const ultimo = await prisma.registroIntegridad.findFirst({ orderBy: { createdAt: 'desc' } });
  const hashAnterior = ultimo?.datosHash ?? '0'.repeat(64); // "génesis"

  const contenido = JSON.stringify(datos) + hashAnterior;
  const datosHash = createHash('sha256').update(contenido).digest('hex');

  return prisma.registroIntegridad.create({
    data: { entidad, entidadId, datosHash, hashAnterior },
  });
}

// Se llama automáticamente cada vez que se publica un Avance:
await registrarIntegridad('Avance', avance.id, {
  obraId: avance.obraId,
  avanceFisico: avance.avanceFisico,
  avanceFinanciero: avance.avanceFinanciero,
  fecha: avance.fecha,
});
```

### Verificación pública
Un botón "Verificar integridad" en la ficha de obra recorre la cadena de hashes de esa obra y confirma que ninguno fue alterado (si alguien edita un registro viejo directamente en la base de datos, el hash ya no coincide con el `hashAnterior` del siguiente registro, y la cadena "se rompe" de forma detectable).

### Por qué importa
Es el tipo de detalle técnico que, bien explicado en la demo ("miren, si alguien intenta alterar un avance de hace 6 meses, el sistema lo detecta"), diferencia al proyecto de cualquier sistema de gestión de obras convencional — habla directamente al miedo de manipulación de datos que tiene cualquier ente de contraloría.

---

## 🔵 7. Alineación a un estándar internacional: OC4IDS / CoST

### Qué es
El **Open Contracting for Infrastructure Data Standard (OC4IDS)**, del Open Contracting Partnership, y la iniciativa **CoST (Construction Sector Transparency Initiative)** son *exactamente* el marco internacional que ya existe para lo que se quiere construir: transparencia en proyectos de infraestructura pública, con un esquema de datos estandarizado (identificación del proyecto, presupuesto, licitación, contrato, implementación, entrega).

### Por qué mencionarlo en la presentación
- Le da al piloto un **respaldo internacional reconocido**, no una idea inventada desde cero — se puede decir literalmente "seguimos el estándar que ya usan México, Ucrania, Honduras y otros países para sus portales de transparencia de infraestructura".
- Si en el futuro el ente busca cooperación o financiamiento internacional (BID, Banco Mundial, PNUD), tener los datos ya estructurados en un formato compatible con OC4IDS facilita muchísimo ese proceso.

### Cómo se integra sin rehacer el modelo
No implica cambiar el schema de Prisma — implica agregar un **endpoint de exportación** que traduzca `Obra` + `Contrato` + `Avance` al JSON del estándar OC4IDS:

```ts
// app/api/opendata/oc4ids/[obraId]/route.ts
export async function GET(req: Request, { params }: { params: { obraId: string } }) {
  const obra = await obtenerObraCompleta(params.obraId);
  return Response.json(mapearAOC4IDS(obra)); // función que traduce nuestros campos al esquema OC4IDS
}
```

### Por qué importa
Es "gratis" en términos de esfuerzo (una función de mapeo, no una reestructuración) y aporta muchísima credibilidad técnica e internacional al piloto.

---

## 🟡 8. Módulo de mantenimiento post-entrega (una idea nueva, no cubierta antes)

### El problema que resuelve
Un patrón muy común: la obra se inaugura, sale en fotos, y luego **nadie le hace seguimiento** — la escuela se empieza a deteriorar, el hospital tiene equipos dañados, y no hay registro de que alguna vez se hizo bien. Este módulo cierra ese vacío.

### Modelo de datos (nuevo)

```prisma
model GarantiaObra {
  id                String    @id @default(uuid())
  obraId            String    @unique
  fechaInicioGarantia DateTime
  fechaFinGarantia  DateTime
  cubreEstructura   Boolean   @default(true)
  cubreInstalaciones Boolean  @default(true)
  observaciones     String?

  obra              Obra      @relation(fields: [obraId], references: [id], onDelete: Cascade)
  intervenciones    IntervencionMantenimiento[]

  @@map("garantias_obra")
}

model IntervencionMantenimiento {
  id            String       @id @default(uuid())
  garantiaId    String
  fecha         DateTime     @default(now())
  tipo          String       // "Correctivo", "Preventivo"
  descripcion   String
  costo         Decimal?     @db.Decimal(18, 2)
  realizadoPor  String?
  fotoAntesUrl  String?
  fotoDespuesUrl String?

  garantia      GarantiaObra @relation(fields: [garantiaId], references: [id], onDelete: Cascade)

  @@index([garantiaId])
  @@map("intervenciones_mantenimiento")
}
```

### Pantalla pública
Pestaña "Estado actual" en obras ya inauguradas, mostrando si sigue en garantía, cuándo fue la última intervención de mantenimiento, y con eso demostrando que la obra **sigue viva** en el sistema después de la foto de inauguración — no desaparece del radar.

### Por qué importa
Es un diferenciador que casi ningún sistema de este tipo contempla, y resuelve una crítica típica hacia los gobiernos ("inauguran y abandonan"). Convierte a SIGOP en una herramienta de ciclo de vida completo, no solo de construcción.

---

## 🟡 9. Bot de WhatsApp/Telegram de consulta

### Objetivo
Dado el contexto de conectividad limitada en Venezuela, permitir consultar el estatus de una obra sin necesidad de cargar la web completa — solo un mensaje de texto.

### Enfoque técnico
- **Telegram** es más simple de implementar (API oficial gratuita, sin aprobación de Meta) — buen punto de partida para el piloto.
- **WhatsApp** requiere la API de Meta Business (o un proveedor como Twilio/360dialog) — se deja para fase 3 si el piloto lo justifica.

```ts
// lib/server/bots/telegram.ts
bot.on('text', async (ctx) => {
  const texto = ctx.message.text.trim();

  // Buscar por código de obra
  if (/^OBR-\d{4}-\d{5}$/.test(texto)) {
    const obra = await obtenerObraPorCodigo(texto);
    return ctx.reply(formatearResumenObra(obra));
  }

  // Buscar por nombre de municipio
  const obras = await buscarObrasPorMunicipio(texto);
  return ctx.reply(formatearListado(obras));
});
```

### Por qué importa
Lleva la transparencia a quien no tiene buena conexión de datos — un mensaje de texto pesa casi nada comparado con cargar un mapa interactivo.

---

## 🟡 10. Presupuesto vinculado a partidas y su historial de modificaciones

### Objetivo
Conectar el presupuesto de cada obra con el **código presupuestario oficial** (partida de la Ley de Presupuesto o de la ordenanza municipal), para que un auditor pueda trazar la obra hasta el documento legal que la sustenta — y registrar cada vez que ese presupuesto se modificó, con su justificación.

### Modelo de datos (nuevo)

```prisma
model PartidaPresupuestaria {
  id          String  @id @default(uuid())
  codigo      String  @unique // ej. "301-01-02-15"
  descripcion String
  ejercicioFiscal Int // año
  obras       Obra[]

  @@map("partidas_presupuestarias")
}

model HistorialPresupuesto {
  id            String   @id @default(uuid())
  obraId        String
  montoAnterior Decimal  @db.Decimal(18, 2)
  montoNuevo    Decimal  @db.Decimal(18, 2)
  motivo        String
  documentoUrl  String?
  aprobadoPor   String?
  fecha         DateTime @default(now())

  obra          Obra     @relation(fields: [obraId], references: [id], onDelete: Cascade)

  @@index([obraId])
  @@map("historial_presupuesto")
}
```

(Requiere agregar `partidaPresupuestariaId String?` a `Obra`, con su relación.)

### Por qué importa
Sin esto, "presupuesto aprobado" es solo un número que alguien tecleó. Con esto, cada bolívar/dólar tiene un documento legal detrás y un historial de por qué cambió — el tipo de trazabilidad que un ente de contraloría necesita para tomarse en serio el piloto.

---

## Resumen de esfuerzo estimado

| Módulo | Esfuerzo | Fase recomendada |
|---|---|---|
| Licitaciones/contratos + desempeño contratista | Medio | Fase 2 |
| Obras paralizadas/reactivadas | Bajo | Fase 2 |
| Alertas automáticas | Medio (requiere cron) | Fase 2 |
| Canal de denuncia ciudadana | Medio (por el cuidado en anonimato) | Fase 2 |
| Ranking y comparador | Bajo-Medio (vistas materializadas) | Fase 2 |
| Hash de integridad | Bajo | Fase 2–3 |
| Alineación OC4IDS/CoST | Bajo (solo endpoint de exportación) | Fase 3 |
| Mantenimiento post-entrega | Medio | Fase 3 |
| Bot de Telegram/WhatsApp | Medio | Fase 3 |
| Presupuesto por partidas | Bajo | Fase 2–3 |

> Ninguno de estos requiere Docker, servicios externos de pago obligatorios, ni salir del stack ya definido (Next.js + Prisma + PostgreSQL/PostGIS). Todos se pueden implementar como extensiones incrementales del mismo `schema.prisma` y de la misma carpeta `app/api/`.
