# Plan 13 — Migración Ionic → PrimeIcons / Flowbite-Tailwind

> Fecha: 2026-11-14 · Tracker: [gestion/tracker/13_migracion-ionic-primeicons.md](../tracker/13_migracion-ionic-primeicons.md)

## Objetivo
Eliminar los componentes Ionic de la UP y reemplazarlos: **iconos `ion-icon` → PrimeIcons (`<i class="pi pi-x">`)**;
**overlays/spinners → Tailwind estilo Flowbite** (sin añadir dependencia flowbite). Inventario (2026-11-14): **573 `ion-*`** en 38
HTML = 528 `ion-icon` + 35 `ion-spinner` + restos (`folder.page` starter muerto, 1 `ion-modal`, shell). Módulo `auditorias` ya limpio.

## Decisiones (del usuario)
- Alcance: **todo, por fases verificadas** (build + suite verde en cada fase; único rojo permitido = base `AppComponent`).
- Librería: **PrimeIcons para iconos** (ya instalado `primeicons@7`, CSS cargado en `angular.json`), **Flowbite/Tailwind para overlays/spinners** (markup Tailwind, sin dep).
- Refactor ≠ cambio de comportamiento: preservar layout, tamaños (≈ `text-base`/`text-lg`), `slot`/posición, y la lógica de los `[name]` dinámicos.

## Reglas de conversión
- `<ion-icon name="X" class="C" slot="S"></ion-icon>` → `<i class="pi pi-Y C"></i>` (descartar `slot`; conservar `class`). Tamaño: si traía `style="font-size"`/clase de tamaño, mantener con Tailwind (`text-lg`, etc.).
- `[name]="expr"` dinámico → `[class]="'pi ' + (expr-mapeada)"` o `[ngClass]`. Si `expr` es un ternario de nombres ion, mapear **ambas ramas**. Si `expr` es `item.icon` (dato), ver abajo.
- **Iconos en datos** (`icon: 'nombre-ion'` en `*.ts`, p. ej. `menu.model.ts`, kpis, quick-actions): cambiar el **string guardado** a `pi-xxx` y en el template usar `<i class="pi" [ngClass]="item.icon"></i>` (el dato ya trae `pi-xxx`).
- `ion-spinner` → spinner Tailwind: `<span class="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>`.
- `ion-modal` → overlay Tailwind (`fixed inset-0 z-50 bg-black/50` + tarjeta `bg-dark-secondary border rounded-2xl`), patrón ya usado en `auditorias/cockpit`.
- Al quedar un módulo sin `ion-*` y sin controladores Ionic en TS: quitar `IonicModule` de su `*.module.ts`. Controladores (`ModalController`/`AlertController`/`ToastController`) → reemplazo Tailwind/servicio propio (fase dedicada).

## Tabla de mapeo ion-icon → pi (verificada contra primeicons@7, 316 iconos)
add-circle-outline→plus-circle · add-outline→plus · alarm-outline→clock · alert-circle(-outline)→exclamation-circle ·
alert-outline→exclamation-triangle · analytics-outline→chart-line · arrow-back-outline→arrow-left ·
arrow-forward(-outline)→arrow-right · arrow-undo-outline→undo · bar-chart-outline→chart-bar · body-outline→user ·
book-outline→book · briefcase-outline→briefcase · build-outline→wrench · business-outline→building ·
calculator-outline→calculator · calendar(-number)-outline→calendar · camera-outline→camera · card-outline→credit-card ·
cash-outline→money-bill · chatbox-ellipses-outline→comment · chatbubbles-outline→comments · checkbox-outline→check-square ·
checkmark-circle(-outline)→check-circle · checkmark-done(-circle)-outline→check-circle · checkmark-outline→check ·
chevron-down-outline→chevron-down · chevron-forward-outline→chevron-right · chevron-up-outline→chevron-up ·
clipboard(-outline)→clipboard · close-circle(-outline)→times-circle · close-outline→times · cloud-download-outline→cloud-download ·
cloud-upload-outline→cloud-upload · compass-outline→compass · construct-outline→wrench · copy-outline→copy ·
create-outline→pencil · crescent→moon · document-attach-outline→file-import · document(-text)-outline→file ·
documents-outline→copy · download-outline→download · ellipse-outline→circle · ellipsis-vertical→ellipsis-v ·
expand-outline→arrows-alt · eye-outline→eye · eye-off-outline→eye-slash · file-tray(-stacked)-outline→inbox ·
filter-outline→filter · flag-outline→flag · flame-outline→bolt · flash-outline→bolt · flask-outline→circle ·
folder-open-outline→folder-open · folder-outline→folder · git-branch-outline→sitemap · git-network-outline→sitemap ·
grid-outline→th-large · hammer-outline→wrench · headset-outline→headphones · heart-outline→heart ·
help-circle-outline→question-circle · home-outline→home · hourglass-outline→stopwatch · information-circle-outline→info-circle ·
key-outline→key · layers-outline→clone · leaf-outline→globe · link-outline→link · list-outline→list ·
location-outline→map-marker · lock-closed-outline→lock · log-out-outline→sign-out · mail-outline/email→envelope ·
bandage-outline→heart · medical-outline/medkit(-outline)→heart · megaphone-outline→megaphone · menu-outline→bars ·
notifications-outline→bell · open-outline→external-link · pencil-outline→pencil · people(-circle)-outline→users ·
person-add-outline→user-plus · person(-circle)-outline→user · person-remove-outline→user-minus · pie-chart-outline→chart-pie ·
print-outline→print · pulse-outline→chart-line · receipt-outline→receipt · refresh-outline→refresh ·
remove-circle-outline→minus-circle · repeat-outline→sync · ribbon-outline→star · save-outline→save · scale-outline→chart-bar ·
school-outline→book · search-outline→search · settings-outline→cog · shield-checkmark(-outline)→verified ·
shield(-half)-outline→shield · skull-outline→ban · speedometer-outline→gauge · stats-chart-outline→chart-bar ·
swap-horizontal-outline→arrow-right-arrow-left · swap-vertical-outline→arrows-v · sync-outline→sync · time-outline→clock ·
timer-outline→stopwatch · toggle-outline→circle-on · trash-outline→trash · trending-down-outline→arrow-down ·
trending-up-outline→arrow-up · trophy-outline→trophy · wallet-outline→wallet · warning-outline→exclamation-triangle ·
caret-down-outline→caret-down · caret-up-outline→caret-up · moon-outline→moon · sunny-outline→sun

> Sin equivalente directo (nota): flame/flash→bolt, flask→circle (neutro), skull→ban, leaf→globe, scale/stats→chart-bar,
> medkit/medical/bandage→heart. Si en una vista el genérico queda mal, Opus decide el ajuste puntual.

## Fases (cada una: aplicar + `ng build` EXIT=0 + suite = base)
- **F0** — contrato: inventario + mapeo + verificación de PrimeIcons cargado. (este plan)
- **F1** — Código muerto + shared: borrar `src/app/folder/**` (starter no ruteado); migrar `shared/components/**` (badge-vencimiento, documento-*).
- **F2** — Dashboard (`modules/dashboard/**`) + layout header/sidebar (iconos del menú → cambiar `menu.model.ts` a `pi-*`).
- **F3** — Indicadores (`modules/indicadores/**`: matriz-casos, caso-wizard, ausentismo, etc.) — es el grupo más denso.
- **F4** — gestion-sst (`iperc`, `evaluaciones`, `plan-anual`, `plan-mejora`): dashboards + forms + modales.
- **F5** — Configuración/personal/usuarios/auth/documentos/matriz-legal + resto de módulos.
- **F6** — Spinners (`ion-spinner`×35) → spinner Tailwind, barrido global.
- **F7** — Shell y cierre: `ion-content/ion-header/ion-toolbar` restantes, `ion-modal` suelto; controladores Ionic en TS; quitar `IonicModule` de módulos ya limpios. (El `ion-app`/`ion-router-outlet` del bootstrap y desinstalar `@ionic/angular` se evalúa al final por riesgo; preservar navegación y lifecycle.)

## Validación / riesgos
- Cada fase: `ng build` EXIT=0 + suite headless (único rojo = base). No aumentar deuda de lint en archivos tocados.
- Riesgo: iconos genéricos (flask/skull/leaf) pueden verse distinto → revisión visual por muestreo (Opus).
- Riesgo mayor: fase 7 (shell). Desinstalar Ionic del bootstrap cambia routing/lifecycle; se hace último y muy verificado; si algo depende de `ionViewWillEnter`/gestos, se migra su equivalente Angular antes de quitar.
