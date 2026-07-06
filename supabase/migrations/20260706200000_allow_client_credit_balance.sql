/*
  Let clientes.saldo go negative to represent store credit ("balance a
  favor") instead of hard-rejecting any payment larger than the client's
  current debt.

  register_receivable_payment() previously raised an exception when
  p_monto > current_balance and clamped the result at 0 with
  GREATEST(0, ...). Both removed: overpaying an existing debt now leaves the
  excess as negative saldo (credit) instead of being blocked. The FIFO loop
  over ventas.saldo_pendiente is unchanged — it already only pays down
  existing pending sales and stops once they're exhausted; next_balance is
  computed independently before the loop runs.
*/

CREATE OR REPLACE FUNCTION public.register_receivable_payment(
  p_cliente_id bigint,
  p_monto numeric,
  p_moneda_pago text DEFAULT NULL,
  p_monto_original numeric DEFAULT NULL,
  p_tasa_cambio numeric DEFAULT NULL,
  p_fecha date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  payment_id bigint,
  new_client_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_negocio uuid;
  current_balance numeric;
  next_balance numeric;
  remaining_payment numeric;
  sale_record record;
  sale_balance numeric;
  applied_amount numeric;
  next_sale_balance numeric;
  next_credit_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF NOT public.can_manage_current_business() THEN
    RAISE EXCEPTION 'No tienes permiso para registrar pagos de cuentas por cobrar';
  END IF;

  IF p_cliente_id IS NULL THEN
    RAISE EXCEPTION 'Cliente es obligatorio';
  END IF;

  IF p_monto IS NULL OR p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor que cero';
  END IF;

  SELECT public.current_user_negocio_id() INTO current_negocio;

  IF current_negocio IS NULL THEN
    RAISE EXCEPTION 'No se encontró el negocio del usuario';
  END IF;

  SELECT COALESCE(c.saldo, 0)
    INTO current_balance
  FROM public.clientes c
  WHERE c.id = p_cliente_id
    AND c.negocio_id = current_negocio
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;

  next_balance := current_balance - p_monto;

  INSERT INTO public.pagos (
    negocio_id,
    cliente_id,
    venta_id,
    fecha,
    monto,
    moneda_pago,
    monto_original,
    tasa_cambio
  )
  VALUES (
    current_negocio,
    p_cliente_id,
    NULL,
    COALESCE(p_fecha, CURRENT_DATE),
    p_monto,
    NULLIF(trim(COALESCE(p_moneda_pago, '')), ''),
    p_monto_original,
    p_tasa_cambio
  )
  RETURNING id INTO payment_id;

  UPDATE public.clientes
  SET saldo = next_balance
  WHERE id = p_cliente_id
    AND negocio_id = current_negocio;

  remaining_payment := p_monto;

  FOR sale_record IN
    SELECT id, total, saldo_pendiente, fecha_vencimiento, fecha
    FROM public.ventas
    WHERE negocio_id = current_negocio
      AND cliente_id = p_cliente_id
      AND COALESCE(saldo_pendiente, 0) > 0
      AND COALESCE(estado, '') <> 'cancelada'
    ORDER BY COALESCE(fecha_vencimiento::timestamp, fecha::timestamp), id
    FOR UPDATE
  LOOP
    EXIT WHEN remaining_payment <= 0;

    sale_balance := COALESCE(sale_record.saldo_pendiente, 0);
    applied_amount := LEAST(remaining_payment, sale_balance);
    next_sale_balance := GREATEST(0, sale_balance - applied_amount);

    next_credit_status := CASE
      WHEN next_sale_balance <= 0 THEN 'pagado'
      WHEN next_sale_balance < COALESCE(sale_record.total, 0) THEN 'parcial'
      WHEN sale_record.fecha_vencimiento IS NOT NULL AND sale_record.fecha_vencimiento::date < CURRENT_DATE THEN 'vencido'
      ELSE 'pendiente'
    END;

    UPDATE public.ventas
    SET saldo_pendiente = next_sale_balance,
        estado_credito = next_credit_status
    WHERE id = sale_record.id
      AND negocio_id = current_negocio;

    remaining_payment := remaining_payment - applied_amount;
  END LOOP;

  new_client_balance := next_balance;
  RETURN NEXT;
END;
$$;
