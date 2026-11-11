---
paths:
  - "src/app/**"
---
# Change detection

- Declara `changeDetection` **explícito** en todo componente.
- `ChangeDetectionStrategy.Default` cuando hay estado mutable o `subscribe` que muta campos. `OnPush` solo para presentacionales o componentes basados en señales/`async` pipe.
- Síntoma **«200 en Network pero la UI queda en Cargando»** ⇒ mirar primero esto: datos llegaron pero la vista no se refrescó (OnPush sin señal, o mutación fuera de zona).
- Con Realtime/promesas fuera de Angular, forzar el refresco con señales o `ChangeDetectorRef`, no con `setTimeout`.

**Por qué:** un componente `OnPush` que mutaba un array por `subscribe` mostraba «Cargando» con la data ya en memoria; el request salía 200 pero la vista nunca se actualizaba.
