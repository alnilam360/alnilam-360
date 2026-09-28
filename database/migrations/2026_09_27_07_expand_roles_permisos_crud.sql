-- ============================================================================
-- Alnilam 360 - Expansión de Permisos por Rol (CRUD Granular y Submódulos)
-- Añade columnas para:
--   - puede_crear (Crear registros)
--   - puede_editar (Modificar registros)
--   - puede_eliminar (Borrar registros)
--   - updated_at (Auditoría de cambios)
-- Y asegura unicidad por (rol_id, modulo_id).
-- ============================================================================

DO $$
BEGIN
    -- 1. Añadir columnas CRUD si no existen
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles_permisos' AND column_name = 'puede_crear'
    ) THEN
        ALTER TABLE public.roles_permisos 
        ADD COLUMN puede_crear boolean NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles_permisos' AND column_name = 'puede_editar'
    ) THEN
        ALTER TABLE public.roles_permisos 
        ADD COLUMN puede_editar boolean NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles_permisos' AND column_name = 'puede_eliminar'
    ) THEN
        ALTER TABLE public.roles_permisos 
        ADD COLUMN puede_eliminar boolean NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roles_permisos' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.roles_permisos 
        ADD COLUMN updated_at timestamp with time zone DEFAULT now();
    END IF;

    -- 2. Asegurar que puede_ver tenga default false y no sea nulo
    ALTER TABLE public.roles_permisos 
    ALTER COLUMN puede_ver SET DEFAULT false;

    UPDATE public.roles_permisos 
    SET puede_ver = false 
    WHERE puede_ver IS NULL;

    ALTER TABLE public.roles_permisos 
    ALTER COLUMN puede_ver SET NOT NULL;

    -- 3. Crear índice único para evitar duplicidad de módulo por rol
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'roles_permisos' AND indexname = 'uq_roles_permisos_rol_modulo'
    ) THEN
        CREATE UNIQUE INDEX uq_roles_permisos_rol_modulo ON public.roles_permisos(rol_id, modulo_id);
    END IF;
END $$;
