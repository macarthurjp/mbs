/*
  Trial expiry reminder.

  Adds trial_reminder_sent_at so the reminder cron only emails each trial
  business once (not once per cron run while it's inside the reminder
  window), and a helper to schedule the send-trial-reminders Edge Function
  the same way configure_platform_backup_cron schedules backups.

  After deploying the Edge Function and setting TRIAL_REMINDER_CRON_SECRET,
  run this once in Supabase SQL Editor (or supabase db query --linked):

    select public.configure_trial_reminder_cron(
      'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-trial-reminders',
      'YOUR_TRIAL_REMINDER_CRON_SECRET',
      '0 8 * * *'
    );

  The default schedule is 08:00 UTC every day.
*/

ALTER TABLE public.negocios
  ADD COLUMN IF NOT EXISTS trial_reminder_sent_at timestamptz;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.configure_trial_reminder_cron(
  p_function_url text,
  p_cron_secret text,
  p_schedule text DEFAULT '0 8 * * *'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  existing_job_id bigint;
BEGIN
  IF p_function_url IS NULL OR length(trim(p_function_url)) = 0 THEN
    RAISE EXCEPTION 'p_function_url is required';
  END IF;

  IF p_cron_secret IS NULL OR length(trim(p_cron_secret)) < 24 THEN
    RAISE EXCEPTION 'p_cron_secret is required and must be at least 24 characters';
  END IF;

  SELECT jobid
    INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'matmax-daily-trial-reminder'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'matmax-daily-trial-reminder',
    p_schedule,
    format(
      $cron$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-trial-reminder-secret', %L
        ),
        body := jsonb_build_object('source', 'pg_cron')
      );
      $cron$,
      p_function_url,
      p_cron_secret
    )
  );

  RETURN 'matmax-daily-trial-reminder scheduled';
END;
$$;

REVOKE ALL ON FUNCTION public.configure_trial_reminder_cron(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.configure_trial_reminder_cron(text, text, text) TO postgres, service_role;
