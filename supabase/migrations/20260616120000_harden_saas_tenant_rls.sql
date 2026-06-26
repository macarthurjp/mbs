/*
  Harden SaaS tenant isolation.

  This migration is intentionally idempotent and conditional because the project
  has evolved from a single-store POS into a multi-tenant SaaS. It only touches
  tables/columns that exist in the target database.
*/

CREATE OR REPLACE FUNCTION public.current_user_negocio_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  negocio uuid;
BEGIN
  IF auth.uid() IS NULL OR to_regclass('public.usuarios') IS NULL THEN
    RETURN NULL;
  END IF;

  EXECUTE 'SELECT negocio_id FROM public.usuarios WHERE id = $1 LIMIT 1'
    INTO negocio
    USING auth.uid();

  RETURN negocio;
EXCEPTION
  WHEN undefined_column THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_value text;
BEGIN
  IF auth.uid() IS NULL OR to_regclass('public.usuarios') IS NULL THEN
    RETURN '';
  END IF;

  EXECUTE 'SELECT COALESCE(rol, '''') FROM public.usuarios WHERE id = $1 LIMIT 1'
    INTO role_value
    USING auth.uid();

  RETURN lower(trim(COALESCE(role_value, '')));
EXCEPTION
  WHEN undefined_column THEN
    RETURN '';
END;
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT replace(public.current_user_role(), '-', '_') IN ('superadmin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_current_business()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT replace(public.current_user_role(), '-', '_') IN (
    'owner',
    'dueno',
    'dueño',
    'admin',
    'administrador',
    'superadmin',
    'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_negocio_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_current_business() TO authenticated;

DO $$
DECLARE
  tenant_table text;
BEGIN
  FOREACH tenant_table IN ARRAY ARRAY[
    'suscripciones',
    'productos',
    'clientes',
    'ventas',
    'pagos',
    'compras',
    'cotizaciones',
    'audit_logs',
    'support_tickets',
    'notifications'
  ]
  LOOP
    IF to_regclass(format('public.%I', tenant_table)) IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = tenant_table
          AND column_name = 'negocio_id'
      )
    THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tenant_table);

      EXECUTE format('DROP POLICY IF EXISTS "%s tenant select" ON public.%I', tenant_table, tenant_table);
      EXECUTE format('DROP POLICY IF EXISTS "%s tenant insert" ON public.%I', tenant_table, tenant_table);
      EXECUTE format('DROP POLICY IF EXISTS "%s tenant update" ON public.%I', tenant_table, tenant_table);
      EXECUTE format('DROP POLICY IF EXISTS "%s tenant delete" ON public.%I', tenant_table, tenant_table);

      EXECUTE format(
        'CREATE POLICY "%s tenant select" ON public.%I FOR SELECT TO authenticated USING (public.is_platform_admin() OR negocio_id = public.current_user_negocio_id())',
        tenant_table,
        tenant_table
      );

      EXECUTE format(
        'CREATE POLICY "%s tenant insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin() OR negocio_id = public.current_user_negocio_id())',
        tenant_table,
        tenant_table
      );

      EXECUTE format(
        'CREATE POLICY "%s tenant update" ON public.%I FOR UPDATE TO authenticated USING (public.is_platform_admin() OR negocio_id = public.current_user_negocio_id()) WITH CHECK (public.is_platform_admin() OR negocio_id = public.current_user_negocio_id())',
        tenant_table,
        tenant_table
      );

      EXECUTE format(
        'CREATE POLICY "%s tenant delete" ON public.%I FOR DELETE TO authenticated USING (public.is_platform_admin() OR negocio_id = public.current_user_negocio_id())',
        tenant_table,
        tenant_table
      );
    END IF;
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.negocios') IS NOT NULL THEN
    ALTER TABLE public.negocios ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "negocios tenant select" ON public.negocios;
    DROP POLICY IF EXISTS "negocios tenant insert" ON public.negocios;
    DROP POLICY IF EXISTS "negocios tenant update" ON public.negocios;
    DROP POLICY IF EXISTS "negocios tenant delete" ON public.negocios;

    CREATE POLICY "negocios tenant select"
      ON public.negocios
      FOR SELECT
      TO authenticated
      USING (public.is_platform_admin() OR id = public.current_user_negocio_id());

    CREATE POLICY "negocios tenant insert"
      ON public.negocios
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_platform_admin());

    CREATE POLICY "negocios tenant update"
      ON public.negocios
      FOR UPDATE
      TO authenticated
      USING (public.is_platform_admin() OR id = public.current_user_negocio_id())
      WITH CHECK (public.is_platform_admin() OR id = public.current_user_negocio_id());

    CREATE POLICY "negocios tenant delete"
      ON public.negocios
      FOR DELETE
      TO authenticated
      USING (public.is_platform_admin());
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.usuarios') IS NOT NULL THEN
    ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "usuarios tenant select" ON public.usuarios;
    DROP POLICY IF EXISTS "usuarios tenant insert own profile" ON public.usuarios;
    DROP POLICY IF EXISTS "usuarios tenant update own or business" ON public.usuarios;
    DROP POLICY IF EXISTS "usuarios tenant delete business" ON public.usuarios;

    CREATE POLICY "usuarios tenant select"
      ON public.usuarios
      FOR SELECT
      TO authenticated
      USING (
        public.is_platform_admin()
        OR id = auth.uid()
        OR negocio_id = public.current_user_negocio_id()
      );

    CREATE POLICY "usuarios tenant insert own profile"
      ON public.usuarios
      FOR INSERT
      TO authenticated
      WITH CHECK (
        public.is_platform_admin()
        OR id = auth.uid()
        OR negocio_id = public.current_user_negocio_id()
      );

    CREATE POLICY "usuarios tenant update own or business"
      ON public.usuarios
      FOR UPDATE
      TO authenticated
      USING (
        public.is_platform_admin()
        OR id = auth.uid()
        OR (
          public.can_manage_current_business()
          AND negocio_id = public.current_user_negocio_id()
        )
      )
      WITH CHECK (
        public.is_platform_admin()
        OR id = auth.uid()
        OR (
          public.can_manage_current_business()
          AND negocio_id = public.current_user_negocio_id()
        )
      );

    CREATE POLICY "usuarios tenant delete business"
      ON public.usuarios
      FOR DELETE
      TO authenticated
      USING (
        public.is_platform_admin()
        OR (
          public.can_manage_current_business()
          AND negocio_id = public.current_user_negocio_id()
          AND id <> auth.uid()
        )
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.notification_settings') IS NOT NULL THEN
    ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "notification settings own select" ON public.notification_settings;
    DROP POLICY IF EXISTS "notification settings own insert" ON public.notification_settings;
    DROP POLICY IF EXISTS "notification settings own update" ON public.notification_settings;
    DROP POLICY IF EXISTS "notification settings own delete" ON public.notification_settings;

    CREATE POLICY "notification settings own select"
      ON public.notification_settings
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid() OR public.is_platform_admin());

    CREATE POLICY "notification settings own insert"
      ON public.notification_settings
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid() OR public.is_platform_admin());

    CREATE POLICY "notification settings own update"
      ON public.notification_settings
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid() OR public.is_platform_admin())
      WITH CHECK (user_id = auth.uid() OR public.is_platform_admin());

    CREATE POLICY "notification settings own delete"
      ON public.notification_settings
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid() OR public.is_platform_admin());
  END IF;
END;
$$;
