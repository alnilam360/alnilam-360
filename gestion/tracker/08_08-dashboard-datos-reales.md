# Tracker 08 — Dashboard con datos reales

> Plan: [gestion/fase_de_desarrollo/08_08-dashboard-datos-reales_plan.md](../fase_de_desarrollo/08_08-dashboard-datos-reales_plan.md) · Iniciado: 2026-11-14
> Estados: `- [ ]` pendiente · `- [~]` en curso · `- [x]` hecho. Única fuente de verdad.

## Checklist
### Funciones puras (cliente-web)
- [x] `dashboard.funcion.ts`: estadoCumplimiento0312, estadoActividades, proximasDesdeActividades, arcosDonut
- [x] `dashboard.funcion.spec.ts` en verde (vectores del plan)
### Wiring real
- [x] `dashboard.mock.ts`: extraer interfaces + arrays que se quedan mock (con comentario de razón)
- [x] Componente: resolver empresa activa + cargar fuentes en ngOnInit (aislado, sin romper página)
- [x] KPI Cumplimiento 0312 (última Finalizado; placeholder si no hay)
- [x] KPI Actividades del Plan + item "Cumplimiento Plan"
- [x] KPI Indicadores Clave (resumen matriz)
- [x] Próximas Actividades (reales)
- [x] Donut dinámico por ciclo PHVA + centro = puntaje real
- [x] Label Período real
- [x] Mock restante marcado en código (docs, participación, AT frec/sev, ausentismo, alertas)
### Cierre
- [x] Validación: build dev OK, specs headless 100/100 verde (único rojo = base preexistente AppComponent) (2026-11-14)
- [x] Commit (2026-11-14)
