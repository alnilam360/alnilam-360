# Plan 07 — Presupuesto tendencia y forecast multimes

> Fecha: 2026-11-14 · Tracker: [gestion/tracker/07_presupuesto-tendencia.md](../tracker/07_presupuesto-tendencia.md)

## Objetivo
Ver la evolución del presupuesto mes a mes (saldo final, recaudo, ejecutado) y una **proyección** simple del
próximo mes. Sección "Tendencia" en el Resumen. Patrón de apps serias (rolling forecast).

## Enfoque arquitectónico
- **No duplicar la fórmula**: la RPC de tendencia **llama a `get_presupuesto_resumen` por periodo** dentro de
  un loop plpgsql; `get_presupuesto_resumen` sigue siendo el único dueño del cálculo. (rpc-y-calculos)
- Una sola llamada HTTP (no N+1 en cliente). (consultas-eficientes)
- **Forecast = función pura** en cliente (`funciones/`), testeable, sin SQL. Regresión lineal simple (mínimos
  cuadrados) sobre saldo_final; <2 puntos ⇒ null.
- Gráfica con **barras Tailwind** (mismo patrón que `monthly-chart`); **sin dependencia nueva**.
- Migración = solo `CREATE OR REPLACE FUNCTION` (sin cambio de esquema). Aplicar a prod = **OK explícito**.
- Reparto: Opus diseña/revisa; **capa-datos** RPC+modelo+service; **cliente-web** función pura+spec+sección Resumen.

## Archivos a crear/modificar
BD/contrato (capa-datos):
- `database/migrations/2026_11_14_01_presupuesto_tendencia.sql` (NUEVA): RPC `get_presupuesto_tendencia`.
- `core/models/presupuesto.model.ts`: `TendenciaMes { mes; saldo_inicial; recaudo; total_ejecutado; saldo_final }`.
- `core/services/presupuesto.service.ts`: `getTendencia(empresaId, nMeses=6): Promise<TendenciaMes[]>` (rpc).
UI (cliente-web):
- `modules/presupuesto/funciones/resumen.funcion.ts` (+spec): `proyeccionSaldo(saldos: number[]): number | null`.
- `modules/presupuesto/pages/resumen/resumen.component.{ts,html}`: sección "Tendencia (6 meses)".

## Cambios de BD / SQL / RLS
RPC `get_presupuesto_tendencia(p_empresa_id uuid, p_n_meses int)` jsonb, SECURITY DEFINER, `search_path=public,pg_temp`:
1. Fail-closed: si NOT (p_empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin())) ⇒ RETURN NULL.
2. Loop sobre los últimos N periodos de la empresa (`ORDER BY mes DESC LIMIT p_n_meses`), para cada uno llama
   `get_presupuesto_resumen(periodo.id)` y extrae del jsonb: mes, saldo_inicial, recaudo, total_ejecutado, saldo_final.
3. Devuelve array en orden **ascendente** por mes (cronológico), `[]` si no hay periodos.
4. `REVOKE ... FROM PUBLIC, anon; GRANT ... TO authenticated`. COMMENT con fórmula (delega en resumen) + vector.

## Reglas de negocio
- `proyeccionSaldo(saldos)`: regresión lineal mínimos cuadrados con x=0..n-1; proyecta x=n. `saldos.length < 2` ⇒ null.
  Redondeo a entero (COP). Documentar que es proyección lineal simple, no modelo estadístico.
- La tendencia es **por empresa**, independiente del periodo seleccionado (se carga al cambiar empresa).

## Casos de prueba (spec proyeccionSaldo)
- [100, 200, 300] ⇒ 400 (pendiente 100). [300, 200, 100] ⇒ 0. [100,100,100] ⇒ 100. [] ⇒ null. [500] ⇒ null.
- No lineal: [100, 150, 210] ⇒ 263 (regresión: slope 55, intercept 98.333, x=3 ⇒ 263.33→263).
