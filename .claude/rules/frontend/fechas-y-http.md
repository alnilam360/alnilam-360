---
paths:
  - "src/app/**"
---
# Fechas y HTTP

- Fechas de negocio **sin hora** se envían como `YYYY-MM-DDT12:00:00Z` (mediodía UTC), **nunca** medianoche local: evita que la fecha «retroceda un día» en Colombia (UTC-5).
- Mostrar fechas en la zona acordada de forma consistente; no mezclar `new Date()` local con fechas ISO del servidor sin normalizar.
- Auth y manejo de sesión en **un solo lugar** (`AuthService` + `SupabaseClientService`), no repartido por componentes.
- Un error de carga se pinta **como error**, jamás como «no hay registros»: distinguir `error` de `data: []` (ver `supabase/consultas-eficientes.md`).

**Por qué:** guardar la fecha a medianoche local la convertía a UTC del día anterior y los reportes salían con un día de desfase.
