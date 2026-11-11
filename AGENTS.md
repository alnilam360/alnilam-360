# AGENTS.md — Alnilam 360

> Este archivo describe el modelo de trabajo con agentes. La **fuente de verdad** operativa es [`CLAUDE.md`](./CLAUDE.md) y las reglas en `.claude/rules/`. El protocolo de orquestación se define una sola vez en [`.claude/skills/orquestar/SKILL.md`](./.claude/skills/orquestar/SKILL.md).

SG-SST (Colombia). **Ionic 8 + Angular 20 (NgModules) + Tailwind 3 + PrimeNG 19 + Capacitor 8**; **Supabase** (Postgres/Auth/RLS/RPC/Storage) operado por **MCP** (sin CLI local). Multi-empresa por `empresa_id`. Dominio en español, técnico en inglés.

## Modelo de agentes (3 niveles)

| Nivel | Rol | Modelo | Alcance | Restricción |
| :-- | :-- | :-- | :-- | :-- |
| **N0** | Sesión principal / orquestador | Opus | Plan, tracker, contrato versionado, reparto, decisiones, fusión de informes | **No escribe código de implementación** |
| **N1** | `capa-datos` | Sonnet | `database/migrations/**`, `database/seeds/**`, modelos TS afectados | No toca UI/estilos |
| **N1** | `cliente-web` | Sonnet | `src/app/**`, estilos | No escribe SQL ni toca `database/**` |
| **N1** | `cliente-movil` | Sonnet | Capacitor/nativo, `capacitor.config.ts` | — |
| **N1** | `relevador` | Haiku | Inventarios de **solo lectura** (`ruta:línea`) | No edita, no decide seguridad/aritmética |
| **N2** | `verificador` | Opus (inherit) | Build/lint/tests + conformidad con el contrato | **No edita**, solo reporta |

Definición de cada agente: `.claude/agents/<nombre>.md`.

## Principios

1. **Segregación de funciones:** un archivo = un dueño por sesión; si otro lo necesita, lo reporta como `pendiente`, no lo pisa.
2. **Contrato explícito primero:** tablas/columnas, firmas de RPC, tipos y vectores dorados en `gestion/fase_de_desarrollo/NN_<slug>_expediente.json`; cambiarlo sube `version` y re-despacha solo a quien lo consume.
3. **Pista de datos en serie, clientes después:** migración → RLS → funciones → modelos TS → verificar; luego el cliente consume.
4. **Cero regresiones:** `verificador` intenta refutar que la tarea está bien (RLS y aislamiento entre empresas incluidos) antes de cerrar.
5. **Comunicación inter-agente** por `<paquete>`/`<informe>` (ver la skill `orquestar`). Un especialista nunca hace `git add`/`commit`.

## Cuándo orquestar
Tarea que toca **≥ 2 especialistas o ≥ 4 archivos** ⇒ orquestar. Si no, un solo especialista (igual Sonnet) con brief mínimo.

> Nota: el modelo anterior de 6 agentes conceptuales (Orquestador/Arquitecto/Backend/Frontend/Diseñador/QA) fue reemplazado por este esquema N0/N1/N2.
