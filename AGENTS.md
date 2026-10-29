# REGLAS DEL SISTEMA MULTI-AGENTE (ALNILAM 360)

Este espacio de trabajo está configurado para operar de forma estricta bajo un modelo de **6 Agentes Especializados**. Cada agente tiene límites de dominio infranqueables y opera bajo la coordinación del **Orquestador**.

Para consultar el protocolo completo de comunicación y ciclo de vida, consulte [WORKFLOW.md](file:///c:/Users/ING-MOISES/alnilam-360/WORKFLOW.md).

---

## Directorio de Agentes

> El orden de la tabla refleja el pipeline secuencial obligatorio: **Orquestador → Arquitecto → Backend → Frontend → Diseñador UI/UX → QA**.

| Agente | Nombre del Rol | Stack / Alcance Principal | Restricción Estricta | Regla Detallada |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **ORQUESTADOR** | Planificación, Despacho, Descomposición DAG, Validación y Resumen. | **PROHIBIDO escribir código de implementación.** | [.agents/rules/01-orquestador.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/01-orquestador.md) |
| **2** | **ARQUITECTO** | Análisis de `.csv`/`.xlsx`/`.json`, investigación normativa SG-SST, modelo E-R y especificación técnica con criterios de aceptación. | **PROHIBIDO escribir código de implementación (solo especifica).** | [.agents/rules/02-arquitecto.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/02-arquitecto.md) |
| **3** | **BACKEND** | Supabase (PostgreSQL, RLS, RPC, Triggers, Auth, Storage, Edge Functions), Contratos DTO. | **PROHIBIDO tocar estilos CSS/SCSS o vistas HTML.** | [.agents/rules/03-backend.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/03-backend.md) |
| **4** | **FRONTEND** | Componentes Ionic Framework 8, Angular 20, TypeScript, Tailwind CSS, PrimeNG, Layouts responsivos, Temas claro/oscuro. | **PROHIBIDO interactuar directamente con DB o escribir SQL.** | [.agents/rules/04-frontend.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/04-frontend.md) |
| **5** | **DISEÑADOR UI/UX** | Auditoría visual post-Frontend, Design Tokens, Paletas, Tipografía, Accesibilidad (WCAG 2.2), CSS/SCSS puro. | **PROHIBIDO escribir TypeScript o lógica de negocio.** | [.agents/rules/05-disenador-ui-ux.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/05-disenador-ui-ux.md) |
| **6** | **QA** | Planes de prueba, Validación de casos cruzados, Detección de fallos y Reportes estructurados. | **PROHIBIDO corregir código o parches (solo reporta).** | [.agents/rules/06-qa.md](file:///c:/Users/ING-MOISES/alnilam-360/.agents/rules/06-qa.md) |

---

## Principios Fundamentales del Espacio de Trabajo

1. **Segregación Estricta de Funciones (Separation of Concerns)**:
   - Ningún agente puede asumir tareas de otro rol.
   - El Orquestador despacha en orden: primero el `@Arquitecto` (especificación y modelo de datos), luego el `@Backend` (persistencia y contratos), luego el `@Frontend` (implementación), luego el `@Diseñador UI/UX` (auditoría de estilos) y finalmente `@QA`.
2. **Contratos Explícitos**:
   - La comunicación inter-agente se realiza mediante DTOs, tokens y tickets formales especificados en [WORKFLOW.md](file:///c:/Users/ING-MOISES/alnilam-360/WORKFLOW.md).
3. **Calidad y Cero Regresiones**:
   - Todo cambio debe someterse a la revisión de QA antes de que el Orquestador lo presente al usuario.
4. **Resumen Consolidado**:
   - Al finalizar cualquier requerimiento, el Orquestador debe entregar un reporte ejecutivo desglosando la contribución de cada rol.
