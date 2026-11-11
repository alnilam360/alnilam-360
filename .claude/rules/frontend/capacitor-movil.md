---
paths:
  - "src/app/**"
  - "capacitor.config.ts"
---
# Capacitor / móvil

- El proyecto usa Capacitor 8 (`@capacitor/app`, `camera`, `haptics`, `keyboard`, `status-bar`). Tras cambios que afecten lo nativo: `npx cap sync`.
- Verificar plataforma antes de usar un plugin nativo: `Capacitor.isNativePlatform()`; dar fallback web.
- Permisos de cámara/archivos/ubicación documentados antes de usarlos (SG-SST sube evidencias con `@capacitor/camera`).
- Comportamiento offline / almacenamiento local se **acuerda antes** de implementarlo, no se improvisa.

**Por qué:** llamar un plugin nativo sin `isNativePlatform()` reventaba la app en el navegador; todo acceso nativo necesita su guardia y fallback.
