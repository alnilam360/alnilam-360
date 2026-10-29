# Sistema Multi-Agente ALNILAM 360 — Reglas para Antigravity

Este directorio contiene las reglas de los **6 agentes especializados** que Antigravity
carga como contexto de trabajo para este repositorio.

## Estructura

| Archivo | Activación | Rol |
| :--- | :--- | :--- |
| `rules/00-protocolo-general.md` | **Always On** | Gobernanza, dominios de archivo, protocolo de transición |
| `rules/01-orquestador.md` | Manual | `@Orquestador` — planifica y despacha |
| `rules/02-arquitecto.md` | Manual | `@Arquitecto` — especificación y modelo de datos |
| `rules/03-backend.md` | Manual | `@Backend` — Supabase / PostgreSQL / RLS / DTO |
| `rules/04-frontend.md` | Manual | `@Frontend` — Ionic / Angular / Tailwind / PrimeNG |
| `rules/05-disenador-ui-ux.md` | Manual | `@Diseñador_UI_UX` — auditoría CSS / a11y |
| `rules/06-qa.md` | Manual | `@QA` — pruebas y reporte de bugs |
| `WORKFLOW.md` | Referencia | Pipeline, RACI y formatos de hand-off |

## Pipeline obligatorio

```
Orquestador → Arquitecto → Backend → Frontend → Diseñador UI/UX → QA → Orquestador (entrega)
```

## Cómo invocar los roles en Antigravity

1. **Regla siempre activa**: `00-protocolo-general.md` (`trigger: always_on`) se inyecta en
   cada conversación; el agente siempre conoce las fronteras de rol.
2. **Roles bajo demanda** (`trigger: manual`): escribe `@` en el chat del agente y selecciona
   la regla del rol (p. ej. `@02-arquitecto`) para activar ese rol en el turno actual.
3. **Flujo recomendado**: empieza siempre invocando `@01-orquestador` y describe el
   requerimiento; el Orquestador decide qué roles despachar y en qué orden.

> Las reglas son copia de `.agents/rules/` (usadas por Claude Code y Gemini CLI). Si editas
> un rol, replica el cambio en ambas carpetas para mantener paridad.
