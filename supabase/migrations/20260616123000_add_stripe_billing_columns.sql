/*
  Ensure billing columns required by Stripe Edge Functions exist.
*/

ALTER TABLE public.negocios
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS cancel_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_negocios_stripe_customer_id
  ON public.negocios (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_negocios_stripe_subscription_id
  ON public.negocios (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

DO $$
BEGIN
  IF to_regclass('public.suscripciones') IS NOT NULL THEN
    ALTER TABLE public.suscripciones
      ADD COLUMN IF NOT EXISTS stripe_customer_id text,
      ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

    CREATE INDEX IF NOT EXISTS idx_suscripciones_stripe_customer_id
      ON public.suscripciones (stripe_customer_id)
      WHERE stripe_customer_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_suscripciones_stripe_subscription_id
      ON public.suscripciones (stripe_subscription_id)
      WHERE stripe_subscription_id IS NOT NULL;
  END IF;
END;
$$;
