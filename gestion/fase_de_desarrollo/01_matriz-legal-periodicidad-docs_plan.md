# Plan 01 — Matriz Legal: periodicidad por corte y documentos de cumplimiento

> Fecha: 2026-11-11 · Tracker: [gestion/tracker/01_matriz-legal-periodicidad-docs.md](../tracker/01_matriz-legal-periodicidad-docs.md)
> Contrato (vectores dorados): `01_matriz-legal-periodicidad-docs_expediente.json`

## Objetivo
1. La Matriz Legal deja de ser solo anual: cada corte se monta con **periodicidad** (MENSUAL/TRIMESTRAL/SEMESTRAL/ANUAL) + número dentro del año.
2. Adjuntar un **documento certificante** (PDF/Excel) por corte **y** una pestaña de historial; en auditoría un botón lleva al documento. Bucket **privado** + URL firmada, aislado por empresa.

## Enfoque arquitectónico
- Pista de datos en serie (capa-datos) → pista cliente (cliente-web). Un archivo = un dueño.
- Reglas: `supabase/migraciones-flujo`, `supabase/rls-y-seguridad`, `supabase/rpc-y-calculos`, `supabase/tipos-y-contratos`, `transversal/multi-empresa-alcance`, `frontend/formularios-sgsst`, `frontend/ionic-tailwind`, `frontend/templates-y-estado`.
- Compatibilidad: filas existentes de `matriz_legal_evaluacion` (solo año) ⇒ `periodicidad='ANUAL'`, `numero_periodo=1` por DEFAULT (idempotente, no rompe datos).

## Archivos a crear/modificar
**capa-datos (dueño):**
- `database/migrations/2026_11_11_01_matriz_legal_periodicidad.sql` (crear)
- `database/migrations/2026_11_11_02_matriz_legal_documentos.sql` (crear: tabla + bucket privado + policies)
- `src/app/core/models/matriz-legal.model.ts` (modificar: enum `Periodicidad`, campos en Row/Upsert/Resumen, interfaz `MatrizLegalDocumento`, helpers de número por periodicidad)

**cliente-web (dueño):**
- `src/app/core/services/matriz-legal.service.ts` (modificar: RPC con nuevos params; upload/listar/signed URL/eliminar documento)
- `src/app/modules/matriz-legal/pages/matriz/matriz-legal.component.ts|html|scss` (modificar: selector periodicidad+número; botón "Ver documento" del corte; pestaña Documentos)
- `src/app/core/models/matriz-legal.model.spec.ts` (modificar: casos de número por periodicidad)

## Cambios de BD / SQL / RLS
- `matriz_legal_evaluacion`: + `periodicidad TEXT NOT NULL DEFAULT 'ANUAL' CHECK (IN MENSUAL/TRIMESTRAL/SEMESTRAL/ANUAL)`, + `numero_periodo SMALLINT NOT NULL DEFAULT 1` con CHECK de rango por periodicidad (1–12 / 1–4 / 1–2 / 1). Reemplazar UNIQUE por `(empresa_id, componente_id, periodo, periodicidad, numero_periodo)`.
- RPC `get_matriz_legal_resumen`: `DROP` del `(INTEGER)` y recrear `(p_periodo INTEGER, p_periodicidad TEXT DEFAULT 'ANUAL', p_numero SMALLINT DEFAULT 1)`; filtra el LEFT JOIN por los tres. SECURITY INVOKER, search_path fijo.
- `matriz_legal_documento`: tabla nueva (empresa_id, periodo/periodicidad/numero NULLABLES = documento general, archivo_path, archivo_nombre, mime_type, tamano_bytes, version, fecha_revision, subido_por, timestamps). RLS por empresa (4 policies) + trigger updated_at.
- Storage: bucket privado `matriz-legal-docs` (`insert ... on conflict do nothing`); policies en `storage.objects` por empresa usando `(storage.foldername(name))[1] = get_my_empresa_id()::text`. Ruta: `{empresa_id}/{periodo}/{timestamp}_{archivo}`.
- `get_advisors(security)` tras aplicar.

## Reglas de negocio
- Número válido por periodicidad: ANUAL⇒1; SEMESTRAL⇒1..2; TRIMESTRAL⇒1..4; MENSUAL⇒1..12. Validar en cliente (UX) y en BD (CHECK).
- % de cumplimiento se mantiene idéntico (pctCumple/EnProceso/NoCumple sobre total del dominio); **no cambia la aritmética**, solo el filtro de corte.
- Documento: tipos permitidos PDF/XLSX/XLS; validar tipo y tamaño antes de subir; aislamiento por empresa fail-closed.

## Casos de prueba
- Modelo: `numeroValido(periodicidad, n)` para bordes (0, 1, 2, 4, 12, 13, null) de cada periodicidad; `etiquetaCorte` (ej. "Q2 2026", "Jun 2026", "2026").
- RPC/datos (via `execute_sql`): corte TRIMESTRAL Q2 no mezcla conteos de ANUAL mismo año; guarda /0 intacta; fila preexistente aparece como ANUAL/1.
- RLS: documento de empresa A no visible a empresa B (resultado vacío, no 403); signed URL solo para archivos de la empresa propia.
