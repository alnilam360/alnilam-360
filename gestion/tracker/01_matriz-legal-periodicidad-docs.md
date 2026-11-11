# Tracker 01 — Matriz Legal: periodicidad por corte y documentos de cumplimiento

> Plan: [gestion/fase_de_desarrollo/01_matriz-legal-periodicidad-docs_plan.md](../fase_de_desarrollo/01_matriz-legal-periodicidad-docs_plan.md) · Iniciado: 2026-11-11
> Estados: `- [ ]` pendiente · `- [~]` en curso · `- [x]` hecho. Única fuente de verdad.

## Checklist

### Diseño / contrato
- [x] Decisiones con el usuario (periodicidad por corte · documentos ambos · bucket privado)
- [x] Contrato + vectores dorados (`01_..._expediente.json`)

### capa-datos (Sonnet) — hecho 2026-11-11
- [x] Migración `2026_11_11_01_matriz_legal_periodicidad.sql` (columnas + CHECK + UNIQUE + RPC 3 params)
- [x] Migración `2026_11_11_02_matriz_legal_documentos.sql` (tabla + bucket privado + policies storage)
- [x] Modelo `matriz-legal.model.ts` (Periodicidad, helpers, `MatrizLegalDocumento`; `ConteoUpsert` campos opcionales temporal)

### cliente-web (Sonnet) — hecho 2026-11-11
- [x] Servicio `matriz-legal.service.ts` (RPC 3 params; onConflict de corte; subir/listar/signed URL/eliminar documento; validación tipo+tamaño 15MB)
- [x] UI: selector periodicidad + número (Q1..Q4…), título de corte, botón Ver/Subir documento, pestaña Documentos
- [x] Funciones puras `funciones/periodicidad.funcion.ts` + spec con vectores dorados (en verde)

### Verificación (verificador / N0)
- [x] build dev verde + lint sin errores NUEVOS (base 106) + tests headless 66 pass / 1 base fail — reverificado por N0
- [x] Policies RLS/storage auditadas estáticamente (aislamiento por empresa, bucket privado)
- [x] Migraciones aplicadas a prod (01+02, 2026-11-11) con OK del usuario; estructura y advisor(security) verificados — sin hallazgos nuevos
- [x] Ajuste UI: 4 pills de selector igualadas (quitado min-h desigual en Periodicidad/Corte)
- [ ] RLS A/B en runtime real (requiere 2 empresas autenticadas en la app; service_role del MCP no refleja JWT)
- [ ] ⚠️ Desplegar front nuevo a Vercel (el viejo rompe al guardar conteos con el UNIQUE nuevo)

### Cierre
- [x] Commit (2026-11-11) — feature + 2 migraciones + plan/tracker; migraciones ya aplicadas a prod
- [ ] Desplegar front nuevo a Vercel (pendiente del usuario) · probar RLS A/B en runtime
