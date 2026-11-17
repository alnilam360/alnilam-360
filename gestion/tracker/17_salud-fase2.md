# Tracker 17 — Fase 2 seguimiento-examenes

> Plan: [gestion/fase_de_desarrollo/17_salud-fase2_plan.md](../fase_de_desarrollo/17_salud-fase2_plan.md) · Iniciado: 2026-11-17
> 4 tracks secuenciales, menor→mayor riesgo. Cada migración a prod requiere OK explícito.
> Estados: `- [ ]` · `- [~]` · `- [x]`.

## Track A — UX dashboard (sin BD)
- [x] A1 cliente-web: año (recarga RPC) + filtro sede (SedesService) + buscador (sin tildes); `filasVisibles` campo (no getter), KPIs sobre el filtro. `(change)` sin ngModel
- [x] A2 verificado (build 0, tests 1 base+199, lint 0; revisión Opus anti-getter) + commit 2026-11-17

## Track B — Diagnóstico anonimizado anual (Art.20)
- [x] B0 contrato: RPC `salud_diagnostico_general(p_anio)` → 12 conteos agregados, SIN datos individuales
- [x] B1 capa-datos: `2026_11_17_02_salud_diagnostico_general.sql` **APLICADA en prod** (SECURITY INVOKER, consistente con salud_cobertura) + `SaludDiagnosticoRow`. Advisors: función INVOKER, sin hallazgos nuevos
- [x] B2 cliente-web: `getDiagnostico(anio)` + `DiagnosticoPanelComponent` (OnPush, grupos precomputados en ngOnChanges) en el dashboard; año recarga, falla no rompe
- [x] B3 verificado (build 0, tests 1 base+199, lint 0; revisión Opus SQL+panel) + commit 2026-11-17

## Track C — Catálogo de cargos
- [x] C0 contrato + alcance **Fundación** (usuario): tabla `cargos` (nombre_norm generado, UNIQUE empresa+norm), `cargo_id` NULLABLE en trabajadores/IPERC, backfill desde trabajadores (IPERC basura queda NULL), `salud_perfil_cargo` por cargo_id con fallback a texto. Columna texto NO se borra (no-breaking)
- [x] C1 capa-datos: `2026_11_17_03_catalogo_cargos.sql` **APLICADA**. Verificado: cargos=4, trabajadores 4/4 ligados, IPERC 0/1 (basura NULL, esperado), RLS on + 4 policies, advisors 0 nuevos
- [x] C2 cliente-web: admin CRUD de cargos (CargosService + página `configuracion/cargos` + ruta + menú `conf-cargos`). Duplicado 23505→mensaje legible; eliminar confirma+advierte, ofrece desactivar. Sin getter-array. Pendiente: picker cargo_id en forms de trabajadores/IPERC (follow-up; hoy match cae a texto)
- [x] C3 verificado (build 0, tests 1 base+199, lint 0; revisión Opus service+componente) + commit 2026-11-17

## Track D — Bóveda confidencial + rol MÉDICO (seguridad, va sola)
- [ ] D0 contrato de seguridad: rol MEDICO, `is_medico()`, qué ve el empleador vs el médico, policy de Storage
- [ ] D1 capa-datos: migración RLS/rol (Opus aplica tras OK + revisión de seguridad)
- [ ] D2 cliente-web: gating UI por rol
- [ ] D3 verificador (foco RLS/aislamiento/rol) + commit

## Notas
- Reusa `SedesService`, `TenantService`, `AlertaVencimientoService`, modelo `salud.model.ts`, módulo `salud/`.
- Art.20: el empleador recibe diagnóstico general SIN datos individualizados → solo conteos agregados.
