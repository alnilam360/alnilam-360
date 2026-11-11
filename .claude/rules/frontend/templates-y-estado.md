---
paths:
  - "src/app/**"
---
# Templates y estado

- **Nunca** un getter que devuelve un array/objeto **nuevo** llamado desde el template: dispara bucle infinito de change detection. Calcula en el handler, en un campo, o con `computed()`.
- `@for`/`*ngFor` con `trackBy` por **id estable**, no por índice.
- Botón de acción **deshabilitado mientras el request está en vuelo** (evita doble submit).
- Suscripciones y canales Realtime de Supabase **siempre cerrados** en `ngOnDestroy` (o `takeUntilDestroyed`).

**Por qué:** un `get filtrados() { return this.items.filter(...) }` usado en `*ngFor` recreaba el array en cada ciclo y congelaba la pantalla con 100% de CPU.
