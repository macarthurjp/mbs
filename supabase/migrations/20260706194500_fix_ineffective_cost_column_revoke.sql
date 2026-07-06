/*
  Fix an ineffective REVOKE from 20260706190000_owner_only_cost_supplier.sql.

  That migration ran:
    REVOKE SELECT (costo, proveedor), INSERT (costo, proveedor), UPDATE (costo, proveedor)
      ON public.productos FROM authenticated, anon;
  and the equivalent for compras. This had NO effect: Supabase's default setup
  grants privileges at the WHOLE-TABLE level (GRANT ALL ON ALL TABLES IN
  SCHEMA public TO authenticated, anon), and a column-level REVOKE is a
  separate ACL entry from a table-level GRANT — revoking a column-specific
  privilege that was never separately granted does nothing while the
  table-level grant still covers every column. Verified live: after that
  migration, `information_schema.column_privileges` still showed SELECT/
  INSERT/UPDATE on costo/proveedor for `authenticated`, and a direct
  PostgREST request as a non-owner test user
  (`GET /rest/v1/productos?select=costo`) returned 200 with real data instead
  of a permission error.

  Real fix: revoke the whole-table SELECT/INSERT/UPDATE grant on productos
  from authenticated/anon, then re-grant those privileges scoped to an
  explicit column list that excludes costo/proveedor. All app code was
  already updated (this session) to use explicit column lists or the
  get_productos_for_business()/upsert_producto_costo() masking functions
  instead of `select('*')` on productos, so this doesn't break any existing
  read/write path.

  compras is simpler: every remaining call site in src/ already goes through
  create_purchase()/set_purchase_cost()/get_compras_for_business() (all
  SECURITY DEFINER, unaffected by these revokes since they run as the
  function owner) — no code does `.from('compras')` directly anymore — so
  compras access is revoked entirely for authenticated/anon rather than
  column-by-column.
*/

REVOKE SELECT, INSERT, UPDATE ON public.productos FROM authenticated, anon;

GRANT SELECT (
  id, negocio_id, nombre, unidad, precio, stock, minimo, created_at,
  precio_anterior, precio_cambio, precio_actualizado_en
) ON public.productos TO authenticated, anon;

GRANT INSERT (
  negocio_id, nombre, unidad, precio, stock, minimo,
  precio_anterior, precio_cambio, precio_actualizado_en
) ON public.productos TO authenticated, anon;

GRANT UPDATE (
  nombre, unidad, precio, stock, minimo,
  precio_anterior, precio_cambio, precio_actualizado_en
) ON public.productos TO authenticated, anon;

REVOKE SELECT, INSERT, UPDATE ON public.compras FROM authenticated, anon;
