/*
  Platform backup history and private storage bucket.

  This stores metadata for Super Admin platform backups. The ZIP files live in
  Supabase Storage bucket `platform-backups`; access is restricted to platform
  admins through RLS and storage policies.
*/

CREATE TABLE IF NOT EXISTS public.platform_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  backup_type text NOT NULL DEFAULT 'platform' CHECK (backup_type IN ('platform')),
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  storage_bucket text NOT NULL DEFAULT 'platform-backups',
  storage_path text,
  file_name text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text
);

ALTER TABLE public.platform_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_backups platform admin select" ON public.platform_backups;
DROP POLICY IF EXISTS "platform_backups platform admin insert" ON public.platform_backups;
DROP POLICY IF EXISTS "platform_backups platform admin update" ON public.platform_backups;
DROP POLICY IF EXISTS "platform_backups platform admin delete" ON public.platform_backups;

CREATE POLICY "platform_backups platform admin select"
  ON public.platform_backups
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "platform_backups platform admin insert"
  ON public.platform_backups
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "platform_backups platform admin update"
  ON public.platform_backups
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "platform_backups platform admin delete"
  ON public.platform_backups
  FOR DELETE
  TO authenticated
  USING (public.is_platform_admin());

CREATE INDEX IF NOT EXISTS idx_platform_backups_created_at
  ON public.platform_backups(created_at DESC);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'platform-backups',
  'platform-backups',
  false,
  524288000,
  ARRAY['application/zip']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "platform_backups_storage platform admin select" ON storage.objects;
DROP POLICY IF EXISTS "platform_backups_storage platform admin insert" ON storage.objects;
DROP POLICY IF EXISTS "platform_backups_storage platform admin update" ON storage.objects;
DROP POLICY IF EXISTS "platform_backups_storage platform admin delete" ON storage.objects;

CREATE POLICY "platform_backups_storage platform admin select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'platform-backups' AND public.is_platform_admin());

CREATE POLICY "platform_backups_storage platform admin insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'platform-backups' AND public.is_platform_admin());

CREATE POLICY "platform_backups_storage platform admin update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'platform-backups' AND public.is_platform_admin())
  WITH CHECK (bucket_id = 'platform-backups' AND public.is_platform_admin());

CREATE POLICY "platform_backups_storage platform admin delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'platform-backups' AND public.is_platform_admin());
