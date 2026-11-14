# Tracker 10 — Presupuesto UI policromo

> Plan: [gestion/fase_de_desarrollo/10_10-10-presupuesto-ui-policromo_plan.md](../fase_de_desarrollo/10_10-10-presupuesto-ui-policromo_plan.md) · Iniciado: 2026-11-14
> Estados: `- [ ]` pendiente · `- [~]` en curso · `- [x]` hecho. Única fuente de verdad.

## Checklist
### F1. Cabecera compartida (cliente-web)
- [x] `captura-cabecera.component.ts`: pill badge + dot animado + tile de icono de color (mismos Input/Output)
### F2. Resumen flagship (cliente-web)
- [x] `resumen.component.html`: 7 KPI cards policromas + 3 tablas (header gradiente, th con iconos, barras por umbral)
### F3. Transaccionales (cliente-web)
- [x] `recaudo` · `gastos` · `cuentas-por-pagar` · `nomina`: KPI policromo + tabla gradiente + badges de estado
### F4. Configuración (cliente-web)
- [x] `socios` · `centros-costo` · `catalogo` · `periodos`: tiles de color + badges semánticos + header gradiente
### Cierre
- [x] Validación: build dev OK, specs headless 122/1 (único rojo = base AppComponent), revisión estática Opus del flagship + build valida todos los templates (2026-11-14)
- [x] Commit (2026-11-14)
