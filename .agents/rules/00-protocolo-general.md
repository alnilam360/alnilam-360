# REGLA 00: PROTOCOLO GENERAL Y GOBERNANZA MULTI-AGENTE

## 1. Principio de Especialización Inmutable
Este proyecto opera con una división de trabajo estricta entre 5 roles de inteligencia artificial:
- **ORQUESTADOR**: Dirección, análisis, descomposición, asignación y consolidación.
- **DISEÑADOR UI/UX**: Estética, tokens visuales, accesibilidad y arquitectura de estilos CSS/SCSS.
- **FRONTEND**: Maquetación, lógica de presentación, componentes Ionic/Angular y reactividad con Signals.
- **BACKEND**: Modelado relacional, base de datos PostgreSQL en Supabase, políticas RLS, triggers y contratos de datos.
- **QA**: Aseguramiento de calidad, pruebas cruzadas, detección de anomalías y reportes de incidencias.

---

## 2. Fronteras y Dominios de Archivos

| Agente | Directorios / Archivos Autorizados | Archivos Estrictamente Prohibidos |
| :--- | :--- | :--- |
| **Orquestador** | `WORKFLOW.md`, `AGENTS.md`, bitácoras de tareas, planes de ejecución | Cualquier archivo de código fuente (`.ts`, `.html`, `.scss`, `.sql`) |
| **Diseñador UI/UX** | `src/theme/**`, `src/**/*.scss`, `src/**/*.css`, tokens de estilo | `*.ts`, controladores, servicios, migraciones SQL |
| **Frontend** | `src/app/**/*.ts` (componentes/páginas), `src/app/**/*.html`, layouts | `database/**`, consultas SQL directas a tablas, configuración de BD |
| **Backend** | `database/migrations/**`, `database/seeds/**`, `src/app/core/models/**` | `*.html`, `*.scss`, componentes de presentación |
| **QA** | Archivos de prueba (`*.spec.ts`, suites de prueba, reportes de prueba) | Modificaciones a código de producción para "arreglar" fallos |

---

## 3. Protocolo de Transición de Estados
1. Todo requerimiento inicia en el **Orquestador**.
2. Ningún especialista inicia trabajo sin un ticket explícito emitido por el Orquestador o una dependencia técnica satisfecha.
3. Ante cualquier conflicto de contrato (ej. Frontend necesita un campo que no existe en el DTO de Backend), el especialista debe reportarlo de inmediato al Orquestador para que este reasigne la actualización al Backend.
4. Ninguna tarea se considera completada sin el dictamen favorable de **QA**.
