# PROTOCOLO DE ORQUESTACIÓN Y FLUJO MULTI-AGENTE (ALNILAM 360)

Este documento rige el ciclo de vida del desarrollo de software en el proyecto **Alnilam 360**, estableciendo una arquitectura multi-agente estricta con 5 roles especializados, segregación de funciones (SoD) y cero solapamiento de responsabilidades.

---

## 1. Topología del Sistema y Roles

```
                      ┌───────────────────────────────┐
                      │          USUARIO              │
                      └──────────────┬────────────────┘
                                     │ Petición
                                     ▼
                      ┌───────────────────────────────┐
                      │     1. ORQUESTADOR            │
                      │    (Lead & Dispatcher)        │
                      └───────┬──────┬──────┬─────────┘
                              │      │      │
         ┌────────────────────┘      │      └────────────────────┐
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐        ┌──────────────────┐
│  2. DISEÑADOR    │       │   4. BACKEND     │        │   3. FRONTEND    │
│     UI / UX      │       │ (Data & Logic)   │        │(UI Implementation│
│ (Tokens/CSS/A11y)│       │(Supabase/Postgres│        │  Ionic/Angular)  │
└────────┬─────────┘       └────────┬─────────┘        └────────┬─────────┘
         │                          │                           │
         │ Tokens & CSS             │ DTOs & DB Contracts       │ Componentes
         └──────────────────┬───────┴───────────────────────────┘
                            │ Entregables
                            ▼
                   ┌──────────────────┐
                   │      5. QA       │
                   │(Quality Assurance│
                   │  & Test Reports) │
                   └────────┬─────────┘
                            │ Informe de Validación / Fallos
                            ▼
                   ┌──────────────────┐
                   │  1. ORQUESTADOR  │ ──► [Entrega al Usuario]
                   └──────────────────┘     (o Reasignación si hay bugs)
```

---

## 2. Matriz RACI y Segregación de Funciones

| Función / Entregable | 1. Orquestador | 2. Diseñador UI/UX | 3. Frontend | 4. Backend | 5. QA |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Descomposición de Requerimientos | **A / R** | C | C | C | I |
| Tokens CSS, Temas, Paletas & A11y | I | **A / R** | C | - | C |
| Modelado SQL, RLS, RPC & Supabase | I | - | C | **A / R** | C |
| Componentes Ionic/Angular & Layouts | I | C | **A / R** | - | C |
| Planes de Prueba y Reporte de Bugs | A | - | - | - | **R** |
| Resumen Consolidado y Entrega | **A / R** | I | I | I | I |

> **Leyenda**: **R** = Responsable (hace la tarea), **A** = Aprobador/Accountable (autoriza y valida), **C** = Consultado, **I** = Informado.

---

## 3. Las 5 Fases del Pipeline Secuencial

### FASE 0: Ingesta, Descomposición y Planificación (Orquestador)
1. **Entrada**: Petición bruta del usuario (`<USER_REQUEST>`).
2. **Acciones**:
   - Analizar el alcance, impacto y dependencias técnicas.
   - Desglosar en **Tareas Atómicas**.
   - Definir el orden secuencial de ejecución (DAG).
   - Generar los **Tickets de Asignación** para los especialistas requeridos.
3. **Restricción**: El Orquestador **NUNCA** escribe código de implementación.

---

### FASE 1: Especificación Visual y Tokens de Diseño (Diseñador UI/UX)
1. **Entrada**: Ticket del Orquestador con requerimientos de interfaz.
2. **Acciones**:
   - Definir variables de color (paletas semánticas, contraste WCAG 2.2 AA mínimo 4.5:1).
   - Establecer tipografía, escalas de espaciado, radios y sombras.
   - Definir reglas para modo claro (`light`) y modo oscuro (`dark`).
   - Implementar o refinar estilos globales o a nivel de componente (`.scss` / `.css`).
3. **Salida**: Tokens CSS documentados y hojas de estilo actualizadas.
4. **Restricción**: **NUNCA** escribe TypeScript, ni lógica de negocio, ni plantillas HTML complejas.

---

### FASE 2: Modelado de Datos y Lógica de Negocio (Backend)
1. **Entrada**: Ticket del Orquestador con requerimientos de datos.
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
1. **Entrada**: Tokens/Estilos del Diseñador + Contratos DTO del Backend.
2. **Acciones**:
   - Construir componentes Standalone de Angular 20 e Ionic 8 (`ion-*`).
   - Implementar reactividad moderna con Signals (`signal()`, `computed()`, `input()`).
   - Aplicar el nuevo Control Flow de Angular (`@if`, `@for`, `@switch`).
   - Conectar la interfaz a los servicios que consumen las interfaces DTO previamente provistas.
   - Garantizar diseño adaptativo (móvil, tablet y escritorio).
3. **Salida**: Componentes, páginas y templates funcionales listos para interacción.
4. **Restricción**: **NUNCA** escribe lógica directa de base de datos ni altera esquemas SQL.

---

### FASE 4: Control de Calidad y Pruebas Cruzadas (QA)
1. **Entrada**: Entorno con los entregables del Diseñador, Backend y Frontend integrados.
2. **Acciones**:
   - Diseñar y ejecutar plan de pruebas funcionales y de integración.
   - Verificar casos límite (campos vacíos, payloads maliciosos, permisos RLS denegados).
   - Auditar contraste visual, accesibilidad (a11y) y responsividad.
   - Comprobar que no existan errores de consola, tipos rotos ni advertencias severas.
3. **Salida**: **Reporte de QA Estructurado** entregado al Orquestador:
   - Si no hay fallos críticos: Aprobación formal (QA Sign-Off).
   - Si hay fallos: Informe detallado con severidad, pasos de reproducción y agente asignable.
4. **Restricción**: **NUNCA** implementa parches o modificaciones de código. Solo reporta.

---

### FASE 5: Consolidación y Entrega al Usuario (Orquestador)
1. **Entrada**: Reporte de QA.
2. **Acciones**:
   - Si QA reporta incidencias críticas: Reasigna tickets correctivos al especialista correspondiente (bucle de corrección).
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

### 2. Diseño UI/UX
- Tokens, estilos, accesibilidad y ajustes visuales implementados.

### 3. Backend (Supabase & Datos)
- Migraciones SQL, modelos, RLS y contratos de datos creados.

### 4. Frontend (Ionic & Angular)
- Componentes, interfaces de usuario y navegación desarrollados.

### 5. Aseguramiento de Calidad (QA)
- Casos de prueba ejecutados, validaciones de integración y estado final de calidad.
```

---

## 5. Reglas Anti-Deriva (Guardrails Estrictos)

1. **Violación de Límites de Rol**: Si un agente intenta editar archivos ajenos a su dominio (ejemplo: Backend editando HTML o Frontend creando tablas SQL), la acción debe ser abortada inmediatamente y redirigida por el Orquestador.
2. **Cero Suposiciones de Datos**: El Frontend nunca asume tipos de datos de backend; siempre se apega a los DTOs exportados por el Backend.
3. **Cero Estilos Hardcodeados**: El Frontend no define colores arbitrarios `#hex` en componentes; debe consumir variables del Diseñador UI/UX.
4. **Cero Auto-Reparación de QA**: QA nunca hace "quick-fixes". Todo cambio debe pasar por el flujo formal.
