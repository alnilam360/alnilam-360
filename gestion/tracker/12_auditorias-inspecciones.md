# Tracker 12 — Auditorías e Inspecciones

> Plan: [gestion/fase_de_desarrollo/12_auditorias-inspecciones_plan.md](../fase_de_desarrollo/12_auditorias-inspecciones_plan.md) · Iniciado: 2026-11-14
> Estados: `- [ ]` pendiente · `- [~]` en curso · `- [x]` hecho. Única fuente de verdad.

## Checklist
### F0. Research / legal (Opus) — no bloquea MVP
- [x] Mercado revisado (autoevaluación 0312 ≠ auditoría interna Dec.1072); diferenciador = bucle cerrado hallazgo→acción→eficacia + cockpit + plantillas + foto (2026-11-14)
- [x] Marco: Dec.1072/2015 arts.2.2.4.6.29–31 (auditoría interna anual), Res.0312/2019 (estándares), alcance inspecciones planeadas (2026-11-14)

### F1. Datos (capa-datos → Opus aplica) — ✅ aplicada en prod (2026-11-14)
- [x] Migración aditiva idempotente `2026_11_14_03_auditorias_inspecciones.sql`: 5 tablas + RLS fail-closed (20 policies) + 8 índices (2026-11-14)
- [x] RPC `get_programa_verificaciones(p_empresa_id, p_anio)` SECURITY DEFINER fail-closed; GRANT authenticated, REVOKE anon/public (2026-11-14)
- [x] Seed plantillas base globales (EPP 8, extintores 7, botiquín 5, locativa 7 = 27 ítems) idempotente por UUID fijo (2026-11-14)
- [~] Storage bucket + policy por empresa: diferido a F3 (columnas `evidencia_url` son text; bucket al entrar la foto, reusa patrón matriz-at)
- [x] `verificacion.model.ts` (7 tipos + 6 interfaces) alineado columna a columna con el SQL (2026-11-14)
- [x] Vector verificado: % excluye no_aplica = 80.00; advisors security sin issues nuevos; RPC existe (2026-11-14)

### F2. Front — cockpit/programa anual (cliente-web) — ✅ (2026-11-14)
- [x] `AuditoriasModule` lazy + `verificaciones.service.ts`; rutas `/auditorias/*` colapsadas a un solo lazy; menú repuntado (2026-11-14)
- [x] Página cockpit: programa anual (semáforo estadoPrograma, resumen), chips tipo/estado, modal Programar, Cancelar; funciones puras + spec; build EXIT=0, suite 130/1 (2026-11-14)

### F3. Front — ejecución checklist + hallazgos (cliente-web + capa-datos)
- [~] Storage + RPC: migración `04` ESCRITA y revisada (bucket por empresa, RPC `cerrar_verificacion`, CHECK cierre); chequeo pre-aplicación: 0 hallazgos cerrados sin fecha. **PENDIENTE: aplicar a prod (OK)**
- [x] Runner de checklist: respuestas cumple/no_cumple/no_aplica + observación + evidencia foto (input file capture) — build EXIT=0, suite 135/1 (2026-11-14)
- [x] Derivación de hallazgos por no_cumple (sugerido) + acción con jerarquía/eficacia (desv.: ngModel como investigacion-detalle) (2026-11-14)
- [x] Funciones puras + spec: `porcentajeCumplimiento` (redondeo idéntico a RPC), `derivarHallazgos`, `puedeCerrar` (2026-11-14)
- [x] Bloqueo de cierre vía RPC `cerrar_verificacion`; CHECK hallazgo cerrado⇒fecha_cierre en migración 04 (2026-11-14)

### F4. Plantillas + informe (cliente-web) — ✅ (2026-11-14)
- [x] CRUD de plantillas en `/auditorias/plantillas`: lista Global/Empresa, clonar global→empresa (con ítems), ítems CRUD, selector estándar 0312 en auditoría (2026-11-14)
- [x] Export informe de verificación a Excel (`exportarInformeVerificacion` + función pura `informe-verificacion.funcion`); botón en ejecución; build EXIT=0, suite 139/1 (2026-11-14)

**Pendientes F4 (no bloquean):** `verificaciones.service.ts` ~240 líneas y `ejecucion.component.ts` ~205 (>200 guía; `indicadores-excel` ya es ~1000, repo no lo fuerza) → partir en plan aparte; plantilla desactivada no reactivable desde UI; sede en informe muestra `sede_id` sin nombre.

### Cierre
- [x] Validación: build EXIT=0; suite headless 139/1 (único rojo = base `AppComponent`); migraciones 03+04 aplicadas; advisors sin issues nuevos; vector 8/2/5→80.00; bucket/policies/CHECK/RPC verificados (2026-11-14)
- [x] Commit (2026-11-14)
