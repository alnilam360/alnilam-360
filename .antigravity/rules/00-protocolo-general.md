---
trigger: always_on
description: Gobernanza multi-agente ALNILAM 360 — 6 roles, dominios de archivos y protocolo de transición. Siempre activa.
---

# REGLA 00: PROTOCOLO GENERAL Y GOBERNANZA MULTI-AGENTE

## 1. Principio de Especialización Inmutable
Este proyecto opera con una división de trabajo estricta entre 6 roles de inteligencia artificial:
- **ORQUESTADOR**: Dirección, análisis, descomposición, asignación y consolidación.
- **ARQUITECTO**: Análisis de archivos fuente, investigación normativa SG-SST, modelo de datos y especificación técnica con criterios de aceptación.
- **BACKEND**: Modelado relacional, base de datos PostgreSQL en Supabase, políticas RLS, triggers y contratos de datos.
- **FRONTEND**: Maquetación, lógica de presentación, componentes Ionic/Angular, Tailwind, PrimeNG y reactividad con Signals.
- **DISEÑADOR UI/UX**: Auditoría estética posterior al Frontend, tokens visuales, accesibilidad y arquitectura de estilos CSS/SCSS.
- **QA**: Aseguramiento de calidad, pruebas cruzadas, detección de anomalías y reportes de incidencias.

---

## 2. Fronteras y Dominios de Archivos

| Agente | Directorios / Archivos Autorizados | Archivos Estrictamente Prohibidos |
| :--- | :--- | :--- |
| **Orquestador** | `WORKFLOW.md`, `AGENTS.md`, bitácoras de tareas, planes de ejecución | Cualquier archivo de código fuente (`.ts`, `.html`, `.scss`, `.sql`) |
| **Arquitecto** | `docs/especificaciones/**`, `docs/normativa/**`, lectura de fuentes `.csv`/`.xlsx`/`.json` | Todo código de implementación (`.ts`, `.html`, `.scss`, `.sql`, migraciones) |
| **Backend** | `database/migrations/**`, `database/seeds/**`, `src/app/core/models/**`, `supabase/functions/**` | `*.html`, `*.scss`, componentes de presentación |
| **Frontend** | `src/app/**/*.ts` (componentes/páginas), `src/app/**/*.html`, layouts | `database/**`, consultas SQL directas a tablas, configuración de BD |
| **Diseñador UI/UX** | `src/theme/**`, `src/**/*.scss`, `src/**/*.css`, tokens de estilo | `*.ts`, controladores, servicios, migraciones SQL |
| **QA** | Archivos de prueba (`*.spec.ts`, suites de prueba, reportes de prueba) | Modificaciones a código de producción para "arreglar" fallos |

---

## 3. Protocolo de Transición de Estados
1. Todo requerimiento inicia en el **Orquestador**.
2. Ningún especialista inicia trabajo sin un ticket explícito emitido por el Orquestador o una dependencia técnica satisfecha.
3. Ante cualquier conflicto de contrato (ej. Frontend necesita un campo que no existe en el DTO de Backend), el especialista debe reportarlo de inmediato al Orquestador para que este reasigne la actualización al Backend.
4. Ninguna tarea se considera completada sin el dictamen favorable de **QA**.
