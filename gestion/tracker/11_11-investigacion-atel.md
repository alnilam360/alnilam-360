# Tracker 11 — Investigación de AT/EL (Res. 1401/2007)

> Plan: [gestion/fase_de_desarrollo/11_11-investigacion-atel_plan.md](../fase_de_desarrollo/11_11-investigacion-atel_plan.md) · Iniciado: 2026-11-14
> Estados: `- [ ]` pendiente · `- [~]` en curso · `- [x]` hecho. Única fuente de verdad.

## Checklist
### F0. Verificación legal (Opus/research) — no bloquea MVP
- [x] Texto oficial completo Res. 1401/2007 leído (arts. 3,4,7,9–14): equipo, informe, doble reloj ARL (2026-11-14)
- [x] Hallazgos fechados integrados en el plan (sección Marco normativo) (2026-11-14)

### F1. Datos (capa-datos) — ✅ aplicada en prod (2026-11-14)
- [x] Verificar esquema `matriz_at_investigacion`/`matriz_at_acciones` + RLS vs modelo TS (prod: investigación 1:1 por `caso_id` UNIQUE, RLS vía `caso_id IN casos`) (2026-11-14)
- [x] Migración aditiva idempotente `2026_11_14_02_investigacion_atel.sql`: `equipo_investigador jsonb` + `jerarquia`/`eficacia_verificada`/`fecha_verificacion` + CHECK jerarquía (2026-11-14)
- [x] RPC `get_investigaciones_pendientes` (fail-closed, doble reloj) — vector verificado: A=en_plazo, B=fuera_de_plazo, C=completa, D mortal=remitir fuera_de_plazo (2026-11-14)
- [x] RPC `sugerir_equipo_investigador` (COPASST vigente activo). Pendiente: encargado SST y licencia SO no modelables con esquema actual → F3 front (2026-11-14)
- [x] `matriz-at.model.ts` + 2 literales del wizard (`equipo_investigador:[]`, `eficacia_verificada:false`); tsc EXIT=0 (2026-11-14)

### F2. Front — bandeja/cockpit (cliente-web) — ✅ (2026-11-14)
- [x] `InvestigacionAtelModule` (lazy) + `investigacion-atel.service.ts`; ruta `/investigacion-atel` reapuntada (ya no placeholder) (2026-11-14)
- [x] Página bandeja: casos AT con badges de plazo doble (investigar + remitir ARL), días transcurridos, filtro/chips por estado; build EXIT=0, suite 122/1 (baseline) (2026-11-14)

### F3. Front — página investigación + acciones (cliente-web) — ✅ (2026-11-14)
> Decisión: página propia ruteable `/investigacion-atel/:casoId` que REUSA `MatrizAtCasoService` (getCaso/upsertInvestigacion/acciones/plazo); el wizard de matriz-casos es modal embebido no ruteable → no se deep-linkea.
- [x] Página detalle: autollenado RO (art. 9), metodología, causas inmediatas/básicas (art. 11), equipo (sugerido COPASST; aviso grave/mortal art. 7), conclusiones (2026-11-14)
- [x] Panel de acciones (art. 12): CRUD + jerarquía fuente/medio/individuo + eficacia + fecha_verificación; bloqueo de cierre sin acción válida (`puedeCerrar`) (2026-11-14)
- [x] Botón "Actualizar IPERC" (visible con `peligro_id`; navega a lista IPERC, sin param — ver pendiente) (2026-11-14)
- [x] Funciones puras + spec: `esGrave`, `puedeCerrar`, `fusionarEquipo` (3 specs verdes; build EXIT=0, suite 125/1 base) (2026-11-14)
- [x] Bandeja: botón "Investigar" → `routerLink [c.caso_id]` (2026-11-14)

**Pendientes F3 (no bloquean):** IPERC sin pasar `peligro_id` (la lista no tiene param); autollenado solo muestra `tipo_lesion.nombre` (otros `*_id` FURAT sin texto — decidir si cargar catálogos); no se setea `estado_caso='en_investigacion'` al primer guardado (la bandeja deriva estado de la existencia de investigación, no de `estado_caso`); evidencia de acciones a Storage pendiente.

### F4. Informe oficial (cliente-web) — ✅ (2026-11-14)
- [x] Export informe art. 9–13 a Excel (`IndicadoresExcelService.exportarInformeInvestigacion`): aportante, trabajador, datos accidente (nombres de catálogos resueltos), descripción, causas, medidas con jerarquía/eficacia, equipo+firmas; avisos ARL grave/mortal (art.14) y formato ARL mortal (Dec.1530). Botón en detalle. (2026-11-14)

**Pendientes F4 (no bloquean):** derivación grave/mortal duplicada inline en el export (core no puede importar `esGrave` del módulo — trivial); layout xlsx (anchos/alturas/wrapText) sin verificación visual; export usa el estado actual del form, no lo persistido (documentado).

### Cierre
- [x] Validación: build EXIT=0, suite headless 125/1 (único rojo = base `AppComponent`), RPC probadas con execute_sql (vector doble reloj) (2026-11-14)
- [x] Commit (F1 c31eecd · F2 · F3 · F4) (2026-11-14)
