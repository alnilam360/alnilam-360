# Plan 12 — Auditorías e Inspecciones

> Fecha: 2026-11-14 · Tracker: [gestion/tracker/12_auditorias-inspecciones.md](../tracker/12_auditorias-inspecciones.md)

## Objetivo
Construir el módulo **Auditorías e Inspecciones** (grupo VERIFICAR del PHVA, ruta `/auditorias/*`, hoy placeholder).
Dos dominios bajo un mismo motor: **inspecciones planeadas** (EPP, extintores, botiquín, locativa, químicas…) y
**auditoría interna del SG-SST** (Dec. 1072/2015 arts. 2.2.4.6.29–31, distinta de la autoevaluación 0312 que ya existe).
Toda verificación corre un **checklist** (Cumple/No cumple/No aplica + evidencia foto), calcula **% de cumplimiento** y
genera **hallazgos**; cada hallazgo se cierra con una **acción con verificación de eficacia** (mismo patrón que
Investigación AT, plan 11). Un **cockpit de programa anual** muestra programado vs ejecutado y hallazgos vencidos.

## Diferenciador (valor agregado)
1. **Bucle cerrado unificado hallazgo → acción → eficacia** (nadie en el mercado lo cierra): la inspección/auditoría no
   termina en un PDF; cada No cumple produce un hallazgo clasificado con acción (responsable, fecha, jerarquía
   fuente/medio/individuo) y **verificación de eficacia**, igual que el motor de acciones de AT.
2. **Plantillas normativas precargadas** (seed global): EPP, extintores, botiquín, locativa — se inspecciona el día 1 sin configurar.
3. **Auditoría interna enlazada a los estándares 0312**: cada ítem/hallazgo de auditoría referencia
   `sst_estandares_catalogo` → conecta con la Evaluación de Cumplimiento ya existente (no recrea esa data).
4. **Cockpit de programa anual** con semáforo (programado/ejecutado/vencido) y % de cumplimiento por verificación.
5. Captura **móvil con foto** por ítem (Capacitor, patrón `subirEvidencia` ya existente).

## Enfoque arquitectónico
- Un solo módulo `src/app/modules/auditorias/` (lazy). Entidad central `sst_verificacion` con `tipo` discriminador
  (`inspeccion` | `auditoria_interna`). Reapuntar las rutas `/auditorias/*` del placeholder.
- **Reusar sin duplicar:** patrón de Storage/evidencia (`subirEvidencia`/`urlFirmadaEvidencia`), patrón de acciones +
  eficacia (de matriz_at), `sst_estandares_catalogo` (0312), export exceljs (`IndicadoresExcelService`), `TenantService`.
- Cómputo pesado (cockpit del programa: conteos, vencidos, % agregado) en **RPC**; el **% de una verificación** es
  conteo liviano → **función pura** con spec (excluye No Aplica, como `res-evaluaciones`).
- Idempotencia e idioma por reglas del repo. RLS fail-closed por `empresa_id` en toda tabla nueva.

## Archivos a crear/modificar
- `database/migrations/2026_11_14_03_auditorias_inspecciones.sql` — 5 tablas + RLS + RPC cockpit + Storage bucket/policy.
- `database/seeds/…_plantillas_verificacion.sql` — plantillas base (items EPP/extintores/botiquín/locativa), globales.
- `src/app/core/models/verificacion.model.ts` — contratos TS.
- `src/app/core/services/verificaciones.service.ts` — CRUD + RPC + evidencia.
- `src/app/modules/auditorias/` — módulo lazy, páginas: cockpit/programa, ejecución (checklist runner), hallazgos, plantillas.
- `src/app/modules/auditorias/funciones/verificacion.funcion.ts` (+ spec) — % cumplimiento, derivación de hallazgos, estado de programa.
- `src/app/app-routing.module.ts` — reapuntar `/auditorias/*` (y opcionalmente `gestion-sst/inspecciones/*`).

## Cambios de BD / SQL / RLS (migración aditiva idempotente)
Tablas (todas `empresa_id` + RLS fail-closed salvo plantilla global):
1. `sst_verificacion` — cabecera: tipo, subtipo, titulo, plantilla_id?, sede_id?, responsable_id?/texto, fecha_programada,
   fecha_ejecucion?, estado (programada|en_curso|cerrada|cancelada), alcance?, criterios? (auditoría), puntaje numeric?, observaciones.
2. `sst_verificacion_plantilla` — reutilizable: empresa_id NULLABLE (null = global/seed), tipo, subtipo, nombre, activo.
3. `sst_verificacion_plantilla_item` — plantilla_id FK, orden, texto, categoria?, estandar_id? (FK `sst_estandares_catalogo`), activo.
4. `sst_verificacion_respuesta` — verificacion_id FK, orden, item_texto (snapshot), plantilla_item_id?, resultado
   (cumple|no_cumple|no_aplica), observacion?, evidencia_url?.
5. `sst_hallazgo` — empresa_id, verificacion_id FK, respuesta_id?, descripcion, clasificacion
   (tecnico|documental|operativo|administrativo), severidad (baja|media|alta|critica), estandar_id?,
   + acción/cierre: responsable_id?/texto, fecha_compromiso?, jerarquia? (fuente|medio|individuo),
   estado (abierto|en_progreso|cerrado), fecha_cierre?, eficacia_verificada bool default false, fecha_verificacion?, evidencia_cierre_url?.
- **RPC `get_programa_verificaciones(p_empresa_id, p_anio)`** SECURITY DEFINER, search_path, fail-closed: verificaciones del
  año con estado, puntaje, nº hallazgos abiertos y nº vencidos (fecha_compromiso < hoy y no cerrado). REVOKE anon/PUBLIC; GRANT authenticated.
- Storage: bucket de evidencias de verificación con policy por empresa (o reusar el bucket existente de matriz_at con prefijo).
- Vector de prueba documentado en la migración (puntaje excluye No Aplica; hallazgo vencido; cross-empresa 0 filas).

## Reglas de negocio
- **% cumplimiento** = `cumple / (cumple + no_cumple) * 100`, **excluye No Aplica**; sin ítems evaluables ⇒ null. Redondeo 1 decimal.
- Hallazgo se **sugiere** por cada respuesta `no_cumple` (editable; el usuario confirma/clasifica). No se auto-crea sin confirmación.
- **Cierre de verificación** (`cerrada`): exige todos los ítems respondidos; un hallazgo `cerrado` exige fecha_cierre.
- `vencido` = hallazgo con `fecha_compromiso < hoy` y `estado != 'cerrado'` (derivado en RPC/cockpit, se persiste estado real).
- Aislamiento fail-closed por empresa en RPC y RLS. Plantilla global (empresa_id null) es visible a todas pero no editable por tenant.

## Casos de prueba
- % cumplimiento: 8 cumple / 2 no_cumple / 5 no_aplica ⇒ 80.0; 0 evaluables ⇒ null; todo no_aplica ⇒ null.
- Programa: verificación programada fecha pasada sin ejecutar ⇒ cuenta como vencida de programa; hallazgo con compromiso ayer sin cerrar ⇒ vencido.
- RLS: usuario de empresa A no ve verificaciones/hallazgos de B (vacío, no 403). Plantilla global visible a ambos.
- Hallazgo: derivación sugiere 1 por cada no_cumple; cerrar sin fecha_cierre ⇒ bloqueado.

## Fases
- **F0** (research/legal): confirmar Dec. 1072 arts. 29–31 (auditoría interna) + alcance inspecciones. Hecho en investigación inicial; cerrar.
- **F1** (datos, capa-datos): migración + RLS + RPC cockpit + seeds plantillas + Storage. **OK autónomo del usuario** (mostrar DDL al aplicar).
- **F2** (front, cliente-web): módulo + cockpit/programa anual + CRUD de programación; reapuntar rutas.
- **F3** (front, cliente-web): ejecución del checklist (respuestas + foto) + hallazgos con acción/eficacia; funciones puras + spec.
- **F4** (front, cliente-web): plantillas CRUD + export informe (reusa exceljs) + enlace a estándar 0312 en auditoría.
