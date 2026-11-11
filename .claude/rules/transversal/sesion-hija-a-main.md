# Sesiones hijas / worktrees → main

- Para trabajar otra rama en paralelo: `git worktree add ../alnilam-<rama> <rama>` (nunca cambiar de rama en el checkout compartido con otra sesión activa).
- Al terminar una sesión hija, la **sesión madre** une su rama a `main` en un worktree temporal con `git merge --no-ff`, **verifica el resultado unido** (build + suite completa headless) y recién ahí hace `--ff-only` en el checkout principal.
- **Nunca** dejar un merge a medio resolver en el checkout compartido.
- Cada ruta tiene **un solo dueño** por sesión (ver `.claude/skills/orquestar/SKILL.md`); si otra sesión necesita tocarla, se coordina, no se pisa.

**Por qué:** un merge con conflictos abierto en el checkout compartido rompió el build para todas las sesiones a la vez.
