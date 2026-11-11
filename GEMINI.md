# GOBERNANZA MULTI-AGENTE (ALNILAM 360)

> El esquema anterior de 6 agentes (Orquestador/Arquitecto/Backend/Frontend/Diseñador/QA) fue **reemplazado** por un modelo de 3 niveles N0/N1/N2. La fuente de verdad es [`CLAUDE.md`](./CLAUDE.md) y `.claude/rules/`.

SG-SST (Colombia). **Ionic 8 + Angular 20 (NgModules) + Tailwind 3 + PrimeNG 19 + Capacitor 8**; **Supabase** operado por **MCP** (sin CLI local). Multi-empresa por `empresa_id`. Dominio en español, técnico en inglés.

## Documentación maestra
- **Modelo de agentes (N0/N1/N2):** [AGENTS.md](./AGENTS.md)
- **Protocolo `<paquete>`/`<informe>`:** [.claude/skills/orquestar/SKILL.md](./.claude/skills/orquestar/SKILL.md)
- **Reglas (mentalidad, git, deploy, facetas):** [CLAUDE.md](./CLAUDE.md) y `.claude/rules/`
- **Mapa del repo y comandos:** [docs/mapa-repo.md](./docs/mapa-repo.md)
- **Flujo de un requerimiento:** [WORKFLOW.md](./WORKFLOW.md)

## Niveles (resumen)
- **N0 (Opus, sesión principal):** plan, tracker, contrato, reparto, revisión. No escribe código.
- **N1 (Sonnet):** `capa-datos` (BD/migraciones/RLS/RPC + modelos TS), `cliente-web` (`src/app/**`+estilos), `cliente-movil` (Capacitor). `relevador` (Haiku, solo lectura).
- **N2 (Opus):** `verificador` — build/lint/tests + conformidad y RLS; no edita, solo reporta.

Un archivo = un dueño por sesión. Contrato primero. Datos en serie → clientes después. Sin atribución de IA en commits/PR; push/PR/merge/deploy/migraciones en prod requieren OK explícito.
