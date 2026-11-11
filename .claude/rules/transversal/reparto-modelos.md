# Reparto de modelos — Opus piensa, Sonnet codifica, Haiku barre

- **Opus (N0 / sesión principal):** investigación fina, diseño/contrato, plan, tracker, revisión, verificación y pulido final de UI. **No escribe código de implementación.**
- **Sonnet (N1):** SIEMPRE quien escribe código (`model: "sonnet"` en `Agent`). Recibe un brief autocontenido: archivos exactos, contrato, reglas que aplican, criterio de terminado y validación a correr.
- **Haiku:** barridos de lectura masiva e inventarios (`Explore`/`relevador`, `model: "haiku"`), salida fija con `ruta:línea`, sin opiniones. **No decide** seguridad, RLS, permisos ni aritmética: trae evidencia y Opus la verifica por muestreo.
- **Decisión no cubierta** por el brief ⇒ Sonnet/Haiku la dejan en `pendientes`, **no la improvisan**.
- Opus revisa todo antes de dar por cerrado. Para tareas que tocan ≥ 2 especialistas o ≥ 4 archivos, orquestar según `.claude/skills/orquestar/SKILL.md`.

**Por qué:** mezclar razonamiento y tecleo en un solo modelo encarece y degrada; separar niveles mantiene el contexto principal limpio y barato (incidente: sesiones largas que se quedaban sin contexto a mitad de un plan).
