/*
  QuotesPage.convertQuoteToSale() did 4 separate client-side writes
  (insert ventas, insert venta_items, update productos.stock per item,
  update cotizaciones.estado) with no transaction wrapping them. A failure
  partway through left inconsistent state with no cleanup: if venta_items
  failed after ventas succeeded, an orphaned zero-item sale with a nonzero
  total was left behind and the quote was never marked approved, so the
  user could retry and end up with two ventas for one quote (double
  revenue in reports). The stock update also had the same lost-update race
  fixed for productos.stock elsewhere this session (read-compute-write in
  JS instead of an atomic UPDATE), and its Promise.all result was never
  checked for per-item errors.

  convert_quote_to_sale() wraps the whole operation in a single
  transaction (a plpgsql function body is one implicit transaction) so it
  either fully commits or fully rolls back, and adds a `FOR UPDATE` +
  estado check to stop the same quote being converted twice even from two
  concurrent clicks. Declared SECURITY INVOKER (default) so it runs under
  the caller's own privileges and is governed by the existing RLS on
  cotizaciones/cotizacion_detalles/ventas/venta_items/productos — no new
  access is granted beyond what the 4 separate client calls already had.
  can_manage_current_business() matches this page's existing
  canConvertQuote client check (owner/admin/superadmin, not seller).

  Preserves existing behavior exactly: stock is clamped at 0 rather than
  allowed to go negative or blocking the conversion (GREATEST(...,0), same
  as the original Math.max(0, ...)), and item prices/quantities are read
  from cotizacion_detalles server-side rather than trusted from the client.
*/

CREATE OR REPLACE FUNCTION public.convert_quote_to_sale(
  p_quote_id bigint,
  p_negocio_id uuid
)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_quote record;
  v_sale_id bigint;
  v_vendedor_id uuid := auth.uid();
  v_vendedor_nombre text;
  v_item record;
BEGIN
  IF NOT public.can_manage_current_business() THEN
    RAISE EXCEPTION 'No tienes permiso para convertir cotizaciones';
  END IF;

  SELECT * INTO v_quote
  FROM public.cotizaciones
  WHERE id = p_quote_id AND negocio_id = p_negocio_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cotización no encontrada para este negocio';
  END IF;

  IF lower(COALESCE(v_quote.estado, '')) = 'approved' THEN
    RAISE EXCEPTION 'Esta cotización ya fue convertida a venta';
  END IF;

  SELECT COALESCE(full_name, username, '') INTO v_vendedor_nombre
  FROM public.usuarios WHERE id = v_vendedor_id;

  INSERT INTO public.ventas (
    negocio_id, cliente_id, vendedor_id, vendedor_nombre, fecha,
    subtotal, descuento, descuento_monto, total, tipo_pago, saldo_pendiente, estado
  ) VALUES (
    p_negocio_id, v_quote.cliente_id, v_vendedor_id, v_vendedor_nombre, CURRENT_DATE,
    COALESCE(v_quote.subtotal, v_quote.total), COALESCE(v_quote.descuento, 0), COALESCE(v_quote.descuento, 0),
    v_quote.total, 'Contado', 0, 'activa'
  )
  RETURNING id INTO v_sale_id;

  FOR v_item IN
    SELECT * FROM public.cotizacion_detalles WHERE cotizacion_id = p_quote_id
  LOOP
    INSERT INTO public.venta_items (venta_id, producto_id, cantidad, precio, total)
    VALUES (v_sale_id, v_item.producto_id, v_item.cantidad, v_item.precio_unitario, v_item.total);

    IF v_item.producto_id IS NOT NULL THEN
      UPDATE public.productos
      SET stock = GREATEST(COALESCE(stock, 0) - v_item.cantidad, 0)
      WHERE id = v_item.producto_id AND negocio_id = p_negocio_id;
    END IF;
  END LOOP;

  UPDATE public.cotizaciones SET estado = 'approved' WHERE id = p_quote_id;

  RETURN v_sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_quote_to_sale(bigint, uuid) TO authenticated;
