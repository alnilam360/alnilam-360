# Tracker 17 — Fase 2 seguimiento-examenes

> Plan: [gestion/fase_de_desarrollo/17_salud-fase2_plan.md](../fase_de_desarrollo/17_salud-fase2_plan.md) · Iniciado: 2026-11-17
> 4 tracks secuenciales, menor→mayor riesgo. Cada migración a prod requiere OK explícito.
> Estados: `- [ ]` · `- [~]` · `- [x]`.

## Track A — UX dashboard (sin BD)
- [x] A1 cliente-web: año (recarga RPC) + filtro sede (SedesService) + buscador (sin tildes); `filasVisibles` campo (no getter), KPIs sobre el filtro. `(change)` sin ngModel
- [x] A2 verificado (build 0, tests 1 base+199, lint 0; revisión Opus anti-getter) + commit 2026-11-17

## Track B — Diagnóstico anonimizado anual (Art.20)
- [ ] B0 contrato: RPC `salud_diagnostico_general(p_anio)` agregado, SIN datos individuales
- [ ] B1 capa-datos: RPC + modelo TS (Opus aplica migración tras OK)
- [ ] B2 cliente-web: panel en dashboard
- [ ] B3 verificación + commit

## Track C — Catálogo de cargos
- [ ] C0 contrato + decisión de alcance (tabla `cargos`, `cargo_id` en trabajadores/IPERC, backfill, impacto en forms)
- [ ] C1 capa-datos: migración (Opus aplica tras OK)
- [ ] C2 cliente-web: admin de cargos + wiring en trabajadores/IPERC + `salud_perfil_cargo` por cargo_id
- [ ] C3 verificación + commit

## Track D — Bóveda confidencial + rol MÉDICO (seguridad, va sola)
- [ ] D0 contrato de seguridad: rol MEDICO, `is_medico()`, qué ve el empleador vs el médico, policy de Storage
- [ ] D1 capa-datos: migración RLS/rol (Opus aplica tras OK + revisión de seguridad)
- [ ] D2 cliente-web: gating UI por rol
- [ ] D3 verificador (foco RLS/aislamiento/rol) + commit

## Notas
- Reusa `SedesService`, `TenantService`, `AlertaVencimientoService`, modelo `salud.model.ts`, módulo `salud/`.
- Art.20: el empleador recibe diagnóstico general SIN datos individualizados → solo conteos agregados.
