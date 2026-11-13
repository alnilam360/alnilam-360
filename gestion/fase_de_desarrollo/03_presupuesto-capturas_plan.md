# Plan 03 — Presupuesto Fase 2 - capturas

> Fecha: 2026-11-13 · Tracker: [gestion/tracker/03_presupuesto-capturas.md](../tracker/03_presupuesto-capturas.md)

## Objetivo
Pantallas de captura que alimentan el Resumen del modulo Presupuesto: **Gastos (movimiento)**,
**Recaudo**, **Nomina** y **Cuentas por pagar**. Las tablas, el modelo y el RPC ya existen (Fase 1).
UI **consistente con los modulos existentes** (trabajadores / matriz-indicadores): pedido explicito del usuario.

## Enfoque arquitectonico
- Extender `presupuesto.service.ts` con CRUD de las 4 tablas (reusa resolverContextoEmpresa, listarPeriodos, getSubrubros).
- 4 pages nuevas en `src/app/modules/presupuesto/pages/`, declaradas en el modulo lazy; 4 items de menu.
- Aritmetica pura en `funciones/capturas.funcion.ts` (+ spec): netoNomina, totalDevengado/Deducciones, saldoPorPagar.
- Reglas: arquitectura-modulo, codigo-limpio, change-detection, templates-y-estado, ionic-tailwind, formularios-sgsst, fechas-y-http, consultas-eficientes.

## Contrato de estilo (sistema de diseno existente)
Tailwind + variables CSS de tema oscuro (NO ion-* crudos). Tomado de trabajadores.component.html/.scss:
- Header `text-xl font-bold text-[rgb(var(--color-heading))]` + icono `text-brand-primary`; subtitulo `text-xs text-dark-text`.
- Selects `px-3 py-1.5 text-xs bg-dark-secondary border border-dark-border rounded-lg`.
- Card `bg-dark-secondary border border-dark-border rounded-2xl shadow-xl`.
- Botones primarios `px-3.5 py-2 bg-brand-primary hover:bg-blue-600 text-white text-xs rounded-lg`.
- Tablas `text-xs`, thead `bg-dark-primary/60 uppercase text-[10px]`, celdas `px-3 py-2`, montos a la derecha.
- Modal overlay `bg-black/60 backdrop-blur-sm` + panel `bg-dark-secondary rounded-2xl`; inputs clase `.form-input`.
- Pills `px-2 py-0.5 rounded-full text-[10px]` (emerald/amber/red). Borrado via modal overlay, no window.confirm.

## Archivos a crear/modificar
- `core/services/presupuesto.service.ts` (extender): CRUD movimiento/recaudo/nomina/cuenta_por_pagar.
- `modules/presupuesto/pages/{gastos,recaudo,nomina,cuentas-por-pagar}/*` (nuevas).
- `modules/presupuesto/funciones/capturas.funcion.ts` + `.spec.ts`.
- `modules/presupuesto/presupuesto.module.ts` (declaraciones + rutas).
- `core/models/menu.model.ts` (4 items bajo 'presupuesto').

## Reglas de negocio
- Gastos: subrubro limitado a rubros {2000,3000,4000} (1001=nomina y 5000=cxp tienen su propia pantalla). por_pagar = presupuestado - ejecutado.
- Nomina: neto = (5 devengados) - (3 deducciones); presupuestado del resumen = SUM(neto), ejecutado = SUM(pago_nomina).
- CxP: saldo = por_pagar - ejecutado.
- Recaudo: total esperado = SUM(valor); recaudo real = SUM(valor WHERE estado='pago').
- Fechas de negocio a 'YYYY-MM-DDT12:00:00Z' (mediodia UTC). Montos >= 0.

## Casos de prueba
- netoNomina: devengado 2.500.000, deducciones 0 => 2.500.000; con ded 200.000 => 2.300.000; todo 0 => 0.
- saldoPorPagar: por_pagar 1.570.000, ejec 120.000 => 1.450.000.
- Bordes: periodo no seleccionado => aviso, sin listar; monto negativo rechazado por validator; error de carga pintado como error.
