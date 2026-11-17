# Plan 16 — Seguimiento de exámenes médicos ocupacionales (Res 1843/2025)

> Fecha: 2026-11-17 · Tracker: [gestion/tracker/16_seguimiento-examenes.md](../tracker/16_seguimiento-examenes.md)
> Reemplaza el placeholder de la ruta `/formatos/seguimiento-examenes` (menú `gestion-salud`).

## Objetivo
Módulo de gestión y **seguimiento** de evaluaciones médicas ocupacionales (EMO) por trabajador, **adaptado a la Resolución 1843 de 2025** (deroga la 2346/2007). Núcleo de registro + dashboard de cobertura/vencimientos + **valor agregado diferenciador** atado al IPERC y a los disparadores de la norma.

## Marco legal (verificado en texto oficial, Diario Oficial 53.109, 6-may-2025)
- **6 tipos** (Art.8), modelados: `pre_ingreso`, `periodica_programada`, `cambio_ocupacion`, `egreso`, `post_incapacidad`, `retorno`, `seguimiento`.
- **Disparadores computables:** egreso ≤5 días hábiles tras terminación (Art.11); retorno tras ausencia no médica ≥90 días calendario (Art.12); post-incapacidad ≥30 días (Art.13); pre-ingreso por `fecha_ingreso`; periódica por tope ≤3 años / exposición (Art.15).
- **NO existe "profesiograma"** → documento = **perfil de cargo** (Art.16.a), que el empleador entrega junto con la **matriz de peligros** para orientar la EMO (Art.16). → fundamenta el valor agregado #1.
- **Custodia/confidencialidad (Art.19/20/30/31):** el empleador **NUNCA** guarda la historia clínica ocupacional; solo recibe el **concepto médico ocupacional** (Art.19) y un **diagnóstico general anonimizado** anual (Art.20). Conservación ≥20 años. → la BD guarda **solo** concepto + aptitud + restricciones + fechas + IPS; el PDF que se adjunta es el **concepto**, nunca la HC.
- **Aptitud:** la norma **no fija categorías** y restringe la palabra "no apto" (Art.19 Par.). Lo obligatorio: el concepto lleva **restricciones y/o recomendaciones con temporalidad** y marca si requiere seguimiento. Adaptar puesto ≤20 días hábiles (Art.5.f).
- **Quién:** médico especialista SST con licencia vigente (Art.17) → se guarda `medico_licencia` (texto), sin validar contra registro externo.

## Alcance (fase 1 — acordado: núcleo + lazo IPERC)
Núcleo CRUD + dashboard + diferenciadores #1 y #2. Fuera de fase 1: bóveda con rol MÉDICO y RLS por rol (fase 2), diagnóstico anonimizado Art.20 (fase 2), app móvil.

## Valor agregado (lo que la competencia no tiene)
1. **Perfil de cargo dinámico desde la matriz de peligros (IPERC):** batería de exámenes sugerida por cargo, derivada de los peligros reales del IPERC de ese cargo (operacionaliza Art.16). Mapeo peligro→examen en tabla seed `salud_peligro_examen`.
2. **Detección automática de exámenes pendientes/vencidos** según las reglas de la norma, sobre datos del trabajador (ingreso/egreso/retorno/post-incapacidad/periódico). RPC de cobertura + función pura de ventanas en días hábiles.
3. **Lazo restricción → acción** con temporalidad (Art.19 Par. + Art.5.f): un concepto con restricción abre una acción rastreada (responsable + `fecha_limite_accion`), reusando `AlertaVencimientoService`.

## Cargo ↔ IPERC (decisión)
Match por **texto normalizado** (`trim` + mayúsculas + sin tildes) entre `trabajadores.cargo` e `matriz_iperc.cargo`. Cero migración de datos. Riesgo conocido: si el cargo se escribe distinto en cada lado, no liga → se documenta como `shortcut`. Catálogo de cargos = fase futura.

## Cambios de BD / SQL / RLS (contrato en expediente)
Migración idempotente nueva (no reescribir aplicadas). Ver `16_seguimiento-examenes_expediente.json#version`.
- **`salud_examen`** (una EMO por trabajador): `tipo`, `fecha`, `fecha_proximo`, `aptitud`, `requiere_seguimiento`, `ips_nombre`, `medico_licencia`, `concepto_path`, `observaciones`.
- **`salud_restriccion`** (restricciones/recomendaciones de un examen): `clase` (restriccion|recomendacion), `temporalidad`, `fecha_fin`, `estado`, `responsable`, `fecha_limite_accion`.
- **`salud_peligro_examen`** (seed catálogo peligro→examen sugerido) — capa-datos define el mecanismo exacto tras inspeccionar `peligro_catalogo`.
- **RLS fail-closed** en las 3 tablas de negocio: `empresa_id = get_my_empresa_id() OR is_admin()`, rol `authenticated`.
- **RPC** `SECURITY INVOKER`: `salud_cobertura(p_anio)` (cobertura + pendientes auto por trabajador) y `salud_perfil_cargo(p_cargo)` (batería desde IPERC).
- Índices: `empresa_id`, `trabajador_id`, `examen_id`, `(empresa_id, fecha_proximo)`.
- Bucket privado para el **concepto** (URL firmada), patrón de `matriz-legal.service.ts`. Validar tipo/tamaño antes de subir.

## Frontend (fase 2 del plan, tras datos)
Módulo nuevo `src/app/modules/gestion-sst/salud/` (NgModule lazy, patrón `planes`). `pages/dashboard` (cobertura %, vencimientos, pendientes auto), tabla por trabajador, modal CRUD examen, panel restricciones→acción, panel perfil-cargo (IPERC). `funciones/ventana-examen.funcion.ts` (pura, días hábiles) + `.spec.ts`. Ruta: el host ramifica por `data.tipo` o ruta directa que reemplaza el placeholder.

## Casos de prueba (golden vectors en expediente)
- `ventana-examen`: egreso +5 hábiles; retorno si ausencia ≥90; post-incapacidad si ≥30; periódico vencido si último > tope; bordes (fin de mes, festivo no contemplado → `shortcut`).
- RLS: usuario empresa A no ve exámenes de empresa B (consulta directa por id → 0 filas).
- Cobertura: trabajador activo sin examen vigente aparece como pendiente del tipo correcto.

## Orden de ejecución
F1 datos (capa-datos, **migración a prod requiere OK explícito**) → actualizar modelos TS → verificar con `execute_sql`/`get_advisors` → F2 cliente-web → F3 verificador (RLS + contrato) → commit. Push/deploy: los hace el usuario.
