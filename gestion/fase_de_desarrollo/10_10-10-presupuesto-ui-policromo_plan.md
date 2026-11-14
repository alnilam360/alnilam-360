# Plan 10 — Presupuesto UI policromo (patrón Matriz de Indicadores)

> Fecha: 2026-11-14 · Tracker: [gestion/tracker/10_10-10-presupuesto-ui-policromo.md](../tracker/10_10-10-presupuesto-ui-policromo.md)

## Objetivo
Subir el nivel de UI/UX de **todo** el módulo Presupuesto (9 páginas) tomando el patrón visual de
`indicadores/pages/matriz-indicadores`: más profesional y **más variable en iconos y colores**.
Hoy Presupuesto es **monocromo** (todo `brand-primary`, tiles iguales). Objetivo: **policromo semántico**.

## Restricción dura
- **Cambio 100% presentacional.** No se toca lógica, signals, servicios, data-bindings, handlers ni
  aritmética. Solo markup y clases Tailwind. Mismos `{{ }}`, mismos `(click)`, mismos `@if/@for`/`track`.
- Iconos: se mantiene **PrimeNG `pi-*`** (ya en uso en el módulo); la variedad sale del color y de elegir
  el `pi` adecuado por métrica. No migrar a `ion-icon` (churn inútil en 9 páginas).
- No crear SCSS nuevo ni importar estilos internos de otro módulo (regla `arquitectura-modulo`): el look se
  logra con Tailwind inline, como lo hace matriz en sus cards/badges/headers.
- `changeDetection` explícito ya existe en los componentes; no cambiarlo.

## Sistema de diseño (derivado de matriz-indicadores)
- **Paleta semántica** (tiles `bg-{h}-500/10 border border-{h}-500/20 text-{h}-400`): `emerald`=ingreso/
  recaudo/ok/saldo+, `rose`=gasto/sobregasto/vencido/saldo−, `amber`=pendiente/parcial/alerta,
  `sky`/`cyan`=presupuestado/proyección, `violet`/`purple`=acento/centros, `blue`(brand)=totales.
- **Cabecera** (`app-presupuesto-cabecera`, compartida por las 9): pill badge con dot `animate-pulse`
  (“Finanzas · COP”), línea mono con contexto, icono en tile de color. Propaga a todas las páginas.
- **KPI cards**: tile de icono coloreado por métrica + label `uppercase tracking-wider text-[11px]` + valor bold.
- **Table card**: contenedor `rounded-2xl border`; header con `bg-gradient-to-r from-dark-primary/60
  via-dark-primary/40 to-dark-primary/60`, tile de icono + título + badges de conteo; `th` con mini-icono de color.
- **Badges de estado** por dominio (recaudo/CxP/pago/periodo): mapa color+icono (pendiente amber, pagado/
  recaudado emerald, vencido rose, parcial sky). Badge como `<span>` inline con dot.
- **Barras**: reutilizar `app-micro-progress` (shared, standalone) donde aplique; si no, barra inline con color por umbral.

## Fases (serializadas; cada agente lee sus páginas + la referencia matriz)
### F1. Cabecera compartida (cliente-web) — 1 archivo, va primero (propaga)
`components/captura-cabecera.component.ts`: pill badge + dot + tile de icono de color. Mismos `@Input/@Output`.
### F2. Resumen (flagship) — `pages/resumen/resumen.component.html`
7 KPI cards cada una con su color+icono; 3 tablas (rubros, centros, tendencia) con header gradiente,
`th` con iconos, badge Sobregasto ya existe (recolorear), barras de avance con color por umbral.
### F3. Transaccionales — `recaudo`, `gastos`, `cuentas-por-pagar`, `nomina` (html + .ts solo si hay helper de clase de color)
KPI/resumen superior policromo + tabla con header gradiente + badges de estado por dominio.
### F4. Configuración — `socios`, `centros-costo`, `catalogo`, `periodos`
Listas/tarjetas con tiles de color, badges semánticos (activo/inactivo, tipo), header gradiente.

## Validación
- `npm run build -- --configuration=development` compila (solo warning exceljs preexistente).
- `ng test --watch=false --browsers=ChromeHeadlessNoSandbox` igual que antes (único rojo = base AppComponent);
  no debe aparecer rojo nuevo (cambios presentacionales no rompen specs).
- Revisión visual Opus: cada página renderiza, datos y acciones intactos.
- ≤200 líneas/archivo; sin `any`; sin estilos inline hex ni `!important`.
