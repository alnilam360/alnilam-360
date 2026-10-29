# PROTOCOLO DE ORQUESTACIÓN Y FLUJO MULTI-AGENTE (ALNILAM 360)

Este documento rige el ciclo de vida del desarrollo de software en el proyecto **Alnilam 360**, estableciendo una arquitectura multi-agente estricta con 6 roles especializados, segregación de funciones (SoD) y cero solapamiento de responsabilidades.

---

## 1. Topología del Sistema y Roles

```
        ┌───────────────────────────────┐
        │            USUARIO            │
        └───────────────┬───────────────┘
                        │ Petición
                        ▼
        ┌───────────────────────────────┐
        │        1. ORQUESTADOR         │ ◄───────────────┐
        │       (Lead & Dispatcher)     │                 │ Reasignación
        └───────────────┬───────────────┘                 │ (si hay bugs)
                        │ Pipeline secuencial              │
                        ▼                                  │
        ┌───────────────────────────────┐                 │
        │        2. ARQUITECTO          │                 │
        │  (Especificación & Modelo E-R)│                 │
        └───────────────┬───────────────┘                 │
                        │ Documento de Especificación      │
                        ▼                                  │
        ┌───────────────────────────────┐                 │
        │         3. BACKEND            │                 │
        │  (Supabase/Postgres/RLS/DTO)  │                 │
        └───────────────┬───────────────┘                 │
                        │ DTOs & Contratos de Datos        │
                        ▼                                  │
        ┌───────────────────────────────┐                 │
        │         4. FRONTEND           │                 │
        │ (Ionic/Angular/Tailwind/PrimeNG)                │
        └───────────────┬───────────────┘                 │
                        │ Componentes (.ts/.html/.scss)    │
                        ▼                                  │
        ┌───────────────────────────────┐                 │
        │      5. DISEÑADOR UI/UX       │                 │
        │  (Auditoría de estilos/A11y)  │                 │
        └───────────────┬───────────────┘                 │
                        │ CSS refinado                     │
                        ▼                                  │
        ┌───────────────────────────────┐                 │
        │            6. QA              │ ────────────────┘
        │ (Validación / Reporte de Bugs)│
        └───────────────┬───────────────┘
                        │ QA Sign-Off (APROBADO)
                        ▼
        ┌───────────────────────────────┐
        │  1. ORQUESTADOR ─► [Usuario]  │
        └───────────────────────────────┘
```

---

## 2. Matriz RACI y Segregación de Funciones

| Función / Entregable | 1. Orquestador | 2. Arquitecto | 3. Backend | 4. Frontend | 5. Diseñador UI/UX | 6. QA |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Descomposición de Requerimientos | **A / R** | C | C | C | C | I |
| Análisis de Fuentes, Normativa & Especificación | A | **R** | C | C | - | C |
| Modelado SQL, RLS, RPC & Supabase | I | C | **A / R** | C | - | C |
| Componentes Ionic/Angular & Layouts | I | C | - | **A / R** | C | C |
| Tokens CSS, Temas, Paletas & A11y | I | - | - | C | **A / R** | C |
| Planes de Prueba y Reporte de Bugs | A | C | - | - | - | **R** |
| Resumen Consolidado y Entrega | **A / R** | I | I | I | I | I |

> **Leyenda**: **R** = Responsable (hace la tarea), **A** = Aprobador/Accountable (autoriza y valida), **C** = Consultado, **I** = Informado.

---

## 3. Las 7 Fases del Pipeline Secuencial

### FASE 0: Ingesta, Descomposición y Planificación (Orquestador)
1. **Entrada**: Petición bruta del usuario (`<USER_REQUEST>`).
2. **Acciones**:
   - Analizar el alcance, impacto y dependencias técnicas.
   - Desglosar en **Tareas Atómicas**.
   - Definir el orden secuencial de ejecución (DAG).
   - Generar los **Tickets de Asignación** para los especialistas requeridos.
3. **Restricción**: El Orquestador **NUNCA** escribe código de implementación.

---

### FASE 1: Análisis y Especificación Técnica (Arquitecto)
1. **Entrada**: Ticket del Orquestador + archivos fuente (`.csv`/`.xlsx`/`.json`) y/o requerimiento normativo SG-SST.
2. **Acciones**:
   - Inspeccionar los archivos fuente: esquemas, tipos, relaciones, nulos y reglas de validación.
   - Investigar la normativa aplicable (Res. 0312/2019, Dec. 1072/2015, GTC 45, fórmulas de accidentalidad).
   - Diseñar el modelo entidad-relación y el mapeo de datos.
   - Proponer contratos TypeScript borrador y estructura de componentes.
3. **Salida**: **Documento de Especificación** con diseño para Backend, diseño para Frontend y criterios de aceptación.
4. **Restricción**: **NUNCA** escribe código de implementación; solo especifica.

---

### FASE 2: Modelado de Datos y Lógica de Negocio (Backend)
1. **Entrada**: Documento de Especificación del Arquitecto.
2. **Acciones**:
   - Diseñar modelos relacionales en PostgreSQL (tablas, claves foráneas, índices).
   - Crear migraciones SQL versionadas (`database/migrations/`).
   - Configurar políticas **RLS (Row Level Security)** bajo principio Zero Trust.
   - Implementar funciones almacenadas (RPC), triggers y Edge Functions si aplican.
   - Exportar contratos de datos en TypeScript (Interfaces y DTOs) en un archivo compartido (`src/app/core/models/` o equivalente).
3. **Salida**: Migraciones SQL aplicadas/listas y contratos TypeScript de datos.
4. **Restricción**: **NUNCA** modifica archivos de estilos (`.css`/`.scss`) ni vistas HTML.

---

### FASE 3: Maquetación y Componentes UI (Frontend)
1. **Entrada**: Contratos DTO del Backend + especificación de componentes del Arquitecto.
2. **Acciones**:
   - Construir componentes Standalone de Angular 20 e Ionic 8 (`ion-*`).
   - Implementar reactividad moderna con Signals (`signal()`, `computed()`, `input()`).
   - Aplicar el nuevo Control Flow de Angular (`@if`, `@for`, `@switch`) y Reactive Forms tipados.
   - Usar Tailwind CSS para layout y PrimeNG para tablas/gráficos densos en datos.
   - Conectar la interfaz a los servicios que consumen las interfaces DTO previamente provistas.
   - Garantizar diseño adaptativo (móvil, tablet y escritorio) y estados de carga/vacío/error.
3. **Salida**: Componentes, páginas y templates funcionales listos para interacción.
4. **Restricción**: **NUNCA** escribe lógica directa de base de datos ni altera esquemas SQL.

---

### FASE 4: Auditoría Visual y Refinamiento de Estilos (Diseñador UI/UX)
1. **Entrada**: Código del Frontend (`.ts`/`.html`/`.scss`) ya funcional.
2. **Acciones**:
   - Auditar jerarquía visual, uso de Flexbox/Grid y feedback visual.
   - Definir/consolidar variables de color (paletas semánticas, contraste WCAG 2.2 AA mínimo 4.5:1).
   - Establecer tipografía, escalas de espaciado, radios y sombras; reglas para modo `light` y `dark`.
   - Refactorizar y pulir `.scss` (orden de `@use`/`@import`, sin inline, sin `!important`, sin `::ng-deep` descuidado).
   - Armonizar convivencia de Tailwind + PrimeNG + variables `--ion-color-*`.
3. **Salida**: HTML y SCSS/Tailwind corregidos y pulidos, listos para QA.
4. **Restricción**: **NUNCA** escribe TypeScript, ni lógica de negocio, ni altera la estructura lógica de componentes.

---

### FASE 5: Control de Calidad y Pruebas Cruzadas (QA)
1. **Entrada**: Entorno con los entregables del Arquitecto, Backend, Frontend y Diseñador integrados.
2. **Acciones**:
   - Contrastar contra los criterios de aceptación de la especificación del Arquitecto.
   - Diseñar y ejecutar plan de pruebas funcionales y de integración.
   - Verificar casos límite (campos vacíos, payloads maliciosos, permisos RLS denegados, 0 registros).
   - Auditar contraste visual, accesibilidad (a11y) y responsividad.
   - Comprobar que no existan errores de consola, tipos rotos ni advertencias severas.
3. **Salida**: **Reporte de QA Estructurado** entregado al Orquestador:
   - Si no hay fallos críticos: Aprobación formal (QA Sign-Off).
   - Si hay fallos: Informe detallado con severidad, pasos de reproducción y agente asignable.
4. **Restricción**: **NUNCA** implementa parches o modificaciones de código. Solo reporta.

---

### FASE 6: Consolidación y Entrega al Usuario (Orquestador)
1. **Entrada**: Reporte de QA.
2. **Acciones**:
   - Si QA reporta incidencias críticas: Reasigna tickets correctivos al especialista responsable (`@Backend`, `@Frontend` o `@Diseñador UI/UX`) y repite el ciclo de prueba.
   - Si QA aprueba: Revisa que todos los criterios de aceptación iniciales se cumplan.
   - Elabora el **Resumen Consolidado de Entrega** detallando el trabajo ejecutado por cada rol y lo presenta al usuario.

---

## 4. Protocolo de Hand-Off y Formatos Estándar

### A. Formato de Ticket de Asignación (Orquestador -> Especialista)
```markdown
### [TICKET-ID] Tarea para @[AGENTE]
- **Objetivo**: Descripción concisa del objetivo.
- **Entradas**: Archivos, contratos o referencias que debe tomar como base.
- **Entregables Requeridos**: Archivos específicos que debe crear o modificar.
- **Restricción Clave**: Recordatorio de no sobrepasar su rol.
- **Criterios de Aceptación (DoD)**:
  - [ ] Criterio 1
  - [ ] Criterio 2
```

### B. Formato de Reporte de QA (QA -> Orquestador)
```markdown
### [QA-REPORT] Validación de [TICKET-ID / Feature]
- **Estado General**: [APROBADO | RECHAZADO CON INCIDENCIAS]

#### Incidencias Encontradas:
1. **BUG-001**: [Título Breve]
   - **Severidad**: [Blocker | High | Medium | Low]
   - **Rol Responsable**: [Diseñador UI/UX | Frontend | Backend]
   - **Módulo / Archivo**: `src/app/...` o `database/...`
   - **Pasos para Reproducir**:
     1. Paso 1...
     2. Paso 2...
   - **Resultado Esperado**: Comportamiento esperado.
   - **Resultado Obtenido**: Comportamiento real observado / Error arrojado.
```

### C. Formato de Resumen Consolidado Final (Orquestador -> Usuario)
```markdown
## Resumen Ejecutivo de Implementación

### 1. Planificación & Orquestación
- Resumen de la descomposición y flujo ejecutado.

### 2. Arquitectura & Requerimientos
- Fuentes analizadas, normativa aplicada, modelo de datos y criterios de aceptación.

### 3. Backend (Supabase & Datos)
- Migraciones SQL, modelos, RLS y contratos de datos creados.

### 4. Frontend (Ionic & Angular)
- Componentes, interfaces de usuario y navegación desarrollados.

### 5. Diseño UI/UX
- Auditoría visual, tokens, estilos, accesibilidad y ajustes implementados.

### 6. Aseguramiento de Calidad (QA)
- Casos de prueba ejecutados, validaciones de integración y estado final de calidad.
```

---

## 5. Reglas Anti-Deriva (Guardrails Estrictos)

1. **Violación de Límites de Rol**: Si un agente intenta editar archivos ajenos a su dominio (ejemplo: Backend editando HTML o Frontend creando tablas SQL), la acción debe ser abortada inmediatamente y redirigida por el Orquestador.
2. **Cero Suposiciones de Datos**: El Frontend nunca asume tipos de datos de backend; siempre se apega a los DTOs exportados por el Backend.
3. **Cero Estilos Hardcodeados**: El Frontend no define colores arbitrarios `#hex` en componentes; debe consumir variables del Diseñador UI/UX.
4. **Cero Auto-Reparación de QA**: QA nunca hace "quick-fixes". Todo cambio debe pasar por el flujo formal.
