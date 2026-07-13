/*
  productos.stock was updated in three places (SalesPage checkout,
  ProductsPage "add stock", InvoicesPage cancel-invoice stock restore) by
  reading the client's cached stock value, computing newStock = old ± delta
  in JavaScript, then writing that back — a classic lost-update race: two
  concurrent operations on the same product (two checkouts, or a checkout
  racing a stock addition) can both read the same starting stock and the
  second write silently clobbers the first instead of compounding.

  adjust_producto_stock() moves the arithmetic into the UPDATE statement
  itself (stock = stock + p_delta), which Postgres executes atomically
  under the row lock — no read-modify-write gap. Declared without
  SECURITY DEFINER (default SECURITY INVOKER) so it runs as the calling
  user and is still governed by the existing "productos tenant update" RLS
  policy and column-level GRANT (stock is already writable by
  owner/admin/seller, costo/proveedor remain excluded) — this function
  doesn't grant any access beyond what direct .update() already allowed,
  it just makes the write atomic.
*/

CREATE OR REPLACE FUNCTION public.adjust_producto_stock(
  p_producto_id bigint,
  p_negocio_id uuid,
  p_delta numeric
)
RETURNS SETOF public.productos
LANGUAGE sql
AS $$
  UPDATE public.productos
  SET stock = COALESCE(stock, 0) + p_delta
  WHERE id = p_producto_id AND negocio_id = p_negocio_id
  RETURNING *;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_producto_stock(bigint, uuid, numeric) TO authenticated;
