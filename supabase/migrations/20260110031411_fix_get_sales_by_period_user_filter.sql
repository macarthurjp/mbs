/*
  # Corrección de la función get_sales_by_period

  ## Problema
  La función no devuelve datos porque no filtra por user_id del usuario autenticado.
  Las políticas RLS limitan las transacciones visibles solo al propietario.

  ## Solución
  Agregar filtro por user_id = auth.uid() en la función para que solo devuelva
  las transacciones del usuario actual.

  ## Cambios
  - Actualizar get_sales_by_period para filtrar por user_id
*/

CREATE OR REPLACE FUNCTION get_sales_by_period(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  sale_date DATE,
  total_sales NUMERIC,
  total_transactions BIGINT,
  average_ticket NUMERIC,
  cash_sales NUMERIC,
  transfer_sales NUMERIC,
  current_account_sales NUMERIC,
  total_profit NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.created_at::DATE,
    COALESCE(SUM(t.amount), 0)::NUMERIC as total_sales,
    COUNT(t.id)::BIGINT as total_transactions,
    COALESCE(AVG(t.amount), 0)::NUMERIC as average_ticket,
    COALESCE(SUM(CASE WHEN t.payment_method IN ('Efectivo', 'cash') THEN t.amount ELSE 0 END), 0)::NUMERIC as cash_sales,
    COALESCE(SUM(CASE WHEN t.payment_method IN ('Transferencia', 'transfer') THEN t.amount ELSE 0 END), 0)::NUMERIC as transfer_sales,
    COALESCE(SUM(CASE WHEN t.payment_method IN ('Cuenta Corriente', 'current_account') THEN t.amount ELSE 0 END), 0)::NUMERIC as current_account_sales,
    COALESCE(SUM(sv.profit), 0)::NUMERIC as total_profit
  FROM transactions t
  LEFT JOIN sales_summary_view sv ON t.id = sv.id
  WHERE t.created_at::DATE BETWEEN start_date AND end_date
    AND t.type = 'income' 
    AND t.category = 'Venta General'
    AND t.user_id = auth.uid()
  GROUP BY t.created_at::DATE
  ORDER BY t.created_at::DATE;
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION get_sales_by_period(DATE, DATE) TO authenticated;
