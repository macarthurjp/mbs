/*
  SaaS signup monitoring events.

  Platform admins can review account creation attempts, completed business
  onboarding, and failed signup attempts. Email alerts are sent by the
  send-owner-alert Edge Function; this table keeps the audit trail.
*/

CREATE TABLE IF NOT EXISTS public.saas_signup_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL CHECK (event_type IN ('signup_started', 'signup_completed', 'signup_failed')),
  email text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  negocio_id uuid REFERENCES public.negocios(id) ON DELETE SET NULL,
  selected_plan text,
  owner_name text,
  business_name text,
  source text NOT NULL DEFAULT 'web',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.saas_signup_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saas_signup_events platform admin select" ON public.saas_signup_events;

CREATE POLICY "saas_signup_events platform admin select"
  ON public.saas_signup_events
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE INDEX IF NOT EXISTS idx_saas_signup_events_created_at
  ON public.saas_signup_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saas_signup_events_event_type
  ON public.saas_signup_events(event_type, created_at DESC);
