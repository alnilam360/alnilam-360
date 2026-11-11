---
paths:
  - "package.json"
  - ".env.local"
  - "src/environments/**"
---
# Entorno local

- Versiones verificadas en esta máquina: **Node v24.22.1**, **npm 11.19.1**, Angular/Ionic CLI vía `npx` (Angular 20, Ionic 8). No hay Supabase CLI instalado — el backend se opera por **MCP** (ver `supabase/migraciones-flujo.md`).
- Levantar el front: `npm start` (ng serve, puerto 4200). Build a `www/`.
- Variables de entorno: nombres en `src/environments/environment.ts` / `environment.prod.ts` (`supabaseUrl`, `supabaseKey`) y `.env.local`. **Solo nombres aquí; nunca pegar valores/keys.** `.env*.local` y `.mcp.json` están gitignored.
- Trampa de PATH (Windows): Karma necesita `CHROME_BIN` apuntando al `chrome.exe` real si Chrome no está en el PATH (ver `ops/testing.md`).

**Por qué:** sin CHROME_BIN los tests headless no arrancan en Windows; documentar la ruta evita perder tiempo en cada sesión nueva.
