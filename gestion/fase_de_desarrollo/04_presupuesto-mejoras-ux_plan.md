# Plan 04 — Presupuesto mejoras UX (variacion, semaforo, rollover)

> Fecha: 2026-11-13 · Tracker: [gestion/tracker/04_presupuesto-mejoras-ux.md](../tracker/04_presupuesto-mejoras-ux.md)

## Objetivo
Subir el módulo Presupuesto al estándar de apps serias (Alegra, Quicken, Budgyt): hacer visible el
**desvío presupuestado vs ejecutado** (variación $ y %), semáforo de avance, KPI cards legibles, y
**rollover** del saldo entre periodos. Solo mejoras de presentación y una ayuda de captura; sin cambiar
el contrato de la RPC ni la aritmética existente.

## Enfoque arquitectónico
- **Aritmética nueva = funciones puras** en `funciones/resumen.funcion.ts` (+ spec), el componente solo pinta. (codigo-limpio, templates-y-estado)
- **La RPC sigue siendo dueña única** de saldo_final/meta; el rollover NO recalcula: lee `getResumen(periodoAnterior).saldo_final`. (rpc-y-calculos)
- Sin cambios de BD, sin migración, sin RLS. Todo cliente.
- Estilo: Tailwind + PrimeIcons, idioma trabajadores (sin ion-*). Colores por variables de tema, no hex sueltos. (ionic-tailwind)
- Reparto: Opus plan/review, **Sonnet (cliente-web) implementa** con brief autocontenido. Edición secuencial del módulo (un dueño por archivo, sin agentes en paralelo sobre el mismo módulo).

## Archivos a crear/modificar
- `modules/presupuesto/funciones/resumen.funcion.ts` — add `variacion`, `variacionPct`, `estadoAvance`.
- `modules/presupuesto/funciones/resumen.funcion.spec.ts` — casos nuevos.
- `modules/presupuesto/pages/resumen/resumen.component.html` (+`.ts` si hace falta helper) — columna Variación $/%, barras semáforo, chip Sobregasto, KPI cards rediseñadas con anillo de meta.
- `modules/presupuesto/pages/resumen/resumen.component.scss` — anillo de meta (conic-gradient) si se usa.
- `modules/presupuesto/pages/gastos/gastos.component.html` — columna Variación % coloreada.
- `modules/presupuesto/pages/cuentas-por-pagar/cuentas-por-pagar.component.html` — columna Variación % coloreada.
- `modules/presupuesto/pages/periodos/periodos.component.ts` — rollover: pre-llenar saldo_inicial al crear.

## Cambios de BD / SQL / RLS
Ninguno.

## Reglas de negocio
- `variacion(ejecutado, presupuestado) = ejecutado - presupuestado`. Gasto: >0 = sobregasto (rojo), <0 = ahorro (verde), =0 neutro.
- `variacionPct(ejecutado, presupuestado) = presupuestado>0 ? ejecutado/presupuestado - 1 : null` (null = sin presupuesto, pinta '—').
- `estadoAvance`: `>1.0` → 'sobre' (rojo); `>=0.9` → 'cerca' (ámbar); resto → 'bajo' (verde). Usa el ratio ejecutado/presupuestado ya existente (porcentajeAvance).
- Rollover: al abrir "Nuevo periodo", si hay periodos previos, tomar el más reciente (lista ya viene ordenada desc por mes), `getResumen(prev.id)`, y proponer `saldo_inicial = resumen.saldo_final`. Editable; si no hay previo o falla la RPC, dejar 0. No bloquear el alta por esto.

## Casos de prueba (spec)
- variacion: (2.900.000 ejec, 6.005.000 presup) => -3.105.000; (120, 100) => 20; (0,0) => 0.
- variacionPct: (120,100) => 0.2; (80,100) => -0.2; (50,0) => null; (0,0) => null.
- estadoAvance: (120,100) => 'sobre'; (95,100) => 'cerca'; (90,100) => 'cerca'; (50,100) => 'bajo'; (0,0) => 'bajo'.
