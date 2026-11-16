# Tracker 14 — Programa de Capacitación con eficacia peligro→capacitación

> Plan: [gestion/fase_de_desarrollo/14_programa-capacitacion-eficacia_plan.md](../fase_de_desarrollo/14_programa-capacitacion-eficacia_plan.md) · Iniciado: 2026-11-16
> Estados: `- [ ]` pendiente · `- [~]` en curso · `- [x]` hecho. Única fuente de verdad.

## Checklist
- [x] F0 contrato: plan + reúso BD/front + contrato tablas/RPC (Opus) — columnas reales validadas (nivel_intervencion I/II, cargo varchar, hallazgo liga por sede)
- [x] F1 capa-datos: migración aplicada 2026-11-16 (`2026_11_16_01_programa_capacitacion_eficacia.sql`) — 3 tablas + 12 policies RLS + 2 RPC INVOKER + 10 índices + modelos TS. Advisors sin deuda nueva; aritmética eficacia OK (60.0/null/-50.0). Aislamiento 2-empresas → verificador en F6
- [x] F2 cliente-web: dashboard capacitaciones read-only (KPIs+temas+cronograma) + `CapacitacionService` + `cumplimiento.funcion`+spec + host por `tipo`. Build EXIT 0, suite 1 FAILED(base)+179 SUCCESS, lint 0 nuevo. Revisado por Opus
- [x] F3 cliente-web: CRUD tema+sesión + asistencia (FormArray), 4 componentes reactivos tipados + confirm overlay propio + service CRUD/upsert. Build EXIT 0, suite 1 FAILED(base)+179 SUCCESS, lint 0 nuevo. Revisado por Opus (RLS protege update/delete por id)
- [x] F4 cliente-web: value-add A — panel "Necesidades desde IPERC" (RPC) + botón crear-tema prellenado (semilla iperc_id/fuente). Fix: `payload()` ahora incluye `iperc_id` (crear+editar). RPC ejecuta OK. Build EXIT 0, suite 1 FAILED(base)+179 SUCCESS, lint 0 nuevo. Revisado por Opus
- [x] F5 cliente-web: value-add B — eficacia por tema (RPC cap_eficacia_tema) + `resumirEficacia`(totales crudos)+spec + panel semáforo/barras Tailwind + selector ventana. Build EXIT 0, suite 1 FAILED(base)+185 SUCCESS, lint 0 nuevo. Revisado por Opus
- [x] F6 verificación final: suite completa sin filtros = **1 FAILED(base)+185 SUCCESS** (11 specs nuevos: 5 cumplimiento + 6 eficacia); RLS por predicado real (12 policies fail-closed `get_my_empresa_id() OR is_admin()`, solo authenticated); advisors sin deuda nueva
- [x] Commit — 2026-11-16

## Notas / decisiones
- Módulo elegido por el usuario: Planes → Capacitación (2026-11-16).
- Value-add = lazo peligro→capacitación→eficacia (hueco confirmado en competencia).
- Migraciones requieren OK explícito antes de aplicar (regla prod).
- Pendiente a resolver en F1: cómo derivar el área de `sst_hallazgo` (join vía verificacion vs ancla `cap_sesion.area_trabajo`).
