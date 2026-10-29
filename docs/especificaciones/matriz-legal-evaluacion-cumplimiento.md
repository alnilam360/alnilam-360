# 📐 Especificación Técnica: Matriz Legal — Evaluación de Cumplimiento (rehecho)

- **TCK asociado**: TCK-ML-001 (rehacer desde cero)
- **Fecha**: 2026-10-28
- **Fuente**: `MATRIZ LEGAL 2026.xlsx` → pestaña **`EVALUACIÓN CUMPLIMIENTO`** (las demás pestañas se ignoran)

## 1. Resumen Funcional

El usuario necesita un **llenado ágil** de la matriz de evaluación de cumplimiento legal, **sin
depender** de capturar requisitos individuales en las pestañas por componente (agua, energía,
aire, ATEL, etc.). Se captura directamente el **conteo por estado** de cada componente; la app
calcula totales y porcentajes y muestra **la tabla y la gráfica tal cual el Excel**.

> **Cambio vs módulo actual**: se elimina el modelo de requisitos individuales
> (`matriz_legal_requisitos`, `catalogo_tipo_norma`, `config`, páginas `catalogos`,
> `requisitos-list`, `requisito-form`, `evaluacion`). Se conserva el catálogo de componentes.

### Reglas de negocio (derivadas del Excel)
- Dos dominios: **SG-SST / LABORAL** (10 componentes) y **AMBIENTAL** (5 componentes).
- Tres estados por componente: **CUMPLE**, **EN PROCESO**, **NO CUMPLE** (conteos enteros ≥ 0).
- **TOTAL por componente** = CUMPLE + EN PROCESO + NO CUMPLE.
- **Total del dominio** = Σ totales de sus componentes (`C8` = Σ SST, `N8` = Σ Ambiental en el Excel).
- **% por estado y dominio** = Σ(estado en el dominio) / total del dominio.
  - `M4 = SUM(C4:L4)/C8`, `M5 = SUM(C5:L5)/C8`, `M6 = SUM(C6:L6)/C8` (SST).
  - `S4/S5/S6` análogo con `N8` (Ambiental).
- **% CUMPLIMIENTO (titular)** = % del estado CUMPLE (`M7 = M4`, `S7 = S4`).
- **Guarda división por cero**: si el total del dominio = 0 → % = 0 (evitar `NaN`/`Infinity`).

### Catálogo fijo de componentes (orden del Excel, fila 3)
- **SG_SST**: `ATEL`, `RIESGO BIOLÓGICO`, `RIESGO FÍSICO`, `RIESGO ELÉCTRICO`, `EMERGENCIAS`,
  `PSICOSOCIAL`, `VIAL`, `SGRP`, `OTRA NORM SST`, `LABORAL`.
- **AMBIENTAL**: `AGUA`, `ENERGIA`, `AIRE`, `RESIDUOS`, `OTRA NORM AMBIENTAL`.

### Gráfica (replicar exacto)
- **Tipo**: barras agrupadas (clustered BarChart).
- **Título**: `NIVEL DE CUMPLIMIENTO LEGAL SST`.
- **Categorías (eje X)**: los 10 componentes **SG-SST** (C3:L3). *(Ambiental no entra en esta gráfica, igual que el Excel.)*
- **Series (3)**: `CUMPLE`, `EN PROCESO`, `NO CUMPLE` → valores = conteos por componente.

## 2. Análisis de Datos Fuente (pestaña EVALUACIÓN CUMPLIMIENTO)

| Celda Excel | Significado | Origen en el Excel | Origen en la app |
| :--- | :--- | :--- | :--- |
| C4:L6 | conteos SST por componente×estado | `COUNTIF(<hoja>!…,"ESTADO")` | **captura directa del usuario** |
| N4:R6 | conteos Ambiental | `COUNTIF(...)` | **captura directa del usuario** |
| C7:L7, N7:R7 | TOTAL por componente | `SUM` | calculado |
| C8 / N8 | total dominio SST / Ambiental | `SUM(C7:L7)` / `SUM(N7:R7)` | calculado |
| M4:M6 / S4:S6 | % por estado | `SUM/…` | calculado |
| M7 / S7 | % cumplimiento titular | `=M4` / `=S4` | calculado |

> Las fórmulas `COUNTIF` del Excel **no se portan**: eran la dependencia de otras pestañas que
> el usuario quiere eliminar. La app guarda los conteos y recalcula.

## 3. Diseño para @Backend (Supabase)

Reutiliza `matriz_legal_componentes` (ya existe). **Reemplaza** el resto del módulo.

### Nueva migración `2026_10_28_01_matriz_legal_evaluacion_rework.sql`
1. **DROP** (idempotente) de lo que ya no se usa: `matriz_legal_requisitos`,
   `catalogo_tipo_norma`, `matriz_legal_config` (y sus políticas/índices).
2. **Tabla de conteos** (una fila por empresa × componente × **periodo**):
   ```
   matriz_legal_evaluacion (
     id            UUID PK default gen_random_uuid(),
     empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
     componente_id UUID NOT NULL REFERENCES matriz_legal_componentes(id) ON DELETE CASCADE,
     periodo       INTEGER NOT NULL CHECK (periodo BETWEEN 2000 AND 2100),  -- año del corte
     cumple        INTEGER NOT NULL DEFAULT 0 CHECK (cumple >= 0),
     en_proceso    INTEGER NOT NULL DEFAULT 0 CHECK (en_proceso >= 0),
     no_cumple     INTEGER NOT NULL DEFAULT 0 CHECK (no_cumple >= 0),
     updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_by    UUID REFERENCES auth.users(id),
     UNIQUE (empresa_id, componente_id, periodo)
   )
   ```
   - Índice en `(empresa_id, periodo)`; trigger `handle_updated_at`.
   - Selector de **periodo** (año) en el frontend; default = año actual.
   - Índice en `empresa_id`; trigger `handle_updated_at`.
3. **RLS** (patrón existente): `SELECT/INSERT/UPDATE/DELETE` where `empresa_id = get_my_empresa_id()` o `is_admin()`. Componentes globales (`empresa_id IS NULL`) legibles por todos.
4. **Vista/RPC de resumen** `get_matriz_legal_resumen(empresa, periodo)` que devuelve por dominio:
   conteos agregados por estado, totales por componente, total dominio y % (con guarda /0).
   Devuelve el shape listo para tabla + gráfica.
5. **Seed**: asegurar que los 15 componentes del catálogo existan como semilla global
   (dominio + nombre + orden) si el seed actual no los cubre.

### Contratos DTO (`src/app/core/models/matriz-legal.model.ts` — reescribir)
```ts
export type DominioMatriz = 'SG_SST' | 'AMBIENTAL';
export type EstadoCumplimiento = 'CUMPLE' | 'EN_PROCESO' | 'NO_CUMPLE';

export interface ComponenteMatriz {
  id: string; dominio: DominioMatriz; nombre: string; orden: number;
}
export interface ConteoComponente {
  componenteId: string; nombre: string;
  cumple: number; enProceso: number; noCumple: number;
  total: number;              // derivado
}
export interface ResumenDominio {
  dominio: DominioMatriz;
  componentes: ConteoComponente[];
  totalDominio: number;
  pctCumple: number; pctEnProceso: number; pctNoCumple: number; // 0..1
}
export interface MatrizLegalResumen {
  sgSst: ResumenDominio;
  ambiental: ResumenDominio;
}
```

## 4. Diseño para @Frontend (Ionic/Angular)

**Una sola página** `matriz-legal` (reemplaza dashboard + 4 páginas actuales):
- **Tabla de captura** estilo Excel: filas = CUMPLE / EN PROCESO / NO CUMPLE / TOTAL / %;
  columnas = componentes por dominio + columna `% CUMPLIMIENTO`. Celdas de los 3 estados son
  **inputs numéricos**; TOTAL y % son de solo lectura y recalculan con Signals (`computed`).
- Bloque SG-SST y bloque Ambiental (dos tablas o una con secciones).
- **Gráfica** de barras agrupadas (3 series CUMPLE/EN PROCESO/NO CUMPLE sobre los 10 componentes
  SST), título `NIVEL DE CUMPLIMIENTO LEGAL SST`. Librería: PrimeNG Chart (Chart.js) o equivalente ya usado en el proyecto.
- Botón **Guardar** (persiste conteos vía servicio → upsert). Estados carga/vacío/error.
- Servicio `matriz-legal.service.ts`: `getResumen()`, `guardarConteos(dominio, filas)`.

## 5. Criterios de Aceptación (para @QA)
- [ ] Solo existe la matriz de evaluación; no hay captura de requisitos individuales ni pestañas por componente.
- [ ] Los 15 componentes aparecen con el orden y nombres del Excel, separados por dominio.
- [ ] Editar un conteo recalcula TOTAL, total de dominio y los 3 % en vivo, sin recargar.
- [ ] % CUMPLIMIENTO titular = % de CUMPLE del dominio; los 3 % suman 100% (±redondeo) cuando total > 0.
- [ ] Total de dominio = 0 ⇒ los % muestran 0% sin `NaN`/`Infinity`.
- [ ] La gráfica es de barras agrupadas, 3 series, 10 componentes SST, título correcto.
- [ ] Guardar persiste y al recargar los valores reaparecen (solo de la empresa del usuario: RLS).
- [ ] Una empresa no ve ni modifica conteos de otra (prueba RLS cruzada).
- [ ] Sin `any`; respuestas tipadas con los DTO; sin errores de consola.

## 6. Decisiones (confirmadas por el usuario 2026-10-28)
1. ✅ **Rehacer desde cero**: se eliminan `matriz_legal_requisitos`, `catalogo_tipo_norma`,
   `matriz_legal_config` y las 4 páginas actuales. La migración `2026_10_23_01_matriz_legal.sql`
   no se aplicó aún en Supabase → DROP de bajo riesgo.
2. ✅ **Histórico por periodo**: la tabla lleva `periodo` (año). UNIQUE
   `(empresa_id, componente_id, periodo)`. El frontend incluye selector de periodo (default = año actual).
