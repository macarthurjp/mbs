/*
  Harden business role permissions.

  Tenant isolation already keeps users inside their business. This migration
  tightens what each role can mutate inside that tenant:
  - Owner/Admin manage products, clients, business settings, payments, and users.
  - Seller can create sales and payments.
  - Seller can only update product stock and client balance as part of a sale.
*/

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

  EXECUTE 'SELECT COALESCE(rol, role, tipo, user_role, '''') FROM public.usuarios WHERE id = $1 LIMIT 1'
    INTO role_value
    USING auth.uid();

  RETURN lower(trim(COALESCE(role_value, '')));
EXCEPTION
  WHEN undefined_column THEN
    EXECUTE 'SELECT COALESCE(rol, '''') FROM public.usuarios WHERE id = $1 LIMIT 1'
      INTO role_value
      USING auth.uid();

    RETURN lower(trim(COALESCE(role_value, '')));
END;
$$;

CREATE OR REPLACE FUNCTION public.is_business_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT replace(public.current_user_role(), '-', '_') IN ('owner', 'dueno', 'dueño');
$$;

CREATE OR REPLACE FUNCTION public.is_business_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT replace(public.current_user_role(), '-', '_') IN ('admin', 'administrador');
$$;

CREATE OR REPLACE FUNCTION public.is_business_seller()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT replace(public.current_user_role(), '-', '_') IN ('vendedor', 'seller');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_current_business()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin() OR public.is_business_owner() OR public.is_business_admin();
$$;

CREATE OR REPLACE FUNCTION public.can_sell_current_business()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_manage_current_business() OR public.is_business_seller();
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_seller() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_current_business() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_sell_current_business() TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_seller_product_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.can_manage_current_business() THEN
    RETURN NEW;
  END IF;

  IF public.is_business_seller()
    AND OLD.negocio_id = public.current_user_negocio_id()
    AND NEW.negocio_id = OLD.negocio_id
    AND COALESCE(NEW.stock, 0) >= 0
    AND COALESCE(NEW.stock, 0) <= COALESCE(OLD.stock, 0)
    AND (to_jsonb(NEW) - 'stock' - 'updated_at') = (to_jsonb(OLD) - 'stock' - 'updated_at')
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'No tienes permiso para modificar datos sensibles del producto';
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_seller_client_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.can_manage_current_business() THEN
    RETURN NEW;
  END IF;

  IF public.is_business_seller()
    AND OLD.negocio_id = public.current_user_negocio_id()
    AND NEW.negocio_id = OLD.negocio_id
    AND (to_jsonb(NEW) - 'saldo' - 'updated_at') = (to_jsonb(OLD) - 'saldo' - 'updated_at')
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'No tienes permiso para modificar datos sensibles del cliente';
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_user_role_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_row jsonb;
  new_row jsonb;
  old_role text;
  new_role text;
BEGIN
  old_row := to_jsonb(OLD);
  new_row := to_jsonb(NEW);
  old_role := replace(lower(COALESCE(old_row->>'rol', old_row->>'role', old_row->>'tipo', old_row->>'user_role', '')), '-', '_');
  new_role := replace(lower(COALESCE(new_row->>'rol', new_row->>'role', new_row->>'tipo', new_row->>'user_role', '')), '-', '_');

  IF auth.role() = 'service_role' OR public.is_platform_admin() THEN
    RETURN NEW;
  END IF;

  IF NOT public.can_manage_current_business() THEN
    IF (new_row->>'negocio_id') IS DISTINCT FROM (old_row->>'negocio_id')
      OR (new_row->>'rol') IS DISTINCT FROM (old_row->>'rol')
      OR (new_row->>'role') IS DISTINCT FROM (old_row->>'role')
      OR (new_row->>'tipo') IS DISTINCT FROM (old_row->>'tipo')
      OR (new_row->>'user_role') IS DISTINCT FROM (old_row->>'user_role')
      OR (new_row->>'activo') IS DISTINCT FROM (old_row->>'activo')
      OR (new_row->>'is_active') IS DISTINCT FROM (old_row->>'is_active')
    THEN
      RAISE EXCEPTION 'No tienes permiso para cambiar roles o permisos de usuario';
    END IF;
  END IF;

  IF public.is_business_admin() THEN
    IF old_role IN ('owner', 'dueno', 'dueño', 'superadmin', 'super_admin')
      OR new_role IN ('owner', 'dueno', 'dueño', 'admin', 'administrador', 'superadmin', 'super_admin')
    THEN
      RAISE EXCEPTION 'Un administrador solo puede gestionar vendedores';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_row jsonb;
  old_role text;
BEGIN
  old_row := to_jsonb(OLD);
  old_role := replace(lower(COALESCE(old_row->>'rol', old_row->>'role', old_row->>'tipo', old_row->>'user_role', '')), '-', '_');

  IF auth.role() = 'service_role' OR public.is_platform_admin() THEN
    RETURN OLD;
  END IF;

  IF OLD.id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminar tu propia cuenta';
  END IF;

  IF public.is_business_admin()
    AND old_role IN ('owner', 'dueno', 'dueño', 'admin', 'administrador', 'superadmin', 'super_admin')
  THEN
    RAISE EXCEPTION 'Un administrador solo puede eliminar vendedores';
  END IF;

  IF NOT public.can_manage_current_business() THEN
    RAISE EXCEPTION 'No tienes permiso para eliminar usuarios';
  END IF;

  RETURN OLD;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.productos') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS protect_seller_product_update_trigger ON public.productos;
    CREATE TRIGGER protect_seller_product_update_trigger
      BEFORE UPDATE ON public.productos
      FOR EACH ROW
      EXECUTE FUNCTION public.protect_seller_product_update();

    ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "productos tenant select" ON public.productos;
    DROP POLICY IF EXISTS "productos tenant insert" ON public.productos;
    DROP POLICY IF EXISTS "productos tenant update" ON public.productos;
    DROP POLICY IF EXISTS "productos tenant delete" ON public.productos;

    CREATE POLICY "productos tenant select"
      ON public.productos
      FOR SELECT
      TO authenticated
      USING (public.is_platform_admin() OR negocio_id = public.current_user_negocio_id());

    CREATE POLICY "productos tenant insert"
      ON public.productos
      FOR INSERT
      TO authenticated
      WITH CHECK (
        public.is_platform_admin()
        OR (public.can_manage_current_business() AND negocio_id = public.current_user_negocio_id())
      );

    CREATE POLICY "productos tenant update"
      ON public.productos
      FOR UPDATE
      TO authenticated
      USING (
        public.is_platform_admin()
        OR (
          negocio_id = public.current_user_negocio_id()
          AND (public.can_manage_current_business() OR public.is_business_seller())
        )
      )
      WITH CHECK (
        public.is_platform_admin()
        OR (
          negocio_id = public.current_user_negocio_id()
          AND (public.can_manage_current_business() OR public.is_business_seller())
        )
      );

    CREATE POLICY "productos tenant delete"
      ON public.productos
      FOR DELETE
      TO authenticated
      USING (
        public.is_platform_admin()
        OR (public.can_manage_current_business() AND negocio_id = public.current_user_negocio_id())
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.clientes') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS protect_seller_client_update_trigger ON public.clientes;
    CREATE TRIGGER protect_seller_client_update_trigger
      BEFORE UPDATE ON public.clientes
      FOR EACH ROW
      EXECUTE FUNCTION public.protect_seller_client_update();

    ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "clientes tenant select" ON public.clientes;
    DROP POLICY IF EXISTS "clientes tenant insert" ON public.clientes;
    DROP POLICY IF EXISTS "clientes tenant update" ON public.clientes;
    DROP POLICY IF EXISTS "clientes tenant delete" ON public.clientes;

    CREATE POLICY "clientes tenant select"
      ON public.clientes
      FOR SELECT
      TO authenticated
      USING (public.is_platform_admin() OR negocio_id = public.current_user_negocio_id());

    CREATE POLICY "clientes tenant insert"
      ON public.clientes
      FOR INSERT
      TO authenticated
      WITH CHECK (
        public.is_platform_admin()
        OR (public.can_manage_current_business() AND negocio_id = public.current_user_negocio_id())
      );

    CREATE POLICY "clientes tenant update"
      ON public.clientes
      FOR UPDATE
      TO authenticated
      USING (
        public.is_platform_admin()
        OR (
          negocio_id = public.current_user_negocio_id()
          AND (public.can_manage_current_business() OR public.is_business_seller())
        )
      )
      WITH CHECK (
        public.is_platform_admin()
        OR (
          negocio_id = public.current_user_negocio_id()
          AND (public.can_manage_current_business() OR public.is_business_seller())
        )
      );

    CREATE POLICY "clientes tenant delete"
      ON public.clientes
      FOR DELETE
      TO authenticated
      USING (
        public.is_platform_admin()
        OR (public.can_manage_current_business() AND negocio_id = public.current_user_negocio_id())
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.ventas') IS NOT NULL THEN
    ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "ventas tenant select" ON public.ventas;
    DROP POLICY IF EXISTS "ventas tenant insert" ON public.ventas;
    DROP POLICY IF EXISTS "ventas tenant update" ON public.ventas;
    DROP POLICY IF EXISTS "ventas tenant delete" ON public.ventas;

    CREATE POLICY "ventas tenant select"
      ON public.ventas
      FOR SELECT
      TO authenticated
      USING (public.is_platform_admin() OR negocio_id = public.current_user_negocio_id());

    CREATE POLICY "ventas tenant insert"
      ON public.ventas
      FOR INSERT
      TO authenticated
      WITH CHECK (
        public.is_platform_admin()
        OR (public.can_sell_current_business() AND negocio_id = public.current_user_negocio_id())
      );

    CREATE POLICY "ventas tenant update"
      ON public.ventas
      FOR UPDATE
      TO authenticated
      USING (
        public.is_platform_admin()
        OR (public.can_manage_current_business() AND negocio_id = public.current_user_negocio_id())
      )
      WITH CHECK (
        public.is_platform_admin()
        OR (public.can_manage_current_business() AND negocio_id = public.current_user_negocio_id())
      );

    CREATE POLICY "ventas tenant delete"
      ON public.ventas
      FOR DELETE
      TO authenticated
      USING (
        public.is_platform_admin()
        OR (public.can_manage_current_business() AND negocio_id = public.current_user_negocio_id())
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.pagos') IS NOT NULL THEN
    ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "pagos tenant select" ON public.pagos;
    DROP POLICY IF EXISTS "pagos tenant insert" ON public.pagos;
    DROP POLICY IF EXISTS "pagos tenant update" ON public.pagos;
    DROP POLICY IF EXISTS "pagos tenant delete" ON public.pagos;

    CREATE POLICY "pagos tenant select"
      ON public.pagos
      FOR SELECT
      TO authenticated
      USING (public.is_platform_admin() OR negocio_id = public.current_user_negocio_id());

    CREATE POLICY "pagos tenant insert"
      ON public.pagos
      FOR INSERT
      TO authenticated
      WITH CHECK (
        public.is_platform_admin()
        OR (public.can_sell_current_business() AND negocio_id = public.current_user_negocio_id())
      );

    CREATE POLICY "pagos tenant update"
      ON public.pagos
      FOR UPDATE
      TO authenticated
      USING (
        public.is_platform_admin()
        OR (public.can_manage_current_business() AND negocio_id = public.current_user_negocio_id())
      )
      WITH CHECK (
        public.is_platform_admin()
        OR (public.can_manage_current_business() AND negocio_id = public.current_user_negocio_id())
      );

    CREATE POLICY "pagos tenant delete"
      ON public.pagos
      FOR DELETE
      TO authenticated
      USING (
        public.is_platform_admin()
        OR (public.can_manage_current_business() AND negocio_id = public.current_user_negocio_id())
      );
  END IF;
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
      USING (
        public.is_platform_admin()
        OR (public.can_manage_current_business() AND id = public.current_user_negocio_id())
      )
      WITH CHECK (
        public.is_platform_admin()
        OR (public.can_manage_current_business() AND id = public.current_user_negocio_id())
      );

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
    DROP TRIGGER IF EXISTS protect_user_role_update_trigger ON public.usuarios;
    CREATE TRIGGER protect_user_role_update_trigger
      BEFORE UPDATE ON public.usuarios
      FOR EACH ROW
      EXECUTE FUNCTION public.protect_user_role_update();

    DROP TRIGGER IF EXISTS protect_user_delete_trigger ON public.usuarios;
    CREATE TRIGGER protect_user_delete_trigger
      BEFORE DELETE ON public.usuarios
      FOR EACH ROW
      EXECUTE FUNCTION public.protect_user_delete();

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
        OR (
          public.can_manage_current_business()
          AND negocio_id = public.current_user_negocio_id()
        )
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
