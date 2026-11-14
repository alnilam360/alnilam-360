# Plan 11 — Investigación de AT/EL (Res. 1401/2007)

> Fecha: 2026-11-14 · Tracker: [gestion/tracker/11_11-investigacion-atel.md](../tracker/11_11-investigacion-atel.md)

## Objetivo
Construir el módulo **Investigación de AT/EL** (ruta `/investigacion-atel`, grupo VERIFICAR del PHVA), hoy
placeholder que carga `IncidentesModule`. Es obligación legal (Res. 1401/2007): toda empresa investiga cada AT
con equipo investigador dentro del plazo. El **esquema ya está desplegado** (`matriz_at_investigacion`,
`matriz_at_acciones`, catálogos FURAT, `sst_comite`); el trabajo es el **flujo/UI + helpers + export**, no el modelo de datos.

## Marco normativo (texto oficial Res. 1401/2007 leído completo — F0 cerrado 2026-11-14)
- **Art. 4.2 / 4.6:** investigar dentro de **15 días calendario** siguientes a la ocurrencia (`fecha_hora_evento`), con
  equipo investigador; medidas correctivas con **responsable y tiempo de ejecución**, dentro del cronograma del PSO.
- **Art. 7 — equipo investigador (mínimo):** jefe inmediato/supervisor del accidentado o del área + **un representante del
  COPASST/Vigía** + encargado del programa SST. Sin esa estructura ⇒ trabajadores capacitados. **Si es GRAVE o MORTAL**
  (art. 3): además **profesional con licencia en SO** (propio/contratado) + encargado de diseño de normas/procesos/mantenimiento.
- **Art. 3 — accidente grave:** amputación; fractura de huesos largos; TCE; quemaduras 2°/3°; lesión severa de mano; de
  columna con compromiso de médula; ocular/auditiva que comprometa capacidad. (Helper `esGrave` parcial + flag manual.)
- **Art. 9 — contenido del informe:** variables y códigos del informe de AT **Res. 156/2005** (aportante, trabajador,
  datos del accidente) + tipo de lesión, parte del cuerpo, lesión precisa, **agente y mecanismo**, sitio exacto. Todo eso
  **ya lo captura el caso** (`agente_id`, `mecanismo_id`, `parte_cuerpo_id`, `tipo_lesion_id`, `sitio_ocurrencia_id`).
- **Art. 11 — causas:** listar **básicas (mediatas)** e **inmediatas**, cada grupo con actos y condiciones subestándar.
  Calza 1:1 con los `jsonb` `causas_basicas`/`causas_inmediatas`.
- **Art. 12 — medidas de intervención:** enumerar con **quién y cuándo**; especificar medida en **fuente / medio / trabajador**;
  la empresa **verifica la efectividad** de las acciones. ⇒ acción necesita `jerarquia` (fuente/medio/individuo) y verificación de eficacia.
- **Art. 13 — datos de la investigación:** lugar, fecha(s)/hora(s), nombres/cargos/identificación y **firmas** de los
  investigadores y del representante legal.
- **Art. 14 — remisión a ARL (DOBLE RELOJ para grave/mortal):** el aportante remite el informe de AT **mortal y graves** a la
  ARL **dentro de 15 días** de la ocurrencia (además del plazo de investigación). Mortal ⇒ formato ARL obligatorio
  (Dec. 1530/1996). ⇒ el cockpit lleva **dos plazos** en grave/mortal: investigar y remitir.

## Enfoque (fuente de verdad = esquema + modelo actuales)
- Reusar sin duplicar: `MatrizAtCasoService`, modelos `matriz-at.model.ts` (`MatrizAtInvestigacion`, `MatrizAtAccion`,
  `EstadoInvestigacion`), `sst_comite_miembro` (COPASST), IPERC (`sst_matriz_iperc` + `caso.peligro_id`), y el
  indicador V6 **cumplimiento de acciones** que ya vive en `MatrizAtIndicadoresService` (no recrear esa métrica).
- Cómputo pesado (bandeja con reloj de plazos, armado de equipo) en **RPC/vista**, no en bucles del cliente.
- Ruta: reapuntar `/investigacion-atel` del placeholder al nuevo `InvestigacionAtelModule` (lazy, NgModule).

## Característica diferenciadora (ganadora)
1. **Cero re-digitación:** la investigación se autollena desde el caso AT ya capturado (trabajador, lesión, parte del
   cuerpo, días, códigos FURAT). Se investiga, no se transcribe.
2. **Bucle cerrado AT → causa → IPERC → acción → eficacia → indicador:** al registrar causa raíz, ofrece **actualizar la
   Matriz IPERC** (vía `peligro_id`) y crea las acciones en el **mismo tracker que mide el indicador de cumplimiento**.
3. **Cockpit de 15 días:** contador por AT abierto (`EstadoInvestigacion`), alerta al acercarse, **arma el equipo
   investigador automático** desde COPASST (`sst_comite_miembro`) y **bloquea el cierre** sin ≥1 acción con responsable+fecha.

## Fases
### F0. Verificación legal fina (Opus/research) — ✅ CERRADA (2026-11-14)
Texto oficial completo leído (Diario Oficial 46638). Hallazgos integrados arriba en "Marco normativo" (arts. 3, 4, 7, 9–14).

### F1. Datos (capa-datos) — verificar + mínimo imprescindible
- **Verificar** que `matriz_at_investigacion`/`matriz_at_acciones` y sus RLS calzan con el modelo TS (`tipos-y-contratos`).
- **Migración aditiva idempotente** (`IF NOT EXISTS`), nunca reescribir una aplicada:
  - `matriz_at_investigacion`: `equipo_investigador jsonb` = `[{trabajador_id?, nombre, rol, fuente:'copasst'|'sst'|'manual'}]`
    (opción A, menor superficie). Opcional `fecha/lugar` ya están.
  - `matriz_at_acciones`: `jerarquia text` (fuente/medio/individuo, art. 12) + `eficacia_verificada boolean` + `fecha_verificacion date`
    (verificación de efectividad, art. 12). Son el cierre del bucle que el mercado no hace.
- **RPC `get_investigaciones_pendientes(p_empresa_id)`** SECURITY DEFINER, search_path, fail-closed: casos AT con días
  transcurridos desde el evento, `plazo_investigar` (en_plazo/fuera_de_plazo/completa) y —para grave/mortal— `plazo_remitir_arl`
  (doble reloj, art. 14), y si tiene ≥1 acción válida. REVOKE anon/PUBLIC; GRANT authenticated.
- **RPC/func `sugerir_equipo_investigador(p_empresa_id)`**: representante COPASST activo (`sst_comite_miembro`) + encargado SST;
  en grave/mortal, marcar que falta profesional con licencia SO + encargado de diseño (art. 7).
- **Toda mutación de esquema en prod requiere OK explícito del usuario.**

### F2. Front — módulo + bandeja/cockpit (cliente-web)
`InvestigacionAtelModule` (lazy) + `investigacion-atel.service.ts`. Página bandeja: casos AT con **badge de plazo doble**
(investigar; y remitir-ARL en grave/mortal), contador de días, filtros, acceso a la investigación. Reapuntar la ruta.

### F3. Front — wizard de investigación + acciones (cliente-web)
Wizard: datos autollenados en solo-lectura (trabajador, lesión, parte del cuerpo, agente, mecanismo, sitio — art. 9) →
metodología → **causas inmediatas/básicas** (chips: actos/condiciones subestándar, art. 11) → equipo (sugerido por COPASST+SST,
editable; **si grave/mortal exige licencia SO + diseño**, art. 7) → descripción (art. 10) → conclusiones.
Panel de acciones (art. 12): CRUD, `jerarquia` fuente/medio/individuo, responsable+fecha, evidencia a **Storage**
(tipo/tamaño, bucket por empresa), y **verificación de eficacia**. Regla de cierre: no pasar a `completa`/`cerrado`
sin ≥1 acción con responsable+fecha. Botón "Actualizar IPERC" (vía `caso.peligro_id`).
Funciones puras + spec: contador de plazo (investigar + remitir), `esGrave`, validador de cierre, armado de equipo.

### F4. Informe oficial (cliente-web)
Export del informe art. 9–13 (reusa `IndicadoresExcelService`/patrón de export): datos aportante+trabajador+accidente
(Res. 156/2005, ya en el caso), descripción, causas básicas/inmediatas, medidas con responsable/fecha/jerarquía,
datos de la investigación y firmas (art. 13). **Mortal/grave:** aviso "remitir a ARL (art. 14)" + formato ARL en mortal.

## Reglas de negocio
- Investigación aplica a **AT** (y EL/incidente grave); incidente/casi-accidente = `no_aplica`.
- `fuera_de_plazo` se marca si pasan 15 días sin investigación registrada; se deriva en bandeja y se persiste al guardar.
- Aislamiento por empresa fail-closed en RPC y RLS; un caso de otra empresa ⇒ cero filas.

## Casos de prueba
- Contador de plazo: evento hoy ⇒ en_plazo; evento hace 16 días sin investigación ⇒ fuera_de_plazo; con investigación ⇒ completa.
- Bloqueo de cierre sin acción con responsable+fecha.
- Armado de equipo desde COPASST (miembros activos) + fallback responsable SST.
- RLS: usuario de empresa A no ve/edita investigación de empresa B (vacío, no 403).
- Mortal ⇒ equipo exige COPASST + export marca formato ARL.

## Validación
- Build dev + suite headless (único rojo = base `AppComponent`); funciones puras con `.spec`.
- RPC verificadas con `execute_sql` (caso en_plazo/fuera_de_plazo y cross-empresa) y vector documentado en la migración.
- ≤200 líneas/archivo; funciones ≤30; sin `any`; sin `console.log`.
