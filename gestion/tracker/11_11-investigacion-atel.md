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

### F2. Front — bandeja/cockpit (cliente-web)
- [ ] `InvestigacionAtelModule` (lazy) + `investigacion-atel.service.ts`; reapuntar ruta `/investigacion-atel`
- [ ] Página bandeja: casos AT con badge de plazo, contador de días, filtros

### F3. Front — wizard + acciones (cliente-web)
- [ ] Wizard: autollenado RO (art. 9) → metodología → causas inmediatas/básicas (art. 11) → equipo (grave/mortal exige licencia SO+diseño, art. 7) → descripción (art. 10) → conclusiones
- [ ] Panel de acciones (art. 12): CRUD + jerarquía fuente/medio/individuo + eficacia + evidencia Storage; bloqueo de cierre sin acción válida
- [ ] Botón "Actualizar IPERC" (vía `caso.peligro_id`)
- [ ] Funciones puras + spec: contador de plazo (investigar+remitir), `esGrave`, validador de cierre, armado de equipo

### F4. Informe oficial (cliente-web)
- [ ] Export informe art. 9–13 (datos Res.156/2005 + causas + medidas + firmas); grave/mortal ⇒ aviso remisión ARL, mortal ⇒ formato ARL

### Cierre
- [ ] Validación: build dev OK, suite headless (único rojo = base), RPC probadas con execute_sql
- [ ] Commit  <!-- marcar [x] con fecha -->
