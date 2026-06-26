/*
  Allow Stripe webhook retries when an event was received but failed before
  finishing all database updates.
*/

ALTER TABLE public.stripe_webhook_events
  ALTER COLUMN processed_at DROP NOT NULL,
  ALTER COLUMN processed_at DROP DEFAULT,
  ADD COLUMN IF NOT EXISTS processing_error text;
