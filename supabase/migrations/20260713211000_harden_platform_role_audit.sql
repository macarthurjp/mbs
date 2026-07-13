/*
  Follow-up hardening for the platform-role audit introduced in 210000.

  The live usuarios schema uses rol as its only application-role column, so
  current_user_role() must not probe legacy column names and rely on an
  undefined_column exception for every authorization check.

  Audit evidence is immutable. Platform administrators may only change the
  review decision; the reviewer and timestamp are always assigned by the
  database from the authenticated session.
*/

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.normalize_app_role(COALESCE((
    SELECT usuario.rol
    FROM public.usuarios AS usuario
    WHERE usuario.id = auth.uid()
    LIMIT 1
  ), ''));
$$;

CREATE OR REPLACE FUNCTION public.protect_platform_role_audit_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Solo un super administrador puede revisar esta auditoría';
  END IF;

  IF (to_jsonb(NEW) - 'review_status' - 'reviewed_at' - 'reviewed_by')
    IS DISTINCT FROM
    (to_jsonb(OLD) - 'review_status' - 'reviewed_at' - 'reviewed_by')
  THEN
    RAISE EXCEPTION 'La evidencia histórica de auditoría no se puede modificar';
  END IF;

  IF NEW.review_status IS DISTINCT FROM OLD.review_status THEN
    NEW.reviewed_at := now();
    NEW.reviewed_by := auth.uid();
  ELSE
    -- Ignore attempts to forge reviewer metadata without a real decision.
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.reviewed_by := OLD.reviewed_by;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_platform_role_audit_update_trigger
  ON public.platform_role_audit;

CREATE TRIGGER protect_platform_role_audit_update_trigger
  BEFORE UPDATE ON public.platform_role_audit
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_platform_role_audit_update();

REVOKE UPDATE ON public.platform_role_audit FROM authenticated;
GRANT UPDATE (review_status) ON public.platform_role_audit TO authenticated;

REVOKE ALL ON FUNCTION public.protect_platform_role_audit_update() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
