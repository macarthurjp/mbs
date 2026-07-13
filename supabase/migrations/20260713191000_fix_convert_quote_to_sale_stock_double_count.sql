/*
  convert_quote_to_sale() (20260713190000) explicitly decremented
  productos.stock after inserting each venta_items row — but there's a
  pre-existing, untracked trigger, trg_stock_venta (AFTER INSERT ON
  venta_items -> actualizar_stock_venta(), `stock = stock - new.cantidad`),
  that already does this automatically and atomically for every
  venta_items insert, including these. Confirmed live: converting a quote
  for 5 units of a 50-stock product left stock at 40, not 45 — decremented
  twice. This is the same double-counting shape as the compras/productos
  bug fixed in 20260706193000_fix_create_purchase_stock_double_count.sql,
  just on the sales side instead of purchases. Removes the redundant
  UPDATE; the trigger is now the sole place stock is adjusted for sales.
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
    -- productos.stock is decremented automatically by trg_stock_venta
    -- when this row is inserted; do not also decrement it here.
    INSERT INTO public.venta_items (venta_id, producto_id, cantidad, precio, total)
    VALUES (v_sale_id, v_item.producto_id, v_item.cantidad, v_item.precio_unitario, v_item.total);
  END LOOP;

  UPDATE public.cotizaciones SET estado = 'approved' WHERE id = p_quote_id;

  RETURN v_sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_quote_to_sale(bigint, uuid) TO authenticated;
