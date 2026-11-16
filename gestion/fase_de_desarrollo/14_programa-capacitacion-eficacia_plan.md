# Plan 14 — Programa de Capacitación con eficacia peligro→capacitación

> Fecha: 2026-11-16 · Tracker: [gestion/tracker/14_programa-capacitacion-eficacia.md](../tracker/14_programa-capacitacion-eficacia.md)

## Objetivo
Convertir el placeholder `gestion-sst/planes` (ruta `capacitaciones`) en un **Programa de Capacitación** real, sobre una
estructura reusable para los otros 6 tipos de programa (`data.tipo` ya existe en el routing). **Value-add diferenciador**
(hueco confirmado en la competencia — Evotix/Ideagen/EHS Insight/SafetyCulture solo miden asistencia): un **lazo cerrado
peligro→capacitación→eficacia medible**:
1. **Necesidades auto-sugeridas desde IPERC**: los temas salen de los peligros con `nivel_riesgo` alto sin capacitación asociada (reusa `sst_matriz_iperc`), no de una lista genérica.
2. **Eficacia nivel 4 (resultado)**: Δ de hallazgos/actos inseguros por área/tema en ventana **antes vs después** de la sesión (reusa `sst_hallazgo`). Competidores no cierran este lazo.

## Decisiones (del usuario)
- Módulo objetivo: **Planes → Programa de Capacitación** (elegido 2026-11-16, sobre la recomendación de Inspecciones).
- Value-add: lazo peligro→capacitación→eficacia (diferenciador sobre lo investigado).
- Alcance MVP: **solo Capacitación**; los otros 6 tipos reusan la estructura en un plan posterior.

## Base normativa (investigación)
- Dec. 1072/2015: programa de capacitación anual, revisado ≥1 vez/año, con COPASST; soportes de cumplimiento.
- Detección de necesidades parte de **matriz de peligros** + encuesta + evaluación de desempeño (posipedia/SafetyA).
- Eficacia ≠ asistencia: debe evidenciar comportamiento/resultado (G-Talent, Kirkpatrick nivel 4).

## Reúso (no recrear)
- **BD existente:** `catalogo_programa_sst` (capacitación = 1 fila), `catalogo_grupo_objetivo`, `plan_trabajo_actividad(+_mes)` (cronograma mensual programado/ejecutado), `sst_matriz_iperc` (peligros + nivel_riesgo + cargo/área), `sst_hallazgo` (clasificación/severidad/estado/fecha), `trabajadores` (cargo/área/sede), `sst_comite` (COPASST).
- **Front existente:** patrón dashboard+form de `plan-anual` y `plan-mejora` (overlay Tailwind, PrimeIcons), `AlertaVencimientoService`, `TenantService`, `SupabaseClientService`, `PermissionGuard`.
- **Regla:** RLS por `empresa_id` fail-closed; cómputo pesado (eficacia antes/después) en RPC, no en cliente.

## Contrato de BD (propuesto — a validar por capa-datos contra el esquema real)
Tablas nuevas (todas con `empresa_id` + RLS por empresa, idempotentes `IF NOT EXISTS`):
- **`cap_tema`** — tema de capacitación. Cols: `id, empresa_id, nombre, descripcion, grupo_objetivo_id?, iperc_id?` (FK `sst_matriz_iperc`, nullable), `fuente` (`'iperc'|'hallazgo'|'manual'`), `obligatorio bool, horas_min numeric, activo bool, created_at`.
- **`cap_sesion`** — sesión dictada. Cols: `id, empresa_id, tema_id, fecha date, facilitador text, modalidad text, horas numeric, area_trabajo text?` (para el lazo de eficacia), `evidencia_url text, estado text ('programada'|'dictada'|'cancelada'), created_at`.
- **`cap_asistencia`** — Cols: `id, sesion_id, trabajador_id, asistio bool, nota_evaluacion numeric?, aprobado bool, created_at`. Único `(sesion_id, trabajador_id)`.

RPC (heavy compute en BD, `SECURITY INVOKER`, filtran por empresa efectiva):
- **`cap_necesidades_desde_iperc(p_anio int)`** → peligros con `nivel_riesgo`/`interpretacion_np` alto que NO tengan `cap_tema` activo ligado; devuelve sugerencias (proceso, área, peligro, nivel, cargo).
- **`cap_eficacia_tema(p_tema_id uuid, p_ventana_dias int default 90)`** → por cada sesión del tema, cuenta `sst_hallazgo` del área en `[fecha-ventana, fecha)` vs `(fecha, fecha+ventana]`; devuelve `antes, despues, delta, mejora_pct`.

## Fases (cada una: `ng build` EXIT 0 + suite headless = baseline; migración = **OK explícito del usuario antes de aplicar**)
- **F0** — contrato: este plan + validar columnas reales + confirmar que `catalogo_programa_sst` trae "Capacitación". (Opus)
- **F1 (capa-datos)** — migración idempotente: 3 tablas + RLS por empresa (fail-closed) + 2 RPC + índices (`empresa_id`, FKs, `cap_sesion.fecha`). Modelos TS en `core/models`. **Requiere OK para aplicar.** Verificar RPC con `execute_sql` (vectores documentados en la migración).
- **F2 (cliente-web)** — módulo `planes` real para `tipo='capacitaciones'`: página dashboard (lista temas, cronograma, % cumplimiento) reusando patrón plan-anual; service Supabase.
- **F3 (cliente-web)** — CRUD tema + sesión + registro de asistencia (overlay Tailwind, formularios reactivos tipados).
- **F4 (cliente-web)** — **value-add A**: panel "Necesidades desde IPERC" (consume `cap_necesidades_desde_iperc`, botón "crear tema" desde sugerencia).
- **F5 (cliente-web)** — **value-add B**: indicador de eficacia por tema (consume `cap_eficacia_tema`, gráfica antes/después, semáforo de mejora).
- **F6** — funciones puras `*.funcion.ts` (% cumplimiento, agregación eficacia) con `.spec.ts`; verificación final (Opus/verificador) + commit.

## Validación / riesgos
- Cada fase: build + suite (único rojo = baseline `AppComponent`). No aumentar deuda de lint en lo tocado.
- RLS: aislamiento por empresa en las 3 tablas y en ambos RPC — verificar con dos empresas (verificador, foco RLS).
- Riesgo: el lazo de eficacia atribuye causalidad imperfecta (confusión); se presenta como **correlación/tendencia**, no causa. Ventana configurable.
- Riesgo: `sst_hallazgo` liga área vía `verificacion_id`, no columna directa — F1 debe resolver cómo derivar el área (join) o `cap_sesion.area_trabajo` como ancla. A validar en F1.
- Migraciones nunca reescriben una aplicada; service_role jamás al cliente.
