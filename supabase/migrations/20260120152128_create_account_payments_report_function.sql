/*
  # Crear función de reporte de pagos de cuenta corriente
  
  1. Función Nueva
    - `get_account_payments_report` - Obtiene todos los pagos de cuenta corriente por período
      - Parámetros: fecha_desde, fecha_hasta
      - Retorna: fecha, cliente, monto, método de pago, usuario que registró, saldo previo
  
  2. Seguridad
    - Accesible solo para usuarios autenticados
*/

-- Función para obtener reporte de pagos de cuenta corriente
CREATE OR REPLACE FUNCTION get_account_payments_report(
  fecha_desde timestamptz,
  fecha_hasta timestamptz
)
RETURNS TABLE (
  movement_id uuid,
  payment_date timestamptz,
  client_id uuid,
  client_name text,
  amount numeric,
  payment_method text,
  previous_balance numeric,
  new_balance numeric,
  user_id uuid,
  username text,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    am.id as movement_id,
    am.movement_date as payment_date,
    am.client_id,
    c.name as client_name,
    am.amount,
    am.payment_method,
    am.previous_balance,
    am.new_balance,
    am.user_id,
    up.username,
    am.notes
  FROM account_movements am
  INNER JOIN clients c ON am.client_id = c.id
  INNER JOIN user_profiles up ON am.user_id = up.user_id
  WHERE am.movement_type = 'payment'
    AND am.movement_date >= fecha_desde
    AND am.movement_date <= fecha_hasta
  ORDER BY am.movement_date DESC;
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION get_account_payments_report(timestamptz, timestamptz) TO authenticated;