/*
  notifications RLS only checked negocio_id (from the generic tenant policy
  loop in harden_saas_tenant_rls.sql), never the row's own `user_id` /
  `audience` columns — even though the app already relies on those columns
  to hide admin-only and personal notifications from other roles
  (src/contexts/NotificationContext.tsx canSeeNotification()). Any
  authenticated tenant member could read (and, since UPDATE/DELETE had the
  same tenant-only check, mark-read or delete) another user's personal
  notifications or admin/owner-only broadcasts via a direct API call,
  bypassing the client-side filter entirely.

  can_see_notification() mirrors canSeeNotification() exactly so DB-level
  access matches what the UI already shows: a row with user_id set is only
  visible to that user; an 'admin' broadcast needs
  can_manage_current_business(); a sales-team broadcast needs
  can_sell_current_business(); 'user'/'superadmin'/'super_admin'/'platform'
  audience rows with no user_id are platform-admin-only; anything else is a
  general same-tenant broadcast. Platform admins additionally see
  broadcast-audience rows across all tenants, matching the client's
  isSuperAdmin branch.

  INSERT is left on the existing tenant-only check: several pages
  (SalesPage, ProductsPage, PurchasesPage, CashboxPage, AccountsReceivablePage,
  SupportPage, SupportTicketsPage) insert notifications directly as
  owner/admin/seller for legitimate in-tenant events, and auditing every
  audience/user_id combination those call sites are allowed to use is a
  separate piece of work from the read/write-of-existing-rows leak fixed
  here.
*/

CREATE OR REPLACE FUNCTION public.can_see_notification(
  p_negocio_id uuid,
  p_user_id uuid,
  p_audience text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN p_user_id IS NOT NULL THEN p_user_id = auth.uid()
      WHEN public.is_platform_admin() THEN
        lower(COALESCE(p_audience, '')) IN (
          'admin', 'sales_team', 'sales-team', 'sales team', 'seller', 'vendedor',
          'superadmin', 'super_admin', 'platform'
        )
      WHEN p_negocio_id IS DISTINCT FROM public.current_user_negocio_id() THEN false
      WHEN lower(COALESCE(p_audience, '')) = 'admin' THEN public.can_manage_current_business()
      WHEN lower(COALESCE(p_audience, '')) IN ('sales_team', 'sales-team', 'sales team', 'seller', 'vendedor') THEN public.can_sell_current_business()
      WHEN lower(COALESCE(p_audience, '')) IN ('user', 'superadmin', 'super_admin', 'platform') THEN false
      ELSE true
    END;
$$;

GRANT EXECUTE ON FUNCTION public.can_see_notification(uuid, uuid, text) TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.notifications') IS NOT NULL THEN
    DROP POLICY IF EXISTS "notifications tenant select" ON public.notifications;
    DROP POLICY IF EXISTS "notifications tenant update" ON public.notifications;
    DROP POLICY IF EXISTS "notifications tenant delete" ON public.notifications;

    CREATE POLICY "notifications tenant select"
      ON public.notifications
      FOR SELECT
      TO authenticated
      USING (public.can_see_notification(negocio_id, user_id, audience));

    CREATE POLICY "notifications tenant update"
      ON public.notifications
      FOR UPDATE
      TO authenticated
      USING (public.can_see_notification(negocio_id, user_id, audience))
      WITH CHECK (public.can_see_notification(negocio_id, user_id, audience));

    CREATE POLICY "notifications tenant delete"
      ON public.notifications
      FOR DELETE
      TO authenticated
      USING (public.can_see_notification(negocio_id, user_id, audience));
  END IF;
END;
$$;
