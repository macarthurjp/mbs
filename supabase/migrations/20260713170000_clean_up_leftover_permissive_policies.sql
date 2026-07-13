/*
  20260706180000_close_cross_tenant_rls_leak.sql cleaned up leftover
  wide-open PERMISSIVE policies on productos/compras/clientes/pagos/
  venta_items/ventas, but missed several other tables that had the same
  problem: Postgres OR's together every matching PERMISSIVE policy for a
  command, so a single leftover `USING (true)` policy silently defeats any
  number of properly tenant/role-scoped policies alongside it. Found by
  querying pg_policies directly against the live database rather than
  trusting the migration history (several of these were never created via
  a tracked migration in this repo, likely added ad hoc via the SQL editor).

  - negocios: "authenticated_users_can_select_negocios" (SELECT, true) let
    any authenticated user read every business's row (name, contact info,
    plan, tax id, etc.) regardless of tenant. Also drops
    "authenticated_users_can_insert_negocios" (INSERT, only checked
    auth.uid() IS NOT NULL) and three older redundant-but-safe policies
    ("negocios_all_by_usuario", "negocios_select_by_business",
    "negocios_update_by_admin") to leave exactly one clean policy per
    command, matching the "negocios tenant *" set from
    20260617114000_harden_role_permissions.sql. No legitimate client path
    relies on the dropped ones: negocios rows are created by the
    create-business edge function via service_role, which bypasses RLS.

  - cashbox_closures: had ONLY "true" policies for SELECT/INSERT/UPDATE —
    no tenant scoping ever existed, not even a redundant safe one, and the
    table never had a negocio_id column to scope by in the first place
    (confirmed live: no src/ code writes to this table today — CashboxPage
    has no closure feature currently — SettingsPage.tsx's backup config
    references a "negocio_id" field on it that doesn't exist, so that
    table's entry in the per-business backup has been silently broken).
    Adds negocio_id the same way the gift_cards fix did, backfilling from
    opened_by/closed_by's own negocio_id (no-op today: table has 0 rows),
    so backups and RLS can actually scope by tenant going forward.

  - notifications: had "authenticated users can {read,create,update,delete}
    notifications" (all `true`) alongside both the older
    "Users can {read,update} business notifications" and the new
    "notifications tenant *" policies from
    20260713150000_fix_notifications_audience_rls.sql — the `true` ones
    made that whole migration a no-op, which live testing caught (a seller
    could still read and delete an admin-only notification). Drops the wide
    -open ones and the now-redundant older scoped pair.

  - support_tickets: "authenticated_can_create_support_ticket" (INSERT,
    true) let any authenticated user open a ticket under any negocio_id.
    SupportPage.tsx legitimately inserts with negocio_id: null for a user
    who hasn't been assigned a business yet (mid-onboarding), which the
    existing "support_tickets tenant insert" WITH CHECK didn't allow for
    (negocio_id = current_user_negocio_id() is never true when both sides
    are null) — that's why the wide-open policy was there. Replaces it with
    a WITH CHECK that explicitly allows negocio_id IS NULL paired with
    user_id = auth.uid(), instead of leaving the door open for any
    negocio_id. Also drops the older, case-sensitive duplicate superadmin
    policies ("superadmin_can_view_all_support_tickets",
    "superadmin_can_update_all_support_tickets") in favor of the newer
    case-insensitive ones that already cover the same intent
    ("superadmin_select_all_support_tickets",
    "superadmin_update_all_support_tickets").

  - user_profiles: a distinct, unrelated legacy table (no negocio_id column,
    zero references anywhere in src/ or supabase/functions/, 0 rows) from
    before the usuarios/negocio_id multi-tenant model. Had
    "Allow anonymous to read profiles for login" (SELECT, true, role anon)
    — an unauthenticated read of every row, and four
    "Admins can ..." policies gated by get_user_role(), a function that
    reads user_profiles.role and always returns 'seller' since the table
    has never had rows for any current user (dormant, but a landmine if
    anyone ever inserts into it again). Drops all of those; keeps
    "Users can read/update own profile" (auth.uid() = id) since it's
    harmless self-access.
*/

DROP POLICY IF EXISTS "authenticated_users_can_select_negocios" ON public.negocios;
DROP POLICY IF EXISTS "authenticated_users_can_insert_negocios" ON public.negocios;
DROP POLICY IF EXISTS "negocios_all_by_usuario" ON public.negocios;
DROP POLICY IF EXISTS "negocios_select_by_business" ON public.negocios;
DROP POLICY IF EXISTS "negocios_update_by_admin" ON public.negocios;

ALTER TABLE public.cashbox_closures
  ADD COLUMN IF NOT EXISTS negocio_id uuid REFERENCES public.negocios(id);

UPDATE public.cashbox_closures cc
SET negocio_id = u.negocio_id
FROM public.usuarios u
WHERE u.id = COALESCE(cc.opened_by, cc.closed_by)
  AND cc.negocio_id IS NULL;

ALTER TABLE public.cashbox_closures ALTER COLUMN negocio_id SET NOT NULL;

DROP POLICY IF EXISTS "Authenticated users can read all cashbox closures" ON public.cashbox_closures;
DROP POLICY IF EXISTS "Authenticated users can create cashbox closures" ON public.cashbox_closures;
DROP POLICY IF EXISTS "Authenticated users can update cashbox closures" ON public.cashbox_closures;

CREATE POLICY "cashbox_closures tenant select"
  ON public.cashbox_closures
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin() OR negocio_id = public.current_user_negocio_id());

CREATE POLICY "cashbox_closures tenant insert"
  ON public.cashbox_closures
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.is_platform_admin() OR (public.can_sell_current_business() AND negocio_id = public.current_user_negocio_id()))
    AND auth.uid() = opened_by
  );

CREATE POLICY "cashbox_closures tenant update"
  ON public.cashbox_closures
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin() OR (public.can_sell_current_business() AND negocio_id = public.current_user_negocio_id()))
  WITH CHECK (public.is_platform_admin() OR (public.can_sell_current_business() AND negocio_id = public.current_user_negocio_id()));

DROP POLICY IF EXISTS "authenticated users can read notifications" ON public.notifications;
DROP POLICY IF EXISTS "authenticated users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "authenticated users can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "authenticated users can delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can read business notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update business notifications" ON public.notifications;

DROP POLICY IF EXISTS "authenticated_can_create_support_ticket" ON public.support_tickets;
DROP POLICY IF EXISTS "superadmin_can_view_all_support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "superadmin_can_update_all_support_tickets" ON public.support_tickets;

DROP POLICY IF EXISTS "support_tickets tenant insert" ON public.support_tickets;
CREATE POLICY "support_tickets tenant insert"
  ON public.support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR negocio_id = public.current_user_negocio_id()
    OR (negocio_id IS NULL AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Allow anonymous to read profiles for login" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles;
