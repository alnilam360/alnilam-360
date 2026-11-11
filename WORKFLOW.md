# WORKFLOW — Alnilam 360

El protocolo de trabajo y comunicación inter-agente se define **una sola vez** en:

- **Orquestación y protocolo `<paquete>`/`<informe>`:** [`.claude/skills/orquestar/SKILL.md`](./.claude/skills/orquestar/SKILL.md)
- **Modelo de agentes (N0/N1/N2):** [`AGENTS.md`](./AGENTS.md)
- **Reglas de trabajo (mentalidad, git, deploy):** [`CLAUDE.md`](./CLAUDE.md) y `.claude/rules/`
- **Mapa del repo y comandos:** [`docs/mapa-repo.md`](./docs/mapa-repo.md)

## Ciclo de un requerimiento

1. **Plan + tracker:** `node tools/plan/nuevo-plan.mjs <slug> "<Título>"`.
2. **Contrato** (si toca BD/tipos): `gestion/fase_de_desarrollo/NN_<slug>_expediente.json` con firmas, tipos y vectores dorados.
3. **Despacho** a N1 por `<paquete>` (datos en serie → clientes después).
4. **Verificación** por N2 (`verificador`): build + lint + tests headless + RLS/aislamiento.
5. **Commit** local al terminar y verificar (sin atribución de IA). Push/PR/merge/deploy/migraciones en prod requieren **OK explícito**.

> El modelo anterior de 6 agentes (Orquestador/Arquitecto/Backend/Frontend/Diseñador/QA) y su protocolo extenso fueron reemplazados por lo anterior.
