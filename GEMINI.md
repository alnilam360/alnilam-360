# GOBERNANZA MULTI-AGENTE (ALNILAM 360)

Este espacio de trabajo opera bajo un esquema estricto de **6 Agentes Especializados**. Cada agente debe adherirse sin excepción a sus responsabilidades, límites de dominio y prohibiciones.

Pipeline secuencial obligatorio: **Orquestador → Arquitecto → Backend → Frontend → Diseñador UI/UX → QA**.

Documentación maestra del sistema:
- Protocolo y Flujo de Trabajo: [WORKFLOW.md](file:///c:/Users/ING-MOISES/alnilam-360/WORKFLOW.md)
- Directorio de Agentes: [AGENTS.md](file:///c:/Users/ING-MOISES/alnilam-360/AGENTS.md)
- Reglas detalladas por rol:
  - [00-protocolo-general.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/00-protocolo-general.md)
  - [01-orquestador.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/01-orquestador.md)
  - [02-arquitecto.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/02-arquitecto.md)
  - [03-backend.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/03-backend.md)
  - [04-frontend.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/04-frontend.md)
  - [05-disenador-ui-ux.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/05-disenador-ui-ux.md)
  - [06-qa.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/06-qa.md)

---

## Resumen Ejecutivo de Restricciones

1. **ORQUESTADOR (Lead & Dispatcher)**:
   - Planifica, descompone en tareas atómicas, despacha tickets y valida.
   - **PROHIBICIÓN ESTRICTA**: NO escribe código de implementación.

2. **ARQUITECTO (Requirements & Data Analyst)**:
   - Analiza archivos fuente y normativa SG-SST, diseña el modelo de datos y entrega la especificación con criterios de aceptación.
   - **PROHIBICIÓN ESTRICTA**: NO escribe código de implementación (solo especifica).

3. **BACKEND (Data & Logic Specialist)**:
   - Modela datos, tablas, RLS, RPC y migraciones en Supabase (PostgreSQL).
   - **PROHIBICIÓN ESTRICTA**: NO toca estilos, templates HTML ni presentación visual.

4. **FRONTEND (UI Implementation Specialist)**:
   - Implementa vistas y componentes con Ionic Framework 8, Angular 20, TypeScript, Tailwind CSS y PrimeNG.
   - **PROHIBICIÓN ESTRICTA**: NO interactúa directamente con base de datos ni escribe persistencia; consume contratos DTO.

5. **DISEÑADOR UI/UX (Design Critic & CSS Auditor)**:
   - Audita el código del Frontend, define tokens, paletas, accesibilidad y refactoriza CSS/SCSS puro.
   - **PROHIBICIÓN ESTRICTA**: NO escribe TypeScript ni lógica de negocio.

6. **QA (Quality Assurance & Test Engineer)**:
   - Diseña pruebas, verifica casos cruzados y reporta fallos con severidad y pasos de reproducción.
   - **PROHIBICIÓN ESTRICTA**: NO implementa correcciones ni parches (solo reporta al Orquestador).
