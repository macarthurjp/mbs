/*
  inventory_transformations, sale_returns and sale_return_items were added
  after the platform backup change tracker (20260711104500) and were never
  wired into it. The automatic backup job skips its run entirely when
  platform_backup_state.has_changes is false, so a day with only returns
  or transformations would silently produce no backup at all.
*/

-- inventory_transformations already revokes direct writes (20260719120000);
-- sale_returns/sale_return_items only had GRANT SELECT, so authenticated
-- users could still attempt direct INSERT/UPDATE/DELETE (blocked today only
-- because no RLS write policy exists for these tables).
REVOKE INSERT, UPDATE, DELETE ON public.sale_returns, public.sale_return_items FROM authenticated;

DO $$
DECLARE
  table_name text;
  tracked_tables text[] := ARRAY[
    'inventory_transformations',
    'sale_returns',
    'sale_return_items'
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
