/*
  # Corregir función de reporte de pagos de cuenta corriente
  
  1. Cambios
    - Actualizar nombres de columnas para que coincidan con la estructura real de account_movements
    - Usar created_at en lugar de movement_date
    - Usar type en lugar de movement_type
    - Usar description en lugar de notes
    - JOIN con transactions para obtener payment_method
    - Calcular previous_balance restando el amount del balance_after
*/

-- Eliminar función anterior
DROP FUNCTION IF EXISTS get_account_payments_report(timestamptz, timestamptz);

-- Crear función corregida
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
    am.created_at as payment_date,
    am.client_id,
    c.name as client_name,
    ABS(am.amount) as amount,
    COALESCE(t.payment_method, 'cash') as payment_method,
    (am.balance_after - am.amount) as previous_balance,
    am.balance_after as new_balance,
    am.user_id,
    up.username,
    am.description as notes
  FROM account_movements am
  INNER JOIN clients c ON am.client_id = c.id
  INNER JOIN user_profiles up ON am.user_id = up.id
  LEFT JOIN transactions t ON am.transaction_id = t.id
  WHERE am.type = 'payment'
    AND am.created_at >= fecha_desde
    AND am.created_at <= fecha_hasta
  ORDER BY am.created_at DESC;
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION get_account_payments_report(timestamptz, timestamptz) TO authenticated;