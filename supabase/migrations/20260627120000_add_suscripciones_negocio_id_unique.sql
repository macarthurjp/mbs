/*
  Add the missing unique constraint on suscripciones.negocio_id.

  stripe-webhook and sync-stripe-subscriptions upsert into suscripciones
  using `onConflict: 'negocio_id'`, which requires a unique (or exclusion)
  constraint on that column. Without it, Postgres rejects every such
  upsert with 42P10, so suscripciones never reflects real billing state
  and Stripe keeps retrying webhook events that can never finish processing.
*/

DO $$
BEGIN
  IF to_regclass('public.suscripciones') IS NOT NULL THEN
    DELETE FROM public.suscripciones s
    WHERE s.negocio_id IS NOT NULL
      AND s.ctid NOT IN (
        SELECT DISTINCT ON (negocio_id) ctid
        FROM public.suscripciones
        WHERE negocio_id IS NOT NULL
        ORDER BY negocio_id, created_at DESC NULLS LAST, ctid DESC
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.suscripciones') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'suscripciones_negocio_id_key'
    )
  THEN
    ALTER TABLE public.suscripciones
      ADD CONSTRAINT suscripciones_negocio_id_key UNIQUE (negocio_id);
  END IF;
END;
$$;
