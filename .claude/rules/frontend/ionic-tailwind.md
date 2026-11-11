---
paths:
  - "src/app/**"
  - "src/**/*.scss"
  - "src/**/*.css"
  - "tailwind.config.js"
---
# Ionic + Tailwind + PrimeNG

- **Reparto:** estructura y componentes de UI con `ion-*` (header, content, modal, item, inputs) y PrimeNG para tablas/overlays complejos; **Tailwind para layout y utilidades** (spacing, flex/grid, tipografía). No reimplementar con utilidades lo que un `ion-*` ya da.
- Tokens de color/espaciado en **un solo lugar**: variables CSS de Ionic (`src/theme/variables.scss`) mapeadas en `tailwind.config.js`. No hardcodear hex sueltos.
- Responsive obligatorio: tablas con scroll propio, objetivos táctiles ≥ 40 px.
- Modo claro/oscuro: el repo tiene `ThemeService`; respetar sus clases/variables, no fijar colores que ignoren el tema.
- Sin estilos en línea ni `!important` salvo documentado con su porqué.

**Por qué:** colores hex repetidos en cada componente rompían el modo oscuro; centralizarlos en variables de tema lo arregló de una vez.
