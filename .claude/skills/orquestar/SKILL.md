---
name: orquestar
description: Procedimiento de orquestación jerárquica (N0/N1/N2) para Alnilam 360. Define el protocolo <paquete>/<informe> una sola vez; los agentes lo referencian. Úsalo cuando una tarea toca ≥ 2 especialistas o ≥ 4 archivos.
---

# Orquestar (N0 → N1 → N2)

## Niveles
- **N0 — sesión principal (Opus):** plan, tracker, **contrato versionado**, reparto, decisiones y fusión de informes. **No escribe código.**
- **N1 — especialistas (Sonnet) + `relevador` (Haiku, solo lectura):** implementan o inventarían dentro de sus rutas.
- **N2 — `verificador` (hereda Opus, no edita):** build, tests y conformidad con el contrato; intenta **refutar** que la tarea está bien.

## Cuándo orquestar
- Tarea que toca **≥ 2 especialistas o ≥ 4 archivos** ⇒ orquestar.
- Si no, **un solo especialista** (igual Sonnet) con un brief mínimo. No montar andamiaje para algo pequeño.

## Reglas del protocolo
- **Un archivo, un dueño:** cada ruta pertenece a un solo especialista; si otro la necesita, lo reporta como `pendiente`, no la toca.
- **Contrato primero:** tablas/columnas, firmas de RPC, tipos (nombre + nulabilidad), cálculos con su redondeo y **vectores dorados** se fijan en `gestion/fase_de_desarrollo/NN_<slug>_expediente.json`. Cambiarlo **sube `version`** y re-despacha solo a quien lo consume.
- **Pista datos en serie:** migración → RLS → funciones → actualizar modelos TS → verificar con `mcp__supabase__execute_sql`/`get_advisors`. **Pista clientes después**, consumiendo el contrato y los modelos ya actualizados.
- Un especialista **nunca** hace `git add`/`commit`, no improvisa decisiones, corre su validación y **copia la salida real**.
- Informe inválido ⇒ vuelve al **mismo** agente (`SendMessage`); máx. **2 reintentos** y se escala a N0.

## `<paquete>` (lo único que recibe un Agent N1)
```
<paquete>
tarea: <una frase>
archivos_crear: [ruta, ...]
archivos_modificar: [ruta:ini-fin, ...]
contrato: <tablas/firmas/tipos/vectores o ref al expediente NN_<slug>_expediente.json#version>
reglas: [.claude/rules/...]
validacion: <comando(s) exacto(s) a correr>
criterio_terminado: <qué cuenta como hecho>
</paquete>
```

## `<informe>` (lo único que devuelve) — JSON, ≤ 4000 caracteres
```
<informe>{
  "estado": "hecho|parcial|bloqueado",
  "resumen": "<2-3 frases>",
  "archivos": ["ruta", ...],
  "firmas": {"<simbolo>": "<firma/tipo>"},
  "validacion": "<cola real de la salida del comando>",
  "pendientes": [{"tipo":"decision|bloqueo|riesgo","detalle":"..."}],
  "hallazgos": ["ruta:linea — <nota>"]
}</informe>
```

## Especialistas
- `capa-datos` (Sonnet) — `database/migrations/**`, `database/seeds/**`, modelos TS afectados.
- `cliente-web` (Sonnet) — `src/app/**`, estilos.
- `cliente-movil` (Sonnet) — Capacitor/nativo.
- `relevador` (Haiku) — inventarios de solo lectura, salida `ruta:línea`.
- `verificador` (Opus) — valida y refuta; revisa especialmente RLS y aislamiento entre empresas.

> No hay Edge Functions en el repo: no existe especialista de edge functions. Si se crean, añádelo entonces.
