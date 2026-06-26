CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stripe webhook events platform read" ON public.stripe_webhook_events;

CREATE POLICY "stripe webhook events platform read"
  ON public.stripe_webhook_events
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());
