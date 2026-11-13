# Tracker 05 — Presupuesto centros de costo

> Plan: [gestion/fase_de_desarrollo/05_presupuesto-centros-costo_plan.md](../fase_de_desarrollo/05_presupuesto-centros-costo_plan.md) · Iniciado: 2026-11-13
> Estados: `- [ ]` pendiente · `- [~]` en curso · `- [x]` hecho. Única fuente de verdad.

## Checklist
### BD / contrato (capa-datos)
- [x] Migración 2026_11_13_02 escrita (tabla + ALTER + RLS + RPC, idempotente)
- [x] Modelos TS (PresupuestoCentroCosto, centro_costo_id, ResumenCentro)
- [x] presupuesto-centro.service.ts (CRUD + getResumenCentros) + COLS_MOV/CXP con centro_costo_id
- [x] **OK del usuario + apply_migration a prod** (aplicada 2026-11-13, success)
- [x] Advisor security limpio (mi delta; la RPC sale como SECURITY DEFINER ejecutable por authenticated = intencional, igual que resumen)
### UI (cliente-web)
- [x] Página Centros de costo (CRUD estilo socios) + menú + ruta
- [x] Selector de centro en Gastos y CxP (form + columna tabla)
- [x] Sección "Por centro de costo" en Resumen
### Cierre
- [x] Validación: build dev OK, 18/18 specs headless en verde (2026-11-13)
- [x] Commit (2026-11-13)
