# Una sesión = un plan

- Una sesión trabaja **un solo plan**. Cerrado el plan, la tarea siguiente va en **sesión nueva**; no retomar sesiones viejas.
- `autoCompactWindow: 300000` (fijado en `.claude/settings.json`).
- Pedir informes cortos y **filtrar salidas** de comandos ruidosos (`| tail`, `| grep`) para no quemar contexto.
- Un bloque de tracker cerrado (sin `[ ]` ni `[~]`) y commiteado se mueve **sin editar** a `gestion/tracker_historico/tracker_AAAA-MM.md`.

**Por qué:** arrastrar varios planes en una misma sesión larga agotaba el contexto a mitad de camino y obligaba a re-derivar decisiones ya tomadas.
