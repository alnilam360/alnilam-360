---
paths:
  - "**/*.spec.ts"
---
# Suite verde (y la deuda actual)

- **No se crean fallos «conocidos» nuevos.** Un rojo nuevo que tú introduces se arregla antes de commitear.
- **Deuda pre-existente registrada (al 2026-11-11), no la tapes ni la cuentes como tuya:**
  - `ng test`: **1 fallo** base — `AppComponent should have urls` (`src/app/app.component.spec.ts`, test del starter de Ionic, desactualizado). 50 pasan, 1 skip.
  - `npm run lint`: **106 errores** pre-existentes (mayoría `@angular-eslint/prefer-inject`; + un parse error en `src/assets/email-templates/invite-user.html`).
- Gate real para tu tarea: **cero rojos NUEVOS** y **cero errores de lint NUEVOS en los archivos que tocaste**. No bloquees por la deuda de arriba; tampoco la aumentes.
- Antes de commitear: corre la suite headless completa sin filtros y confirma que el único fallo sigue siendo el base.

**Por qué:** tratar los 106 lint + 1 test heredados como bloqueantes paralizaría todo commit; hay que medir el delta propio, no el estado absoluto.
