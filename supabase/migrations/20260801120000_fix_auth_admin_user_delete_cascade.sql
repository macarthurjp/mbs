/*
  protect_user_delete() exempted `auth.role() = 'service_role'`, but that
  helper reads the `request.jwt.claim.role` GUC that only PostgREST sets.
  When Supabase Auth deletes a row from auth.users directly (e.g. via the
  Admin API's deleteUser, used by the superadmin panel and any service-role
  cleanup script), the FK cascade into public.usuarios runs under the
  `supabase_auth_admin` Postgres role, which never has that GUC set, so
  auth.role() returns NULL and the trigger blocked the cascade with
  "No tienes permiso para eliminar usuarios" — breaking every real user
  deletion that goes through auth.users instead of a direct usuarios delete.
*/

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

  IF auth.role() = 'service_role' OR session_user = 'supabase_auth_admin' OR public.is_platform_admin() THEN
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
