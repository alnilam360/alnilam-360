---
paths:
  - "database/**"
  - "src/app/core/services/**"
---
# RPC y cálculos de negocio

- Cálculos de negocio e indicadores (frecuencia/severidad de accidentalidad, cumplimiento de estándares mínimos Res. 0312, matriz de riesgo IPERC) viven en **funciones SQL/vistas con UN solo dueño**; el cliente **consume, no recalcula**.
- Documentar en la propia migración: fórmula, **constante/base** (p. ej. K de siniestralidad), redondeo y **vectores de prueba** (entrada → salida esperada).
- Antes de crear una función, verificar en el repo si el cálculo ya existe (migraciones `*_indicadores_*`, servicios `indicadores-*`): **duplicar dio números distintos**.
- Cambiar una fórmula ⇒ nueva migración + actualizar los vectores + avisar a los consumidores TS.

**Por qué:** el mismo indicador calculado en el cliente y en SQL daba cifras distintas por redondeos diferentes; la fórmula debe tener un único dueño en la BD.
