/*
  Fix privilege escalation: any business owner could grant themselves (or
  any user in their own tenant) platform super-admin rights, or move a user
  to a different business, via a direct `usuarios` UPDATE.

  protect_user_role_update() only restricted role/negocio_id changes when
  the actor could NOT manage the current business
  (`NOT can_manage_current_business()`), and can_manage_current_business()
  is true for owners. Nothing stopped an owner running
  `update usuarios set rol = 'super_admin' where id = auth.uid()` on their
  own row (RLS already allows `id = auth.uid()` unconditionally) — and
  is_platform_admin() is defined as exactly that role check, so this was a
  one-call path from "new signup" (always created as 'owner', see
  LoginPage.tsx) to full cross-tenant platform access.

  Same root cause let any owner/admin write negocios.estado/plan directly
  (bypassing Stripe — RLS there only checks can_manage_current_business()),
  and let any authenticated user in a tenant, seller included, write
  suscripciones directly (its RLS from harden_saas_tenant_rls.sql only
  checks negocio_id, never role). Both are billing sources of truth that
  should only ever move via Stripe webhooks, the sync job, or the
  superadmin panel — all of which already run as service_role or as an
  actual platform admin, so none of the fixes below change any legitimate
  call path.
*/

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

  IF new_role IN ('superadmin', 'super_admin') THEN
    RAISE EXCEPTION 'Solo un super administrador puede asignar ese rol';
  END IF;

  IF (new_row->>'negocio_id') IS DISTINCT FROM (old_row->>'negocio_id') THEN
    RAISE EXCEPTION 'No tienes permiso para reasignar el negocio de un usuario';
  END IF;

  IF NOT public.can_manage_current_business() THEN
    IF (new_row->>'rol') IS DISTINCT FROM (old_row->>'rol')
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

-- negocios.estado/plan are the billing source of truth (set by Stripe
-- webhooks, the subscription sync job, or the superadmin panel) and must
-- not be writable by the business's own owner/admin.
CREATE OR REPLACE FUNCTION public.protect_business_billing_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_platform_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.estado IS DISTINCT FROM OLD.estado OR NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION 'No tienes permiso para cambiar el estado o plan del negocio';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.negocios') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS protect_business_billing_fields_trigger ON public.negocios;
    CREATE TRIGGER protect_business_billing_fields_trigger
      BEFORE UPDATE ON public.negocios
      FOR EACH ROW
      EXECUTE FUNCTION public.protect_business_billing_fields();
  END IF;
END;
$$;

-- suscripciones is written only by Stripe webhooks, the subscription sync
-- job, and the superadmin panel (all service_role or an actual platform
-- admin) — never by a tenant's own owner/admin/seller.
CREATE OR REPLACE FUNCTION public.protect_subscription_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_platform_admin() THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'No tienes permiso para modificar la suscripción';
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.suscripciones') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS protect_subscription_changes_trigger ON public.suscripciones;
    CREATE TRIGGER protect_subscription_changes_trigger
      BEFORE INSERT OR UPDATE OR DELETE ON public.suscripciones
      FOR EACH ROW
      EXECUTE FUNCTION public.protect_subscription_changes();
  END IF;
END;
$$;
