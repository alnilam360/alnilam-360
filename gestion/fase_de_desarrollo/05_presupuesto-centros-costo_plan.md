# Plan 05 — Presupuesto centros de costo

> Fecha: 2026-11-13 · Tracker: [gestion/tracker/05_presupuesto-centros-costo.md](../tracker/05_presupuesto-centros-costo.md)

## Objetivo
Distribuir los **gastos** por **centro de costo / área / proyecto** (enfoque Alegra) para que cada empresa
vea en qué centro se va el presupuesto. CRUD de centros por empresa, selector opcional en las capturas de
gasto, y un desglose "Por centro" en el Resumen.

## Enfoque arquitectónico
- **No romper** `get_presupuesto_resumen` (contrato vigente): el desglose por centro va en una **RPC nueva**
  `get_presupuesto_centros(p_periodo_id)`, dueña única de esa agregación. (rpc-y-calculos)
- Centro **opcional** (columna nullable `centro_costo_id`): filas existentes quedan "Sin centro"; FK `ON DELETE SET NULL`
  (borrar un centro NO borra gastos, revierten a Sin centro). (datos: cambio no destructivo)
- Alcance v1: **movimiento (gastos) + cuenta_por_pagar**. Nómina/recaudo quedan fuera (fase posterior) — se documenta.
- Tenant por `empresa_id`, RLS fail-closed, mismo patrón del núcleo (4 policies por operación). (rls-y-seguridad, multi-empresa)
- Centro CRUD en **service nuevo** `presupuesto-centro.service.ts` (core) para no pasar `presupuesto.service.ts` de 200 líneas. (codigo-limpio)
- Reparto: Opus diseña/revisa; **capa-datos (Sonnet)** migración+RLS+RPC+modelos+service; **cliente-web (Sonnet)** página+menú+selectores+sección Resumen. Secuencial: BD→UI.
- Migración a prod = **irreversible ⇒ OK explícito** antes de `apply_migration`. (migraciones-flujo)

## Archivos a crear/modificar
BD / contrato (capa-datos):
- `database/migrations/2026_11_13_02_presupuesto_centro_costo.sql` (NUEVA, idempotente).
- `src/app/core/models/presupuesto.model.ts` — interface `PresupuestoCentroCosto`, `centro_costo_id` en Movimiento/CxP, type `ResumenCentro`.
- `src/app/core/services/presupuesto-centro.service.ts` (NUEVO) — CRUD centros + `getResumenCentros(periodoId)` (RPC).
- `src/app/core/services/presupuesto.service.ts` — añadir `centro_costo_id` a COLS_MOV y COLS_CXP.
UI (cliente-web):
- `src/app/modules/presupuesto/pages/centros-costo/*` (NUEVA, CRUD estilo socios).
- `src/app/modules/presupuesto/presupuesto.module.ts` — declaración + ruta.
- `src/app/core/models/menu.model.ts` — item `pres-centros` bajo 'presupuesto'.
- `gastos` y `cuentas-por-pagar` (component .ts/.html) — selector de centro en el form + columna Centro en la tabla.
- `resumen` (.ts/.html) — sección "Por centro de costo" (tabla centro | presupuestado | ejecutado | variación).

## Cambios de BD / SQL / RLS
Migración `2026_11_13_02_presupuesto_centro_costo.sql`:
1. `CREATE TABLE IF NOT EXISTS presupuesto_centro_costo` (id uuid PK, empresa_id FK empresas ON DELETE CASCADE, nombre TEXT NOT NULL, codigo TEXT, activo BOOL default true, created_at/updated_at, UNIQUE(empresa_id, nombre)). Index empresa_id.
2. `ALTER TABLE presupuesto_movimiento ADD COLUMN IF NOT EXISTS centro_costo_id UUID REFERENCES presupuesto_centro_costo(id) ON DELETE SET NULL`. Index.
3. Igual en `presupuesto_cuenta_por_pagar`. Index.
4. `ENABLE ROW LEVEL SECURITY` + 4 policies (cond `empresa_id = (SELECT get_my_empresa_id()) OR (SELECT is_admin())`) vía DO-block IF NOT EXISTS.
5. RPC `get_presupuesto_centros(p_periodo_id uuid)` jsonb, SECURITY DEFINER, `search_path=public,pg_temp`, fail-closed (valida pertenencia del periodo, NULL si otra empresa). Agrupa por `centro_costo_id` sumando presupuestado/ejecutado de movimiento ∪ cxp; NULL → nombre 'Sin centro'. `REVOKE EXECUTE ... FROM PUBLIC, anon; GRANT ... TO authenticated`.
6. Idempotente: IF NOT EXISTS / CREATE OR REPLACE / DO-block. Advisor `security` tras aplicar.

## Reglas de negocio
- Agregación por centro: `presupuestado = SUM(presupuestado)`, `ejecutado = SUM(ejecutado)` sobre movimiento+cxp del periodo, agrupado por centro. `variacion = ejecutado - presupuestado` (se calcula en cliente con la función pura ya existente).
- Montos BIGINT ≥ 0. Centro es por empresa; un gasto solo referencia centros de su empresa (garantizado por RLS + que el selector solo lista los suyos).

## Casos de prueba
- RPC: periodo con 2 gastos centro A (presup 100/ejec 80) + 1 gasto sin centro (presup 50/ejec 50) + 1 cxp centro A (presup 30/ejec 30) => [{A: presup 130, ejec 110}, {Sin centro: presup 50, ejec 50}]. Suma por centro cuadra con total movimiento+cxp del resumen.
- RPC periodo de otra empresa / inexistente => NULL.
- Borrar centro con gastos => gastos quedan centro_costo_id NULL (no se borran).
- CRUD centro: nombre duplicado en misma empresa => error de UNIQUE (pintar mensaje real).
