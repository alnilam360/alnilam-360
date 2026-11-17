# Tracker 16 — Seguimiento de exámenes médicos ocupacionales (Res 1843/2025)

> Plan: [gestion/fase_de_desarrollo/16_seguimiento-examenes_plan.md](../fase_de_desarrollo/16_seguimiento-examenes_plan.md) · Contrato: [16_seguimiento-examenes_expediente.json](../fase_de_desarrollo/16_seguimiento-examenes_expediente.json) · Iniciado: 2026-11-17
> Estados: `- [ ]` pendiente · `- [~]` en curso · `- [x]` hecho. Única fuente de verdad.

## Checklist
- [x] F0 investigación + contrato: Res 1843/2025 verificada (texto oficial), inventario repo, plan + expediente v1 — Opus
- [x] **OK del usuario para arrancar F1** + OK para aplicar migración
- [x] F1 capa-datos: migración `2026_11_17_01_seguimiento_examenes.sql` **APLICADA en prod** (3 tablas + RLS fail-closed + 2 RPC INVOKER + `salud_norm` + 50 filas seed) + `salud.model.ts` (lint 0). Opus corrigió bug `tg_set_updated_at`→`trigger_set_updated_at`
- [x] F1b verificado: seed 50, 9 policies, RLS×3, 3 funcs; `get_advisors security` **0 hallazgos nuevos**; match peligro→examen probado con IPERC real (Bacterias→biológico ok)
- [x] F2 cliente-web: módulo `salud/` (dashboard cobertura/vencimientos/pendientes, examenes-trabajador, examen-form-modal, restricciones-panel con lazo→acción +20 días hábiles, perfil-cargo-panel IPERC) + `funciones/ventana-examen.funcion.ts` (+spec 7 casos) + ruta app-routing:148→SaludModule. Storage reusa bucket `matriz-legal-docs` (<empresa>/salud/)
- [x] F3 verificador: build EXIT 0, tests 1 FAILED(base)+199 SUCCESS, lint 0; contrato RPC/columnas exacto; RLS fail-closed por operación verificada en SQL; submit deshabilitado; CD explícito; sin `ion-*`/hex/getter-array. Revisión Opus de función pura+service+dashboard+ruta OK
- [x] Commit — 2026-11-17

## Notas / decisiones
- Valor agregado = perfil-cargo desde IPERC (Art.16) + detección auto de pendientes (Art.8/11/12/13/15) + lazo restricción→acción (Art.19 Par./5.f).
- Guarda solo concepto + aptitud + restricciones (NUNCA historia clínica, Art.30/31).
- `aptitud` sin `no_apto` literal (Art.19 Par.). Cargo liga por texto normalizado (shortcut). Días hábiles sin festivos (shortcut).
- Fase 2 futura: rol MÉDICO + RLS por rol, diagnóstico anonimizado anual (Art.20), móvil.
