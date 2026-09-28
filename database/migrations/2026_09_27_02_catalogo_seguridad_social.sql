-- ============================================================================
-- Alnilam 360 - Catálogo de Seguridad Social Colombiana
-- Entidades Promotoras de Salud (EPS), Administradoras de Riesgos Laborales (ARL)
-- y Administradoras de Fondos de Pensiones (AFP / Fondos de Pensiones)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.catalogo_seguridad_social (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo        text NOT NULL CHECK (tipo IN ('EPS', 'ARL', 'PENSION')),
    codigo      text,
    nombre      text NOT NULL,
    sigla       text,
    regimen     text,
    orden       integer NOT NULL DEFAULT 10,
    activo      boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Índices de búsqueda
CREATE INDEX IF NOT EXISTS idx_cat_seg_social_tipo ON public.catalogo_seguridad_social(tipo);
CREATE INDEX IF NOT EXISTS idx_cat_seg_social_activo ON public.catalogo_seguridad_social(activo);
CREATE INDEX IF NOT EXISTS idx_cat_seg_social_orden ON public.catalogo_seguridad_social(orden);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cat_seg_social_tipo_nombre ON public.catalogo_seguridad_social(tipo, nombre);

-- RLS: Tabla paramétrica pública de lectura
ALTER TABLE public.catalogo_seguridad_social ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'catalogo_seguridad_social' AND policyname = 'cat_seg_social_select'
    ) THEN
        CREATE POLICY cat_seg_social_select ON public.catalogo_seguridad_social
            FOR SELECT USING (true);
    END IF;
END $$;

-- ============================================================================
-- SEED DATA: EPS Vigentes en Colombia (Supersalud)
-- ============================================================================
INSERT INTO public.catalogo_seguridad_social (tipo, codigo, nombre, sigla, regimen, orden)
VALUES
    ('EPS', 'EPS001', 'EPS Sanitas', 'SANITAS', 'Contributivo / Subsidiado', 10),
    ('EPS', 'EPS002', 'EPS SURA (Suramericana)', 'SURA', 'Contributivo / Subsidiado', 20),
    ('EPS', 'EPS003', 'Nueva EPS', 'NUEVA EPS', 'Contributivo / Subsidiado', 30),
    ('EPS', 'EPS004', 'Compensar EPS', 'COMPENSAR', 'Contributivo / Subsidiado', 40),
    ('EPS', 'EPS005', 'Salud Total EPS', 'SALUD TOTAL', 'Contributivo / Subsidiado', 50),
    ('EPS', 'EPS006', 'Famisanar EPS', 'FAMISANAR', 'Contributivo / Subsidiado', 60),
    ('EPS', 'EPS007', 'Coosalud EPS', 'COOSALUD', 'Contributivo / Subsidiado', 70),
    ('EPS', 'EPS008', 'Mutual Ser EPS', 'MUTUAL SER', 'Contributivo / Subsidiado', 80),
    ('EPS', 'EPS009', 'Capital Salud EPS', 'CAPITAL SALUD', 'Subsidiado / Contributivo', 90),
    ('EPS', 'EPS010', 'Asmet Salud EPS', 'ASMET SALUD', 'Subsidiado / Contributivo', 100),
    ('EPS', 'EPS011', 'Savia Salud EPS', 'SAVIA SALUD', 'Subsidiado / Contributivo', 110),
    ('EPS', 'EPS012', 'Emssanar EPS', 'EMSSANAR', 'Subsidiado / Contributivo', 120),
    ('EPS', 'EPS013', 'Servicio Occidental de Salud (S.O.S. EPS)', 'S.O.S.', 'Contributivo', 130),
    ('EPS', 'EPS014', 'Aliansalud EPS', 'ALIANSALUD', 'Contributivo', 140),
    ('EPS', 'EPS015', 'Comfenalco Valle EPS', 'COMFENALCO', 'Contributivo / Subsidiado', 150),
    ('EPS', 'EPS016', 'Cajacopi EPS', 'CAJACOPI', 'Subsidiado / Contributivo', 160),
    ('EPS', 'EPS017', 'Capresoca EPS', 'CAPRESOCA', 'Subsidiado / Contributivo', 170),
    ('EPS', 'EPS018', 'Salud Mía EPS', 'SALUD MIA', 'Contributivo', 180),
    ('EPS', 'EPS019', 'EPS Familiar de Colombia', 'FAMILIAR', 'Subsidiado', 190),
    ('EPS', 'EPS020', 'Comfachocó EPS', 'COMFACHOCO', 'Subsidiado', 200),
    ('EPS', 'EPS021', 'Comfaoriente EPS', 'COMFAORIENTE', 'Subsidiado', 210),
    ('EPS', 'EPS022', 'Dusakawi EPSI', 'DUSAKAWI', 'Indígena', 220),
    ('EPS', 'EPS023', 'Asociación Indígena del Cauca (AIC EPSI)', 'AIC', 'Indígena', 230),
    ('EPS', 'EPS024', 'Anas Wayuu EPSI', 'ANAS WAYUU', 'Indígena', 240),
    ('EPS', 'EPS025', 'Mallamas EPSI', 'MALLAMAS', 'Indígena', 250),
    ('EPS', 'EPS026', 'Pijaos Salud EPSI', 'PIJAOS SALUD', 'Indígena', 260),
    ('EPS', 'EPS027', 'Fondo de Pasivo Social de Ferrocarriles Nacionales', 'FPS FERROCARRILES', 'Excepción / Especial', 270),
    ('EPS', 'EPS028', 'Dirección General de Sanidad Militar y Policial', 'SANIDAD FUERZAS MILITARES', 'Excepción / Especial', 280),
    ('EPS', 'EPS029', 'Fondo Nacional del Magisterio (FOMAG)', 'FOMAG', 'Excepción / Especial', 290)
ON CONFLICT (tipo, nombre) DO UPDATE 
SET codigo = EXCLUDED.codigo, sigla = EXCLUDED.sigla, regimen = EXCLUDED.regimen, orden = EXCLUDED.orden, activo = true;

-- ============================================================================
-- SEED DATA: ARL Vigentes en Colombia (Fasecolda / MinTrabajo)
-- ============================================================================
INSERT INTO public.catalogo_seguridad_social (tipo, codigo, nombre, sigla, regimen, orden)
VALUES
    ('ARL', 'ARL001', 'Positiva Compañía de Seguros S.A.', 'POSITIVA', 'Pública', 10),
    ('ARL', 'ARL002', 'Seguros de Riesgos Laborales Suramericana S.A. (ARL SURA)', 'ARL SURA', 'Privada', 20),
    ('ARL', 'ARL003', 'AXA Colpatria Seguros S.A.', 'AXA COLPATRIA', 'Privada', 30),
    ('ARL', 'ARL004', 'Colmena Seguros (Colmena Riesgos Laborales)', 'COLMENA', 'Privada', 40),
    ('ARL', 'ARL005', 'Compañía de Seguros Bolívar S.A.', 'BOLIVAR', 'Privada', 50),
    ('ARL', 'ARL006', 'Seguros de Vida Alfa S.A.', 'ALFA', 'Privada', 60),
    ('ARL', 'ARL007', 'La Equidad Seguros de Vida Organismo Cooperativo', 'LA EQUIDAD', 'Cooperativa / Privada', 70),
    ('ARL', 'ARL008', 'Mapfre Colombia Vida Seguros S.A.', 'MAPFRE', 'Privada', 80),
    ('ARL', 'ARL009', 'Liberty Seguros de Vida S.A.', 'LIBERTY', 'Privada', 90),
    ('ARL', 'ARL010', 'Compañía de Seguros de Vida Aurora S.A.', 'AURORA', 'Privada', 100),
    ('ARL', 'ARL011', 'Compañía de Seguros Colsanitas S.A.', 'COLSANITAS', 'Privada', 110)
ON CONFLICT (tipo, nombre) DO UPDATE 
SET codigo = EXCLUDED.codigo, sigla = EXCLUDED.sigla, regimen = EXCLUDED.regimen, orden = EXCLUDED.orden, activo = true;

-- ============================================================================
-- SEED DATA: Fondos de Pensiones y Cesantías en Colombia (Superfinanciera)
-- ============================================================================
INSERT INTO public.catalogo_seguridad_social (tipo, codigo, nombre, sigla, regimen, orden)
VALUES
    ('PENSION', 'AFP001', 'Colpensiones (Administradora Colombiana de Pensiones)', 'COLPENSIONES', 'Público (RPM)', 10),
    ('PENSION', 'AFP002', 'Porvenir S.A.', 'PORVENIR', 'Privado (RAIS)', 20),
    ('PENSION', 'AFP003', 'Protección S.A.', 'PROTECCION', 'Privado (RAIS)', 30),
    ('PENSION', 'AFP004', 'Colfondos S.A.', 'COLFONDOS', 'Privado (RAIS)', 40),
    ('PENSION', 'AFP005', 'Skandia Pensiones y Cesantías S.A.', 'SKANDIA', 'Privado (RAIS)', 50),
    ('PENSION', 'AFP006', 'Fondo Nacional de Prestaciones Sociales del Magisterio (FOMAG)', 'FOMAG', 'Régimen Especial', 60),
    ('PENSION', 'AFP007', 'Caja de Retiro de las Fuerzas Militares (CREMIL)', 'CREMIL', 'Régimen Especial', 70),
    ('PENSION', 'AFP008', 'Caja de Sueldos de Retiro de la Policía Nacional (CASUR)', 'CASUR', 'Régimen Especial', 80)
ON CONFLICT (tipo, nombre) DO UPDATE 
SET codigo = EXCLUDED.codigo, sigla = EXCLUDED.sigla, regimen = EXCLUDED.regimen, orden = EXCLUDED.orden, activo = true;
