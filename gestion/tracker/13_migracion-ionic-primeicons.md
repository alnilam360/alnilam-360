# Tracker 13 — Migracion Ionic a PrimeIcons/Flowbite

> Plan: [gestion/fase_de_desarrollo/13_migracion-ionic-primeicons_plan.md](../fase_de_desarrollo/13_migracion-ionic-primeicons_plan.md) · Iniciado: 2026-11-14
> Estados: `- [ ]` pendiente · `- [~]` en curso · `- [x]` hecho. Única fuente de verdad.

## Checklist
- [x] F0 contrato: inventario (573 ion-*) + tabla mapeo ion→pi + PrimeIcons cargado (2026-11-14)
- [x] F1 muerto+shared: `folder/` borrado · 6 archivos (badge, placeholder, flujo, historial, alerta-service) · build EXIT0, 138✓+1base, 0 ion residual (2026-11-14)
- [x] F2 dashboard + layout: 13 archivos (menu.model, dashboard-page+mock, 5 comps, header, sidebar+scss) · build EXIT0, 138✓+base, 0 ion-icon residual (2026-11-14)
- [~] F3 indicadores (144 ion-icon+7 spinner, 18 archivos) — F3a pages matriz · F3b resto+charts
  - [x] F3a matriz-indicadores+casos/wizard/detalle+accidentalidad-shell (6 archivos) · build EXIT0, 138✓+base, 0 residual (2026-11-14)
  - [x] F3b enfermedad/ausentismo/análisis/dashboard/sg-sst/parámetros/cie10 + 6 charts (13 archivos) · build EXIT0, 138✓+base, grep indicadores=0 (2026-11-14)
- [x] F4 gestion-sst (~157 ion-icon + spinners, 12 archivos) — F4a iperc · F4b evaluaciones · F4c plan-anual(ion-modal)+plan-mejora · todas verdes (2026-11-14)
  - [x] F4a iperc dashboard+form (3 archivos) · build EXIT0, 138✓+base, 0 residual · skull→pi-ban, niveles por color (revisar visual) (2026-11-14)
  - [x] F4b evaluaciones dashboard+detalle (4 archivos) · build EXIT0, 138✓+base, 0 residual (2026-11-14)
  - [x] F4c plan-anual(ion-modal→overlay Tailwind)+plan-mejora (5 archivos) · build EXIT0, 138✓+base, 0 residual · revisar visual :host modal (2026-11-14)
- [~] F5 configuracion/personal/usuarios/auth/documentos/matriz-legal (10 HTML + app.scss) — F5a config+usuarios · F5b personal+legal+docs+auth
  - [x] F5a configuracion(trabajadores/cargue/empresas/roles)+usuarios (6 archivos) · build EXIT0, 138✓+base, 0 residual (2026-11-14)
  - [x] F5b personal/recursos-responsables + matriz-legal + documentos/politica-sst + auth(login,asignar) + app.component.scss (6 archivos) · build EXIT0, 138✓+base, 0 residual (2026-11-14)
  <!-- Hallazgo: cero ion-modal/content/router-outlet/controllers reales en toda la app; solo ion-icon+ion-spinner. Shell NO requiere reestructura. -->
- [x] ~~F6 spinners~~ fusionado en cada fase · global residual ion-spinner = 0 (2026-11-14)
- [x] F7 cierre: IonicModule fuera de 26 archivos + forRoot + CUSTOM_ELEMENTS_SCHEMA en 26 · build EXIT0, 138✓+base · solo resta IonicRouteStrategy (provider router, no componente) (2026-11-14)
- [x] Commit  <!-- 2026-11-14 · global: 0 ion-tags, 0 IonicModule; build EXIT0 + suite 138✓/1base verificados por Opus -->

## Pendientes (no bloquean; revisión visual Opus / fase aparte)
- Desinstalar npm `@ionic/angular`+`ionicons`+`@ionic/angular-toolkit` y reemplazar `IonicRouteStrategy` por estrategia Angular por defecto → **requiere OK del usuario** (cambio de dependencias/comportamiento de router).
- Iconos genéricos a validar a ojo: AT/EL ambos `pi-heart`; `skull→pi-ban`; niveles IPERC II/III distinguidos solo por color; `flask→pi-circle`; `person-circle→pi-user`; `cube→pi-box`.
- Modal actividad (plan-anual): `:host height:100%/overflow:hidden` dentro de overlay sin alto fijo → revisar scroll interno en navegador.
- `app.component.scss`: selectores muertos `ion-menu/ion-item/ion-note` (tags inexistentes) → limpiar si molesta.
