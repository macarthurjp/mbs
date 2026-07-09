/*
  Platform backup cron helper.

  This migration enables pg_cron + pg_net and creates a helper function to
  schedule the automatic platform backup Edge Function without storing secrets
  in the repository.

  After deploying the Edge Function and setting PLATFORM_BACKUP_CRON_SECRET,
  run this once in Supabase SQL Editor:

    select public.configure_platform_backup_cron(
      'https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-platform-backup',
      'YOUR_PLATFORM_BACKUP_CRON_SECRET',
      '0 6 * * *'
    );

  The default schedule is 06:00 UTC every day.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.configure_platform_backup_cron(
  p_function_url text,
  p_cron_secret text,
  p_schedule text DEFAULT '0 6 * * *'
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
  WHERE jobname = 'matmax-daily-platform-backup'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'matmax-daily-platform-backup',
    p_schedule,
    format(
      $cron$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-backup-secret', %L
        ),
        body := jsonb_build_object('mode', 'automatic', 'source', 'pg_cron')
      );
      $cron$,
      p_function_url,
      p_cron_secret
    )
  );

  RETURN 'matmax-daily-platform-backup scheduled';
END;
$$;

REVOKE ALL ON FUNCTION public.configure_platform_backup_cron(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.configure_platform_backup_cron(text, text, text) TO postgres, service_role;
