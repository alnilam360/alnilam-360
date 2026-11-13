# Tracker 02 — Modulo Presupuesto (nucleo)

> Plan: [gestion/fase_de_desarrollo/02_presupuesto-nucleo_plan.md](../fase_de_desarrollo/02_presupuesto-nucleo_plan.md) · Iniciado: 2026-11-13
> Estados: `- [ ]` pendiente · `- [~]` en curso · `- [x]` hecho. Única fuente de verdad.

## Checklist
- [x] Diseño / contrato acordado (alcance nucleo, formulas corregidas, sin cuentas bancarias)
- [x] BD: migracion `2026_11_13_01_presupuesto_nucleo.sql` (tablas + RLS + RPC) escrita + revisada
- [x] BD: seed rubros/subrubros escrito
- [x] BD: aplicada migracion + seed en remoto (2026-11-13); advisor security sin findings nuevos (revocado anon EXECUTE del RPC)
- [x] Modelo TS `presupuesto.model.ts`
- [x] `presupuesto.service.ts` + Menu + ruta `presupuesto` lazy
- [x] Pantalla Resumen del mes (consume RPC)
- [x] Pantalla Socios (CRUD agregar/editar/quitar + reparto por saldo_final)
- [x] Pantalla Periodos (crear/seleccionar mes)
- [x] Pantalla Catalogo de rubros (lectura)
- [x] Funciones puras + `.spec.ts` (8 tests) en verde
- [x] Validación: build dev OK, spec 8/8 headless (2026-11-13)
- [x] Commit (2026-11-13)
