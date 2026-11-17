# Tracker 15 — Vista calendario del cronograma de sesiones

> Plan: [gestion/fase_de_desarrollo/15_calendario-sesiones-capacitacion_plan.md](../fase_de_desarrollo/15_calendario-sesiones-capacitacion_plan.md) · Iniciado: 2026-11-17
> Estados: `- [ ]` pendiente · `- [~]` en curso · `- [x]` hecho. Única fuente de verdad.

## Checklist
- [x] F0 contrato: plan + diseño (rejilla mensual, función pura, componente OnPush, toggle) — Opus
- [x] F1 cliente-web: `calendario-mes.funcion.ts` + `.spec.ts` (rejilla 6×7 UTC, agrupa por string fecha, 7 specs/8 casos). Días de semana verificados por Opus
- [x] F2 cliente-web: `cronograma-calendario.component` (OnPush) + html (grid Tailwind, chips por estado, nav mes, tokens de tema)
- [x] F3 cliente-web: wire en dashboard (toggle Lista/Calendario, `(editar)=abrirSesion`) + declarado en `planes.module.ts`
- [x] F4 verificación: build EXIT 0, suite 1 FAILED(base)+192 SUCCESS (7 specs nuevos), lint 0 nuevo. Código revisado por Opus (sin getter que cree arrays, UTC sin desfase TZ)
- [x] Commit — 2026-11-17

## Notas / decisiones
- Sin BD: solo frontend, consume `getSesiones(anio)`.
- Rejilla mensual (no horaria) porque `CapSesion` no tiene hora.
- Fechas como string `YYYY-MM-DD` (sin `new Date`) para evitar desfase TZ (UTC-5).
- Semana inicia lunes.
