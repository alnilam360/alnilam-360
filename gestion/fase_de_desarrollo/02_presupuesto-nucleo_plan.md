# Plan 02 — Modulo Presupuesto (nucleo)

> Fecha: 2026-11-13 · Tracker: [gestion/tracker/02_presupuesto-nucleo.md](../tracker/02_presupuesto-nucleo.md)

## Objetivo
Nuevo item de menu **Presupuesto** (estilo Configuracion, con dropdown de submodulos) y el
nucleo del modulo de presupuestos financiero (COP) a partir de `docs/PRESUPUESTO_ALNILAM_360.md`.
Multi-tenant por `empresa_id`. Socios **no hardcodeados**: CRUD (agregar/editar/quitar).
Fuente de verdad del Excel: el `.md` (seccion 12 = correcciones a aplicar).

Alcance de ESTA sesion (nucleo), confirmado con el usuario:
- Menu + rutas + shell del modulo.
- BD completa del nucleo (tablas + RLS + RPC de calculo del Resumen).
- Pantallas: **Resumen del mes**, **Socios (CRUD + reparto)**, **Periodos**, **Catalogo de rubros** (lectura).
- Fuera de esta sesion (fases siguientes): captura de Recaudo/Nomina/Gastos/Cuentas por pagar,
  Fondos de reserva + simulacion, Pagos programados + export plano bancario.

Decisiones:
- **Formulas corregidas** (seccion 12): Ejecutado suma los 5 rubros; `por_pagar = presupuestado - ejecutado`;
  siempre el % real del socio; `saldo_a_favor` calculado.
- **Omitir numeros de cuenta bancaria** en todo el modelo. Cedula/NIT quedan texto plano bajo RLS.

## Enfoque arquitectonico
- Modulo lazy `src/app/modules/presupuesto/` (NgModule, no standalone). `pages/`, `services/` en core,
  `models/presupuesto.model.ts`, `funciones/*.funcion.ts` puras con `.spec.ts` para la aritmetica.
- Calculo pesado del Resumen en **SQL** (RPC `get_presupuesto_resumen`), unico dueño; el cliente consume.
- Menu: nuevo `MenuItem` utility `presupuesto` con `children` (mismo patron que `configuracion`).
- Reglas: `arquitectura-modulo`, `codigo-limpio`, `rpc-y-calculos`, `rls-y-seguridad`,
  `multi-empresa-alcance`, `templates-y-estado`, `ionic-tailwind`, `formularios-sgsst`.

## Archivos a crear/modificar
- `database/migrations/2026_11_13_01_presupuesto_nucleo.sql` — tablas + RLS + RPC.
- `database/seeds/2026_11_13_presupuesto_rubros_seed.sql` — catalogo rubros/subrubros (seccion 2).
- `src/app/core/models/presupuesto.model.ts` — contrato TS (nuevo).
- `src/app/core/services/presupuesto.service.ts` — service Supabase (nuevo).
- `src/app/modules/presupuesto/presupuesto.module.ts` + `pages/` (resumen, socios, periodos, catalogo).
- `src/app/modules/presupuesto/funciones/resumen.funcion.ts` (+ `.spec.ts`) — formato/derivados puros.
- `src/app/core/models/menu.model.ts` — añadir item `presupuesto`.
- `src/app/app-routing.module.ts` — ruta `presupuesto` lazy.

## Cambios de BD / SQL / RLS
Tablas `presupuesto_*` (idempotentes, `IF NOT EXISTS`): `periodo`, `rubro`(global), `subrubro`(global),
`movimiento`, `recaudo`, `nomina`, `cuenta_por_pagar`, `socio`, `liquidez_socio_mes`, `reparto_socio`.
RLS por `empresa_id` fail-closed con `get_my_empresa_id()` + `is_admin()` (patron matriz_legal).
Catalogos `rubro`/`subrubro` globales: SELECT a authenticated, escritura admin.
RPC `get_presupuesto_resumen(p_periodo_id uuid)` SECURITY DEFINER, `search_path` fijo, valida pertenencia.

## Reglas de negocio (formulas corregidas)
- Subrubro **1001 Nomina**: `presupuestado = SUM(neto)`, `neto = total_devengado - total_deducciones`;
  `total_devengado = dev_basico+aux_transporte+aux_comunicacion+rodamiento+bono`;
  `total_deducciones = ded_salud+ded_pension+ded_otras`; `ejecutado = SUM(pago_nomina)`.
- Subrubros de **movimiento** (2001,2002,2003,3001,3002,4001): `presupuestado=SUM(mov.presupuestado)`,
  `ejecutado=SUM(mov.ejecutado)` filtrando por subrubro.
- Subrubro **5001 Por pagar**: `presupuestado=SUM(cxp.presupuestado)`, `ejecutado=SUM(cxp.ejecutado)`.
- Subrubro **5002 Liquidez**: 0 en el nucleo (atajo: se enlaza con liquidez_socio_mes en fase posterior).
- `por_pagar = presupuestado - ejecutado` en cada fila (regla uniforme).
- Cabecera: `recaudo = SUM(recaudo.valor)`; `recaudo_real = SUM where estado='pago'`;
  `meta = facturado>0 ? recaudo/facturado : null`; `total_presupuestado`/`total_ejecutado` = suma de los 5 rubros;
  `saldo_final = saldo_inicial + recaudo - total_ejecutado`.
- Socios: reparto_presupuestado(socio) = `saldo_final * socio.porcentaje`. Suma de % activos debe dar 100%.

## Casos de prueba
Vector limpio (un periodo): nomina neto 2.500.000 / pago 0; mov 2002 presup+ejec 300.000;
cxp presup 3.205.000 / ejec 2.600.000; recaudo 8.200.000; saldo_inicial 2.600.000; facturado 4.800.000.
Esperado: total_presupuestado = 2.500.000+300.000+0+3.205.000 = 6.005.000 (segun lo cargado);
total_ejecutado = 0+300.000+0+2.600.000 = 2.900.000; saldo_final = 2.600.000+8.200.000-2.900.000 = 7.900.000;
meta = 8.200.000/4.800.000 = 1.7083; reparto socio 30% = 2.370.000.
Bordes: facturado=0 → meta null; periodo sin filas → ceros, sin error; dias_mes=0 excluido; socios % no suma 100 → advertencia UI.
