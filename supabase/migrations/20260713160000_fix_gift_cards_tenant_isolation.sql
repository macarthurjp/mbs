/*
  gift_cards / gift_card_transactions were created (20260225144907) with no
  negocio_id column at all, and RLS policies of `USING (true)` /
  `WITH CHECK (true)` for SELECT and UPDATE — any authenticated user from
  any business could read and edit every business's gift cards. Confirmed
  live that both tables are currently empty (0 rows) and that the
  GiftCardsPage UI is not wired into App.tsx's routing, so this closes a
  latent hole (reachable only via a direct API call) before any tenant data
  or UI path ever depends on it — not a live data breach.

  Adds negocio_id the same way ventas/productos/clientes already have it,
  backfilling gift_card_transactions.negocio_id from its parent gift_card
  (mirrors how venta_items derives tenant scope from ventas rather than
  carrying its own denormalized negocio_id). Both tables are confirmed
  empty, so the backfill is a no-op safety net, not a real data migration.

  Leaves gift_cards.client_id pointing at the legacy `clients` table as-is
  — that table is also empty and unrelated to this tenant-isolation fix;
  porting the gift card feature onto `clientes` is a separate decision.
*/

ALTER TABLE public.gift_cards
  ADD COLUMN IF NOT EXISTS negocio_id uuid REFERENCES public.negocios(id);

ALTER TABLE public.gift_card_transactions
  ADD COLUMN IF NOT EXISTS negocio_id uuid REFERENCES public.negocios(id);

UPDATE public.gift_cards gc
SET negocio_id = u.negocio_id
FROM public.usuarios u
WHERE u.id = gc.issued_by
  AND gc.negocio_id IS NULL;

UPDATE public.gift_card_transactions t
SET negocio_id = gc.negocio_id
FROM public.gift_cards gc
WHERE gc.id = t.gift_card_id
  AND t.negocio_id IS NULL;

ALTER TABLE public.gift_cards ALTER COLUMN negocio_id SET NOT NULL;
ALTER TABLE public.gift_card_transactions ALTER COLUMN negocio_id SET NOT NULL;

DROP POLICY IF EXISTS "Authenticated users can view gift cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Authenticated users can create gift cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Authenticated users can update gift cards" ON public.gift_cards;

CREATE POLICY "gift_cards tenant select"
  ON public.gift_cards
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin() OR negocio_id = public.current_user_negocio_id());

CREATE POLICY "gift_cards tenant insert"
  ON public.gift_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.is_platform_admin() OR negocio_id = public.current_user_negocio_id())
    AND auth.uid() = issued_by
  );

CREATE POLICY "gift_cards tenant update"
  ON public.gift_cards
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin() OR negocio_id = public.current_user_negocio_id())
  WITH CHECK (public.is_platform_admin() OR negocio_id = public.current_user_negocio_id());

DROP POLICY IF EXISTS "Authenticated users can view gift card transactions" ON public.gift_card_transactions;
DROP POLICY IF EXISTS "Authenticated users can create gift card transactions" ON public.gift_card_transactions;

CREATE POLICY "gift_card_transactions tenant select"
  ON public.gift_card_transactions
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin() OR negocio_id = public.current_user_negocio_id());

CREATE POLICY "gift_card_transactions tenant insert"
  ON public.gift_card_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.is_platform_admin() OR negocio_id = public.current_user_negocio_id())
    AND auth.uid() = performed_by
  );
