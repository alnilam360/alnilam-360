# Plan 08 — Dashboard con datos reales

> Fecha: 2026-11-14 · Tracker: [gestion/tracker/08_08-dashboard-datos-reales.md](../tracker/08_08-dashboard-datos-reales.md)

## Objetivo
Alimentar el dashboard (hoy 100% mock) con datos reales **solo donde el módulo y los datos existen**.
Lo que no tiene módulo/dato se deja mock, marcado en código. Sin RPC nueva (se reusan servicios).

## Enfoque
- `dashboard-page.component` resuelve empresa activa (vía `TenantService`/helper de servicio) y carga en `ngOnInit`.
- Widgets alimentados pasan a `signal<>`; los no alimentados quedan como data estática en `dashboard.mock.ts`.
- Cálculo puro (bandas 0312, selección de próximas, arcos del donut) en `funciones/dashboard.funcion.ts` + spec.
- Cada fuente carga aislada: si una falla, su widget queda vacío/placeholder, **no rompe** la página (CD Default).
- Extraer interfaces + arrays mock a archivos aparte para mantener el componente ≤200 líneas.

## Qué se alimenta (módulo + datos confirmados en BD)
| Widget | Fuente (reuso) | Nota |
| :-- | :-- | :-- |
| KPI Cumplimiento 0312 | `ResEvaluacionesService.listarEvaluaciones` → última **Finalizado** `puntaje_total` | real hoy = 36% → banda Crítico. Sin finalizada ⇒ placeholder |
| KPI Actividades del Plan | `PlanAnualService` getPlanPorEmpresaAnio + listarActividades + `calcularKpi().cumplimientoAnual` | |
| KPI Indicadores Clave | `MatrizIndicadoresService.obtenerRegistrosMatriz().resumen` | `cumplen/total` + % |
| Item "Cumplimiento Plan" | mismo KPI del plan | sin histórico ⇒ ocultar tendencia |
| Próximas Actividades | `PlanAnualService.listarActividades` (meses programados) | `proximasDesdeActividades` (pura) |
| Donut Cumplimiento por Estándar | `ResEvaluacionesService` detalle agrupado por `ciclo_phva` | **dinámico** (2–4 segmentos), centro = puntaje real |
| Label "Período" | fecha real de la evaluación/plan | |

## Qué se deja MOCK (módulo o dato no disponible) — marcar con comentario en código
- KPI **Documentos Vigentes**: no hay tabla ni servicio de documentos.
- KPI **Participación Colaboradores**: métrica no modelada.
- Items **Frecuencia AT / Severidad AT**: `matriz_at_parametros_mensuales` vacío (sin horas-hombre ⇒ IF/IS = 0).
- Item **Ausentismo**: sin servicio (solo getter en componente del módulo indicadores).
- **Alertas y Notificaciones**: `matriz_legal_evaluacion` vacía; sin módulos capacitaciones/inspecciones.
- PHVA, Accesos Rápidos, hero, footer: UX estático.

## Archivos
- `modules/dashboard/funciones/dashboard.funcion.ts` (+ `.spec.ts`): `estadoCumplimiento0312`, `estadoActividades`, `proximasDesdeActividades`, `arcosDonut`.
- `modules/dashboard/pages/dashboard-page/dashboard.mock.ts` (NUEVO): interfaces + arrays mock que se quedan.
- `modules/dashboard/pages/dashboard-page/dashboard-page.component.{ts,html}`: wiring real + señales + bindings.

## Reglas de negocio
- Bandas 0312 (Res. 0312/2019): `>=86` Aceptable (verde), `61–85` Moderadamente aceptable (amarillo), `<=60` Crítico (rojo).
- Donut: % por ciclo = `cumple/total` del ciclo; centro = `puntaje_total` de la evaluación (no promedio de ciclos).
- "Próximas": actividades con mes programado `>=` mes actual, ordenadas, primeras 3.

## Casos de prueba (spec)
- `estadoCumplimiento0312`: 90⇒Aceptable/verde; 70⇒Moderado/amarillo; 36⇒Crítico/rojo; 60⇒Crítico; 86⇒Aceptable.
- `proximasDesdeActividades`: vacío⇒[]; filtra meses pasados; respeta límite 3; ordena por mes.
- `arcosDonut`: suma de longitudes = circunferencia; lista vacía⇒[]; 1 segmento full.
