# Plan 15 — Vista calendario del cronograma de sesiones

> Fecha: 2026-11-17 · Tracker: [gestion/tracker/15_calendario-sesiones-capacitacion.md](../tracker/15_calendario-sesiones-capacitacion.md)

## Objetivo
En el dashboard de Capacitaciones, sección **Cronograma de sesiones**, ofrecer una **vista alternativa de calendario** (estilo Teams) además de la tabla actual, para ver de un vistazo las sesiones programadas por día. Toggle Lista / Calendario.

## Enfoque arquitectónico
- **Rejilla mensual**, no grid horario: `CapSesion` solo tiene `fecha` (date, sin hora) → calendario por mes con chips de sesión por día es el ajuste correcto. No se agrega `hora` (fuera de alcance).
- **Lógica pura separada** (`codigo-limpio`, `arquitectura-modulo`): `funciones/calendario-mes.funcion.ts` arma la rejilla (6 semanas × 7 días) y agrupa sesiones por día **operando sobre strings `YYYY-MM-DD`** (sin `new Date` por TZ, regla `fechas-y-http`: evita desfase UTC-5). Con `.spec.ts`.
- **Componente presentacional** `components/cronograma-calendario` (`OnPush`, solo `@Input`/`@Output`, sin I/O): recibe `sesiones`, `nombreTema`, `anio`; estado interno = mes visible; emite `editar`/`asistencia`/`eliminar` de una sesión (reusa los handlers del dashboard). Nav mes anterior/siguiente dentro del año.
- Dashboard: campo `vistaCronograma: 'lista' | 'calendario'` + botones toggle en el encabezado de la sección. La tabla actual se mantiene intacta; el calendario es vista alterna.
- UI: Tailwind + PrimeIcons (no `ion-*`, Ionic removido). Colores por `badgeEstado` existente; respetar tokens de tema (dark). Táctil ≥ 40px, responsive (scroll-x en móvil).
- Sin dependencia nueva (no FullCalendar): rejilla propia con Tailwind grid.

## Archivos a crear/modificar
- **crear** `src/app/modules/gestion-sst/planes/funciones/calendario-mes.funcion.ts` — pura: `armarMesCalendario(anio, mes0, sesiones): SemanaCalendario[]` (6×7 días con `fecha`, `delMes`, `hoy`, `sesiones[]`). Agrupa por `fecha` string.
- **crear** `...funciones/calendario-mes.funcion.spec.ts` — casos borde.
- **crear** `...components/cronograma-calendario/cronograma-calendario.component.ts` (OnPush) + `.html`.
- **modificar** `...pages/dashboard/capacitacion-dashboard.component.ts` — campo `vistaCronograma` + método toggle; reusar `abrirSesion`/`asistenciaSesion`/`pedirEliminar`.
- **modificar** `...pages/dashboard/capacitacion-dashboard.component.html` — toggle Lista/Calendario en la sección Cronograma; render condicional tabla vs `<app-cronograma-calendario>`.
- **modificar** `...planes.module.ts` — declarar `CronogramaCalendarioComponent`.

## Cambios de BD / SQL / RLS
Ninguno. Solo frontend; consume `getSesiones(anio)` ya existente.

## Reglas de negocio
- Rejilla: semana inicia **lunes** (convención Teams/CO). Mes visible inicial = mes actual si el año es el actual, si no enero.
- Día "hoy" resaltado solo si coincide con la fecha real (string `YYYY-MM-DD` de hoy en zona local).
- Un día puede tener N sesiones (chips apilados); chip muestra nombre de tema (truncado) + color por estado.
- Agrupar por igualdad exacta de string `fecha` (no parsear a Date).

## Casos de prueba (calendario-mes.funcion.spec.ts)
- Mes normal: 6 semanas × 7 días = 42 celdas; primer día del mes cae en la columna correcta (lunes=0).
- Sesión en día X → aparece en la celda de ese `fecha`, no en adyacentes.
- Día sin sesiones → `sesiones: []`.
- Fin de mes / días de arrastre (del mes anterior/siguiente) marcados `delMes=false`.
- Febrero (28/29 días) y mes que empieza en domingo (arrastre máximo).
- Varias sesiones mismo día → todas en el mismo día, orden estable.
- `hoy=true` solo en la celda cuya `fecha` == hoy.
