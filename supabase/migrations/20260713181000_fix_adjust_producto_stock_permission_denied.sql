/*
  20260713180000_atomic_producto_stock_adjust.sql's adjust_producto_stock()
  used `RETURNING *` / RETURNS SETOF public.productos, which failed live
  with "permission denied for table productos" for every non-owner-ish
  call: 20260706194500_fix_ineffective_cost_column_revoke.sql revoked the
  whole-table GRANT on productos for authenticated/anon and replaced it
  with an explicit column-scoped GRANT that excludes costo/proveedor.
  This function is SECURITY INVOKER (runs as the caller), and `RETURNING *`
  requires SELECT on every column of the row, including the excluded ones
  — so the UPDATE itself (which only touches the granted `stock` column)
  was being rejected at the RETURNING clause.

  Fix: RETURNING (and the function's return type) is limited to the same
  explicit column list productos SELECT is granted on.
*/

DROP FUNCTION IF EXISTS public.adjust_producto_stock(bigint, uuid, numeric);

CREATE FUNCTION public.adjust_producto_stock(
  p_producto_id bigint,
  p_negocio_id uuid,
  p_delta numeric
)
RETURNS TABLE (
  id bigint,
  negocio_id uuid,
  nombre text,
  unidad text,
  precio numeric,
  stock numeric,
  minimo numeric,
  created_at timestamp without time zone,
  precio_anterior numeric,
  precio_cambio text,
  precio_actualizado_en timestamptz
)
LANGUAGE sql
AS $$
  UPDATE public.productos
  SET stock = COALESCE(stock, 0) + p_delta
  WHERE id = p_producto_id AND negocio_id = p_negocio_id
  RETURNING
    id, negocio_id, nombre, unidad, precio, stock, minimo, created_at,
    precio_anterior, precio_cambio, precio_actualizado_en;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_producto_stock(bigint, uuid, numeric) TO authenticated;
