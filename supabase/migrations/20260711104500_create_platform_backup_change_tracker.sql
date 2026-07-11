/*
  Platform backup change tracker.

  Automatic platform backups use this single-row state table to avoid creating
  duplicate ZIP files when no relevant database table changed since the last
  successful automatic backup.
*/

ALTER TABLE public.platform_backups
  DROP CONSTRAINT IF EXISTS platform_backups_status_check;

ALTER TABLE public.platform_backups
  ADD CONSTRAINT platform_backups_status_check
  CHECK (status IN ('success', 'failed', 'skipped'));

CREATE TABLE IF NOT EXISTS public.platform_backup_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  has_changes boolean NOT NULL DEFAULT true,
  last_change_at timestamptz,
  last_change_table text,
  last_change_operation text,
  last_backup_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_backup_state (id, has_changes, updated_at)
VALUES (true, true, now())
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_backup_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_backup_state platform admin select" ON public.platform_backup_state;
DROP POLICY IF EXISTS "platform_backup_state platform admin update" ON public.platform_backup_state;

CREATE POLICY "platform_backup_state platform admin select"
  ON public.platform_backup_state
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "platform_backup_state platform admin update"
  ON public.platform_backup_state
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.mark_platform_backup_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_backup_state (
    id,
    has_changes,
    last_change_at,
    last_change_table,
    last_change_operation,
    updated_at
  )
  VALUES (
    true,
    true,
    now(),
    TG_TABLE_NAME,
    TG_OP,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET has_changes = true,
      last_change_at = EXCLUDED.last_change_at,
      last_change_table = EXCLUDED.last_change_table,
      last_change_operation = EXCLUDED.last_change_operation,
      updated_at = EXCLUDED.updated_at;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name text;
  tracked_tables text[] := ARRAY[
    'negocios',
    'usuarios',
    'clientes',
    'productos',
    'ventas',
    'venta_items',
    'pagos',
    'compras',
    'cotizaciones',
    'cotizacion_detalles',
    'suscripciones',
    'notifications',
    'support_tickets',
    'cashbox_closures',
    'audit_logs'
  ];
BEGIN
  FOREACH table_name IN ARRAY tracked_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_platform_backup_changed ON public.%I',
        table_name
      );

      EXECUTE format(
        'CREATE TRIGGER trg_platform_backup_changed
         AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW
         EXECUTE FUNCTION public.mark_platform_backup_changed()',
        table_name
      );
    END IF;
  END LOOP;
END;
$$;
