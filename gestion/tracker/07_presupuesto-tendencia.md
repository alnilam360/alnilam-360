# Tracker 07 — Presupuesto tendencia y forecast multimes

> Plan: [gestion/fase_de_desarrollo/07_presupuesto-tendencia_plan.md](../fase_de_desarrollo/07_presupuesto-tendencia_plan.md) · Iniciado: 2026-11-14
> Estados: `- [ ]` pendiente · `- [~]` en curso · `- [x]` hecho. Única fuente de verdad.

## Checklist
### BD / contrato (capa-datos)
- [x] RPC get_presupuesto_tendencia escrita (loop llamando a resumen, fail-closed, idempotente)
- [x] Modelo TendenciaMes + service.getTendencia
- [x] **OK del usuario + apply_migration a prod** (2026-11-14)
- [x] Advisor security limpio (mi delta: search_path fijo; sin findings nuevos) (2026-11-14)
### UI (cliente-web)
- [x] proyeccionSaldo (función pura) + spec en verde
- [x] Sección "Tendencia (6 meses)" en Resumen (barras Tailwind + barra proyectada)
### Cierre
- [x] Validación: build dev OK, specs headless 90/90 verde (único rojo = base preexistente AppComponent) (2026-11-14)
- [x] Commit (2026-11-14)
