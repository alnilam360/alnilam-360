# Plan Anual de Trabajo (SG-SST) — ALNILAM 360
## Análisis y prompts para Claude Code

---

## Lo que encontré al analizar el Excel (Plan_de_Trabajo_Brinks_2026.xlsx)

Antes de los prompts, este es el análisis que sustenta el diseño:

1. **El módulo real tiene 3 bloques, no 1**, y confirman exactamente lo que pediste de dividir
   en dos pestañas "Planeación" y "Plan de Acción":
   - **PLANEACIÓN**: encabezado (UEN, Localización, Elaborado/Revisado, Autorizado, Objetivo,
     Alcance, Recursos, Meta) + tabla de actividades (Fase, Programa, Actividad, Ciudad, Grupo
     Objetivo, Responsable, Estado P/E por mes, Evidencia).
   - **MEDICIÓN Y SEGUIMIENTO**: un bloque de KPI (no es una pestaña aparte en el Excel, vive al
     final de la misma hoja) que cuenta con `COUNTIF` cuántas actividades quedaron marcadas "P"
     y cuántas "E" por mes, calcula `% Cumplimiento = Ejecutadas/Programadas` y lo compara contra
     una `META` fija (90% en el ejemplo). Esto es justo lo que pediste agregar como sección de
     KPI en la tabla de consulta — lo ubico dentro de la pestaña "Planeación" porque es
     seguimiento operativo mes a mes del mismo plan.
   - **ANÁLISIS Y PLAN DE ACCIÓN**: tabla trimestral (Ene-Mar, Abr-Jun, Jul-Sep, Oct-Dic) con
     columnas Periodo, Resultado (%), Análisis (texto), Plan de Acción (texto), Fecha,
     Responsable. Esta es la que corresponde 1:1 a tu segunda pestaña "Plan de Acción".

2. **Cada actividad ocupa una fila "Programado" y una fila "Ejecutado" por separado**, cada una
   con sus propias marcas por mes. Es decir, Programado y Ejecutado NO son mutuamente excluyentes
   en el mismo mes de forma automática: se planea un mes y se puede ejecutar en otro. El modelo
   de datos debe reflejar esto (dos banderas independientes por mes, no un único estado).

3. Los 27 "Programa" que encontré en el Excel real coinciden casi 1:1 con la lista de 26 que tú
   diste (tu lista solo unifica "Actividades varias Salud" + "ESTILOS DE VIDA SALUDABLE" en una;
   en el Excel real están separados). Uso tu lista tal como la diste, pero lo señalo en el prompt
   para que Claude Code te muestre el catálogo final antes de sembrarlo.

4. La columna "Responsable" en el Excel real trae texto libre con nombres/cargos de personas
   (ej. "Director SSTA / Jefe SSTA"), mientras que tu especificación (de la reunión con la
   experta) define una lista cerrada de 6 roles institucionales (ARL, Responsable SST, etc.).
   Entiendo que es una simplificación intencional de la nueva versión del módulo — lo implemento
   como catálogo cerrado tal como lo pediste, no como en el Excel viejo.

5. "Grupo Objetivo" en tu especificación incluye el ítem dinámico **"(Nombre de la Empresa
   Seleccionada)"** — esto significa que el selector debe combinar una lista fija + una opción
   generada en tiempo real con el nombre de la empresa actual del plan.

6. "UEN", "Localización", "Elaborado y Revisado" y "Autorizado" son datos que **ya existen en el
   módulo de Empresas** (nombre de empresa, municipio, representante legal). "Elaborado y
   Revisado" pide el "Encargado del Sistema de Gestión de SST" — verifica si ese dato ya existe
   como campo en la ficha de empresa; si no existe, el Prompt 1 lo agrega.

---

## PROMPT 1 — Base de datos y catálogos en Supabase

```
Voy a construir un nuevo módulo llamado "Plan Anual de Trabajo" dentro de Gestión SST, que se
divide en dos pestañas: "Planeación" y "Plan de Acción". Antes de tocar UI, necesito el modelo
de datos completo en Supabase.

Contexto funcional (para que la BD tenga sentido):
- Cada Empresa puede tener uno o varios Planes Anuales de Trabajo (uno por año).
- Un Plan tiene datos de encabezado (objetivo, alcance, recursos, meta) a nivel general, y puede
  tener VARIAS actividades de planeación asociadas (fase, programa, actividad, etc.), cada una
  con su propio calendario mensual de Programado/Ejecutado.
- Separado de las actividades mensuales, el plan tiene un seguimiento TRIMESTRAL de análisis y
  plan de acción (4 registros por año: Ene-Mar, Abr-Jun, Jul-Sep, Oct-Dic), con resultado %,
  texto de análisis, texto de plan de acción, fecha y responsable.

Antes de escribir migraciones, revisa el esquema actual de Supabase (tablas de empresas, sedes,
usuarios/responsables SST) para reutilizar FKs existentes y no duplicar datos. Confírmame si ya
existe en la tabla de empresas un campo para "Encargado del Sistema de Gestión de SST"; si no
existe, agrégalo en la migración de este módulo (no lo agregues como texto libre suelto en el
plan de trabajo, debe vivir en la ficha de empresa para reutilizarse en otros documentos).

1. TABLA DE ENCABEZADO: `plan_trabajo_anual`
   - id, empresa_id (FK), año (int), estado (borrador/publicado, si el proyecto ya maneja ese
     patrón en otros módulos, reutilízalo).
   - objetivo (text), alcance (text), recursos (text), meta (text), meta_porcentaje (numeric,
     0-100, este es el valor que luego se usa como línea "META" en el tablero de KPI mensual).
   - Los campos UEN, Localización, Elaborado y Revisado, Autorizado NO se guardan como texto
     duplicado en esta tabla: se resuelven en tiempo de lectura/consulta desde empresa_id
     (nombre de empresa, municipio de la sede principal o listado de municipios de sus sedes,
     encargado SST, representante legal). Si tu capa de servicios ya tiene un patrón de "vista"
     o "join" para este tipo de datos derivados en otro módulo, sigue ese mismo patrón aquí.
   - created_at, updated_at, created_by.
   - Restricción: un solo plan por (empresa_id, año) — UNIQUE.

2. TABLA DE ACTIVIDADES DE PLANEACIÓN: `plan_trabajo_actividad`
   - id, plan_id (FK a plan_trabajo_anual), fase (array/jsonb con los valores seleccionados de
     Planear/Hacer/Verificar/Actuar — confírmame si en la práctica una actividad realmente puede
     pertenecer a más de una fase a la vez; si la experta lo definió como selección múltiple
     asumo que sí, pero es un comportamiento inusual en metodología PHVA y prefiero que lo
     valides con ella antes de fijarlo en el modelo).
   - programa (text o FK a catálogo, ver más abajo — selección única, no depende de la fase).
   - actividad (text, libre).
   - ciudad (text o FK a municipio de una sede de la empresa — ver catálogo dinámico abajo).
   - grupo_objetivo (text o FK a catálogo — selección única, obligatorio).
   - responsable (text o FK a catálogo — obligatorio).
   - evidencia (text, libre).
   - created_at, updated_at.

3. TABLA DE ESTADO MENSUAL: `plan_trabajo_actividad_mes`
   - id, actividad_id (FK a plan_trabajo_actividad), mes (smallint 1-12).
   - programado (bool, default false), ejecutado (bool, default false).
   - UNIQUE (actividad_id, mes) — un solo registro por actividad y mes, con las dos banderas
     independientes (esto refleja el hallazgo del Excel: Programado y Ejecutado no son
     mutuamente excluyentes en el tiempo).
   - Al crear una actividad, siembra automáticamente las 12 filas (mes 1 a 12) en false/false
     para simplificar las consultas de KPI.

4. TABLA DE SEGUIMIENTO TRIMESTRAL (Plan de Acción): `plan_trabajo_analisis_trimestral`
   - id, plan_id (FK a plan_trabajo_anual), periodo (enum o smallint 1-4: Q1 Ene-Mar, Q2 Abr-Jun,
     Q3 Jul-Sep, Q4 Oct-Dic) — UNIQUE (plan_id, periodo).
   - resultado_porcentaje (numeric, puede calcularse automáticamente a partir de
     plan_trabajo_actividad_mes del trimestre correspondiente, o guardarse editable; dime qué
     patrón de "campo calculado vs editable" ya usa el proyecto en otros módulos y replícalo).
   - analisis (text), plan_accion (text), fecha (date), responsable (text o FK al mismo catálogo
     de responsables del punto 2).

5. CATÁLOGOS (tablas de referencia, mismo patrón de catálogo cacheado con RLS de solo lectura
   que ya usamos en el módulo de Actividad Económica/CIUO — reutiliza ese mismo enfoque):
   - `catalogo_fase_phva`: Planear, Hacer, Verificar, Actuar (4 filas fijas).
   - `catalogo_programa_sst`: siembra estas 27 filas exactas, en este orden:
     Sistema De Gestión Seguridad, Salud en el Trabajo y Medio Ambiente; Identificación peligros
     y aspectos; Requisitos legales; Comunicación, participación y consulta; Rendición de cuentas
     y autoridad; Gestión del cambio; Capacitación, inducción y entrenamiento; Medio Ambiente;
     Plan de gestión integral de residuos solidos; Proveedores y contratistas; PESV; Programa EPP
     y Dotación; Alturas; Salud Pública; Actividades varias Salud ESTILOS DE VIDA SALUDABLE;
     Programa de inspecciones planeadas; Programa de Orden y Aseo; Programa de higiene
     industrial; Programa Alcohol, Tabaco y otras Sustancias Psicoactivas; Auditorias; Reporte e
     investigación Accidentes; Indicadores; Revisión por la dirección; Plan de prevención,
     preparación y respuesta ante emergencias; ACPM; Seguimiento y control; Control documentos y
     registros.
   - `catalogo_grupo_objetivo`: Área Administrativa; Brigada de emergencia; CCL; COMITÉ DE SV;
     Comités Brigadas SSTA; COPASST; Equipos; OPERACIONES; Proveedores y contratistas; Taller
     Mantenimiento y oficinas; Todas las áreas; Todas las UENS; Todo el personal. (El ítem
     "Nombre de la Empresa Seleccionada" NO se siembra como fila fija: se resuelve en el
     frontend agregando dinámicamente el nombre real de la empresa del plan como una opción más
     de este mismo selector — indícamelo así para que no lo trates como dato de catálogo).
   - `catalogo_responsable_plan`: ARL; Responsable SST; Comité CCL; Comité COPASST; Contratistas
     o Proveedores; R.R. Higiene.
   - Para "Ciudad": NO crees un catálogo nuevo. Reutiliza la tabla de Sedes de la Empresa ya
     existente (cada sede tiene su municipio) — el selector de Ciudad debe consultar las sedes
     de la empresa_id del plan actual, no un catálogo global.

6. RLS
   - Todas las tablas de este módulo deben quedar restringidas por empresa_id (mismo patrón de
     multi-tenant que ya usa el resto de ALNILAM 360 — revísalo antes de escribir las políticas).
   - Catálogos: lectura para cualquier usuario autenticado, escritura solo admin/seed.

Antes de aplicar las migraciones, muéstrame el DDL completo y el seed de los catálogos para que
lo valide, y dime explícitamente qué decidiste sobre el punto de "Fase" multi-selección y sobre
si "% resultado" del trimestre será calculado o editable.
```

---

## PROMPT 2 — Lógica de negocio, KPIs y funcionamiento

```
Con el modelo de datos ya creado (plan_trabajo_anual, plan_trabajo_actividad,
plan_trabajo_actividad_mes, plan_trabajo_analisis_trimestral, catálogos), implementa la lógica
de negocio del módulo "Plan Anual de Trabajo".

1. SERVICIOS ANGULAR (revisa primero el patrón de servicios/estado con Signals que ya usa el
   proyecto en otros módulos SST — por ejemplo el de Matriz IPERC o Eval Res. 0312 — y sigue esa
   misma convención aquí, no inventes un patrón nuevo).

   a) PlanTrabajoService: CRUD del encabezado del plan (crear plan por empresa+año, editar
      objetivo/alcance/recursos/meta, validar unicidad empresa+año).

   b) PlanTrabajoActividadService: CRUD de actividades, incluyendo la siembra automática de las
      12 filas de plan_trabajo_actividad_mes al crear una actividad, y un método para
      actualizar puntualmente el par (programado, ejecutado) de un mes específico de una
      actividad (esto alimenta directamente la grilla tipo la de la imagen que adjunté: filas de
      P/E por mes).

   c) PlanTrabajoKpiService: cálculo del bloque "Medición y Seguimiento". Por cada mes (1-12) del
      plan/año:
      - actividades_programadas = COUNT de plan_trabajo_actividad_mes.programado = true para ese
        mes, entre las actividades del plan.
      - actividades_ejecutadas = COUNT de plan_trabajo_actividad_mes.ejecutado = true para ese
        mes.
      - porcentaje_cumplimiento = ejecutadas / programadas (manejar división por cero →
        mostrar "N/A" o 0%, no error).
      - meta = plan_trabajo_anual.meta_porcentaje (la misma meta se repite en los 12 meses,
        igual que en el Excel real).
      - cumplimiento_total_anual = promedio de porcentaje_cumplimiento de los meses que ya
        tengan actividades programadas (no promediar meses en 0/0).
      Expón esto como un signal computado reactivo a partir de los datos de
      plan_trabajo_actividad_mes (no dupliques el cálculo en el backend si el volumen de datos
      es bajo por empresa; si el proyecto ya usa vistas SQL/materialized views para KPIs en otro
      módulo tipo Indicadores, evalúa si conviene una vista de Postgres en vez de calcularlo en
      cliente, y dime cuál recomiendas).

   d) PlanTrabajoAnalisisTrimestralService: CRUD de los 4 registros trimestrales del "Plan de
      Acción". Si decidimos (según lo que confirmes en el Prompt 1) que resultado_porcentaje se
      calcula automáticamente, calcúlalo así: para el trimestre, suma actividades_programadas y
      actividades_ejecutadas de los 3 meses correspondientes (desde el mismo dato de
      PlanTrabajoKpiService) y saca el % total del trimestre; si es editable, simplemente
      valida que esté entre 0 y 100.

2. VALIDACIONES DE FORMULARIO
   - Grupo Objetivo y Responsable: obligatorios (Validators.required), tal como se especificó.
   - Meta (texto) obligatoria; meta_porcentaje entre 0 y 100.
   - Fase: al menos un valor seleccionado.
   - No permitir guardar una actividad sin Programa ni Actividad (texto).
   - Ciudad: debe ser una de las sedes reales de la empresa del plan (no texto libre).

3. GRUPO OBJETIVO DINÁMICO
   - Al cargar el selector de Grupo Objetivo, añade en tiempo de ejecución (no en BD) una opción
     adicional con el nombre real de la empresa del plan actual, encabezando o al final de la
     lista fija (dime cuál orden prefieres, por defecto la pondría al inicio ya que es la más
     usada en el Excel real — el valor "BRINKS" aparecía como grupo objetivo en la mayoría de
     filas).

4. RESOLUCIÓN DE CAMPOS DE ENCABEZADO (UEN, Localización, Elaborado y Revisado, Autorizado)
   - Estos 4 campos deben resolverse en lectura a partir de empresa_id: UEN = nombre de la
     empresa; Localización = municipio(s) de la(s) sede(s) de la empresa (si tiene varias sedes
     en distintos municipios, decide conmigo si se muestran todos separados por coma o solo la
     sede principal); Elaborado y Revisado = encargado del SG-SST de la empresa; Autorizado =
     representante legal de la empresa. Estos campos se muestran en el formulario pero NO son
     editables ahí — si hay que corregirlos, se editan desde la ficha de Empresa, no desde el
     Plan de Trabajo (para no crear dos fuentes de verdad).

5. INTEGRIDAD ENTRE PESTAÑAS
   - La pestaña "Plan de Acción" (análisis trimestral) debe existir siempre ligada a un
     plan_trabajo_anual ya creado — no se puede diligenciar Plan de Acción sin que exista al
     menos el encabezado del Plan de Trabajo del mismo año. Si el usuario entra a "Plan de
     Acción" sin un plan creado para la empresa/año activo, muéstrale el estado vacío con un
     enlace para crear primero el Plan de Trabajo en la pestaña "Planeación".

Antes de implementar, muéstrame cómo quedaría la interfaz TypeScript (los signals/estado
expuestos) del PlanTrabajoKpiService, para validar que los nombres y la forma de los datos
calzan con lo que se va a mostrar en el tablero de KPI antes de construir la UI.
```

---

## PROMPT 3 — Diseño UI/UX (dos pestañas: Planeación y Plan de Acción)

```
Con el modelo de datos y los servicios ya listos, construye la interfaz del módulo "Plan Anual
de Trabajo" dentro de Gestión SST (revisa primero el sidebar y el patrón de navegación actual —
en la captura que adjunté existe ya un ítem "Planes y Progra..." en el menú lateral; este nuevo
módulo probablemente cuelga de ahí, confírmalo mirando el routing actual antes de crear rutas
nuevas).

ESTRUCTURA GENERAL
- Un selector de Empresa + Año en la parte superior (si el proyecto ya maneja un "contexto de
  empresa activa" global, reutilízalo en vez de duplicar el selector).
- Debajo, dos pestañas: "Planeación" y "Plan de Acción" (usa el mismo componente de tabs/segment
  que ya use el proyecto en otros módulos con sub-secciones, para mantener consistencia visual;
  revisa el patrón de Ionic segment o tabs que ya exista).

═══════════════════════════════
PESTAÑA 1 — PLANEACIÓN
═══════════════════════════════

A) ENCABEZADO DEL PLAN (parte superior, colapsable/expandible para no ocupar toda la pantalla
   en mobile — recuerda que la app es Ionic, prioriza el layout para pantallas móviles primero):
   - Fila de solo lectura: UEN | Localización | Elaborado y Revisado | Autorizado (resueltos
     automáticamente desde la Empresa, como se definió en el Prompt 2).
   - Sección "Objetivos" con 4 campos editables: Objetivo del Plan (textarea), Alcance
     (textarea), Recursos (textarea), Meta (textarea) + Meta % (input numérico al lado o debajo
     del textarea de Meta, claramente asociado visualmente a ese campo).

B) TABLA DE ACTIVIDADES (el corazón del módulo)
   - Botón "+ Agregar Actividad" que abre un formulario (modal o página, según el patrón que ya
     use el proyecto para formularios de registro en otros módulos) con los campos: Fase
     (selector múltiple tipo chips/checkboxes — no un dropdown nativo simple, para que se vea
     claro que se puede marcar más de una), Programa (selector único con búsqueda, 27 opciones),
     Actividad (textarea corta), Ciudad (selector único, opciones = sedes de la empresa activa),
     Grupo Objetivo (selector único obligatorio, incluye el nombre de la empresa como opción
     dinámica), Responsable (selector único obligatorio), Evidencia (textarea).
   - Debajo de esos campos, en el mismo formulario, la grilla de 12 meses: para cada mes, dos
     checkboxes o un control tipo toggle de 3 estados (vacío / P / E) — dado que en el Excel
     Programado y Ejecutado son independientes por mes, usa dos checkboxes claramente
     etiquetados "Programado" y "Ejecutado" por columna de mes, NO un único selector P/E que
     obligue a elegir solo uno (así se evita el error del Excel donde a veces P y E quedan
     confundidos en la misma celda). Diseña esta grilla como una tabla horizontal con scroll en
     mobile (12 columnas + 2 filas de checkbox es mucho para una pantalla angosta) — usa el
     mismo patrón de tabla responsive/scroll horizontal que ya tengas en otro módulo con muchas
     columnas (por ejemplo si el listado de Empresas y Sedes ya maneja scroll horizontal en
     mobile, replica ese patrón).
   - La tabla de consulta (listado principal) debe mostrar por cada actividad: Programa,
     Actividad (truncada con tooltip/expand), Grupo Objetivo, Responsable, y un mini-resumen
     visual de cumplimiento del año (ej. un badge o barra con el % de meses ejecutados vs
     programados de esa actividad puntual), más acciones de editar/eliminar.
   - Agrega filtros arriba de la tabla por Fase, Programa y Grupo Objetivo (son los campos por
     los que más se va a querer consultar, según la estructura del Excel real).

C) SECCIÓN "MEDICIÓN Y SEGUIMIENTO" (KPI) — debe vivir en esta misma pestaña, como un bloque de
   tablero justo antes o después de la tabla de actividades (no como pestaña separada, según lo
   que pediste):
   - Tarjetas o mini-gráficos con: Actividades Programadas (total y por mes), Actividades
     Ejecutadas (total y por mes), % Cumplimiento (total y por mes) vs. Meta (la meta_porcentaje
     definida en el encabezado del plan).
   - Usa una gráfica de barras o líneas de 12 puntos (Ene-Dic) comparando % Cumplimiento
     ejecutado contra la línea de Meta — esto reproduce visualmente el bloque de KPI del Excel
     pero de forma más legible. Si el proyecto ya tiene un patrón de gráficos (Chart.js, recharts
     u otro) en el módulo de Indicadores, reutilízalo aquí en vez de introducir una librería
     nueva.
   - Muestra también el Cumplimiento Total Anual como indicador destacado (badge grande tipo
     semáforo: verde si ≥ meta, ámbar si está cerca, rojo si está lejos — define los umbrales
     conmigo antes de fijarlos en código).

═══════════════════════════════
PESTAÑA 2 — PLAN DE ACCIÓN
═══════════════════════════════

- Muestra los 4 periodos fijos del año (Ene-Mar, Abr-Jun, Jul-Sep, Oct-Dic) como 4 tarjetas o
  filas de una tabla, cada una con: Resultado % (calculado o editable, según se definió en el
  Prompt 2), Análisis (textarea), Plan de Acción (textarea), Fecha, Responsable (selector, mismo
  catálogo de responsables).
- Si el trimestre aún no ha finalizado según el calendario real, deja el bloque visualmente
  disponible pero indica "Trimestre en curso" o similar en vez de forzar a diligenciarlo antes de
  tiempo.
- Si no existe un Plan de Trabajo creado para la empresa/año seleccionados, muestra el estado
  vacío descrito en el Prompt 2 (enlace para ir a crear el plan en la pestaña Planeación) en vez
  de un formulario vacío confuso.

DISEÑO VISUAL
- Antes de escribir cualquier componente, revisa los tokens de diseño y componentes ya
  establecidos del proyecto (colores, tipografía, espaciados de PrimeNG + Tailwind que ya usa
  ALNILAM 360 en los demás módulos de Gestión SST) para que este módulo no se vea como un
  agregado aparte, sino consistente con el resto de la app (mismo estilo de cards oscuras que se
  ve en las capturas que adjunté).
- Prioriza mobile-first dado que es una app Ionic; en desktop la grilla de 12 meses puede
  mostrarse completa, pero en mobile considera colapsar meses en grupos trimestrales con
  scroll/acordeón para no romper el layout.

Antes de construir los componentes, muéstrame un boceto/wireframe (puede ser en texto o un mockup
simple) de cómo quedaría la pestaña "Planeación" completa (encabezado + KPI + tabla) para que lo
valide contigo antes de escribir el HTML/TS final.
```
