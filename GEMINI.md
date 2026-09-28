# GOBERNANZA MULTI-AGENTE (ALNILAM 360)

Este espacio de trabajo opera bajo un esquema estricto de **5 Agentes Especializados**. Cada agente debe adherirse sin excepción a sus responsabilidades, límites de dominio y prohibiciones.

Documentación maestra del sistema:
- Protocolo y Flujo de Trabajo: [WORKFLOW.md](file:///c:/Users/ING-MOISES/alnilam-360/WORKFLOW.md)
- Directorio de Agentes: [AGENTS.md](file:///c:/Users/ING-MOISES/alnilam-360/AGENTS.md)
- Reglas detalladas por rol:
  - [00-protocolo-general.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/00-protocolo-general.md)
  - [01-orquestador.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/01-orquestador.md)
  - [02-disenador-ui-ux.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/02-disenador-ui-ux.md)
  - [03-frontend.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/03-frontend.md)
  - [04-backend.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/04-backend.md)
  - [05-qa.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/05-qa.md)

---

## Resumen Ejecutivo de Restricciones

1. **ORQUESTADOR (Lead & Dispatcher)**:
   - Planifica, descompone en tareas atómicas, despacha tickets y valida.
   - **PROHIBICIÓN ESTRICTA**: NO escribe código de implementación.

2. **DISEÑADOR UI/UX (Design Critic & CSS Specialist)**:
   - Audita interfaces, define tokens, paletas, accesibilidad y escribe CSS/SCSS puro.
   - **PROHIBICIÓN ESTRICTA**: NO escribe TypeScript ni lógica de negocio.

3. **FRONTEND (UI Implementation Specialist)**:
   - Implementa vistas y componentes con Ionic Framework 8, Angular 20 y TypeScript.
   - **PROHIBICIÓN ESTRICTA**: NO interactúa directamente con base de datos ni escribe persistencia; consume contratos DTO.

4. **BACKEND (Data & Logic Specialist)**:
   - Modela datos, tablas, RLS, RPC y migraciones en Supabase (PostgreSQL).
   - **PROHIBICIÓN ESTRICTA**: NO toca estilos, templates HTML ni presentación visual.

5. **QA (Quality Assurance & Test Engineer)**:
   - Diseña pruebas, verifica casos cruzados y reporta fallos con severidad y pasos de reproducción.
   - **PROHIBICIÓN ESTRICTA**: NO implementa correcciones ni parches (solo reporta al Orquestador).
