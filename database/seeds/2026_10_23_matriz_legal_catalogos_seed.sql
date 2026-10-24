-- ============================================================================
-- Seed: catálogos semilla del módulo Matriz Legal.
-- Inserta ESTRUCTURA (componentes de la hoja MENU + tipos de norma), NO datos
-- de requisitos de ejemplo. Idempotente.
--
-- Los componentes se insertan como GLOBALES (empresa_id NULL). Cada empresa los
-- ve y puede añadir propios o desactivar los que no apliquen.
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

-- ── Tipos de norma (jerarquía de Kelsen) ─────────────────────────────────────
INSERT INTO public.catalogo_tipo_norma (nombre, jerarquia)
SELECT t.nombre, t.jerarquia
FROM (VALUES
    ('Constitución Política', 1),
    ('Tratado / Convenio Internacional', 2),
    ('Ley', 3),
    ('Decreto Ley', 4),
    ('Decreto', 5),
    ('Resolución', 6),
    ('Circular', 7),
    ('Acuerdo', 8),
    ('Directiva', 9),
    ('GTC / NTC', 10),
    ('Otra', 99)
) AS t(nombre, jerarquia)
WHERE NOT EXISTS (
    SELECT 1 FROM public.catalogo_tipo_norma c WHERE c.nombre = t.nombre
);
