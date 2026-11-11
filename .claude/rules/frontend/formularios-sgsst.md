---
paths:
  - "src/app/**"
---
# Formularios SG-SST

- Formularios **reactivos y tipados** (`FormGroup<...>`); nada de `[(ngModel)]` suelto para datos de negocio.
- Validación en **cliente (UX) Y en BD** (constraints/RLS/funciones): el cliente nunca es la única barrera.
- Adjuntos (evidencias, certificados, FURAT) vía Supabase **Storage** con validación de **tipo y tamaño** antes de subir, y policy de bucket por empresa.
- Deshabilitar el submit mientras guarda (ver `templates-y-estado.md`); mostrar el error real del servidor, no uno genérico.

**Por qué:** un formulario que validaba solo en el cliente permitió guardar un registro inválido saltándose la UI; la constraint en BD es la que manda.
