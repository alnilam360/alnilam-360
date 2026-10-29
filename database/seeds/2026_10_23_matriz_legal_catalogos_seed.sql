-- ============================================================================
-- Seed: catálogos semilla del módulo Matriz Legal.
-- Inserta los COMPONENTES de la hoja MENU (dominios SG-SST y Ambiental).
-- Idempotente.
--
-- Los componentes se insertan como GLOBALES (empresa_id NULL). Cada empresa los
-- ve y puede añadir propios o desactivar los que no apliquen.
--
-- NOTA: el catálogo de tipos de norma se eliminó en la migración
-- 2026_10_28_01_matriz_legal_evaluacion_rework.sql (el módulo ya no captura
-- requisitos individuales, solo conteos de cumplimiento por componente).
-- ============================================================================

-- ── Componentes dominio SG-SST (hoja MENU) ──────────────────────────────────
INSERT INTO public.matriz_legal_componentes (empresa_id, dominio, nombre, orden)
SELECT NULL, 'SG_SST', c.nombre, c.orden
FROM (VALUES
    ('ATEL', 10),
    ('Riesgo Biológico', 20),
    ('Riesgo Físico', 30),
    ('Riesgo Eléctrico', 40),
    ('Emergencias', 50),
    ('Psicosocial', 60),
    ('Vial', 70),
    ('SGRP', 80),
    ('SST General', 90),
    ('Laboral', 100)
) AS c(nombre, orden)
WHERE NOT EXISTS (
    SELECT 1 FROM public.matriz_legal_componentes m
    WHERE m.empresa_id IS NULL AND m.dominio = 'SG_SST' AND m.nombre = c.nombre
);

-- ── Componentes dominio Ambiental (hoja MENU) ───────────────────────────────
INSERT INTO public.matriz_legal_componentes (empresa_id, dominio, nombre, orden)
SELECT NULL, 'AMBIENTAL', c.nombre, c.orden
FROM (VALUES
    ('Agua', 10),
    ('Energía', 20),
    ('Aire', 30),
    ('Residuos', 40),
    ('Otra Normatividad Ambiental', 50)
) AS c(nombre, orden)
WHERE NOT EXISTS (
    SELECT 1 FROM public.matriz_legal_componentes m
    WHERE m.empresa_id IS NULL AND m.dominio = 'AMBIENTAL' AND m.nombre = c.nombre
);
