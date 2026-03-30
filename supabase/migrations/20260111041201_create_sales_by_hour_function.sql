/*
  # Función para análisis de ventas por horario

  ## Descripción
  Crea una función que agrupa las ventas por hora del día para identificar
  los horarios de mayor actividad comercial.

  ## Cambios
  1. Nueva función `get_sales_by_hour`
     - Agrupa ventas por hora del día (0-23)
     - Calcula total de ventas, transacciones y ticket promedio por hora
     - Filtra por usuario autenticado y rango de fechas

  ## Seguridad
  - Usa SECURITY DEFINER para acceso controlado
  - Filtra por user_id = auth.uid()
  - Solo devuelve ventas generales de tipo income
*/

CREATE OR REPLACE FUNCTION get_sales_by_hour(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  hour_of_day INTEGER,
  total_sales NUMERIC,
  total_transactions BIGINT,
  average_ticket NUMERIC,
  sales_percentage NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  grand_total NUMERIC;
BEGIN
  -- Calcular el total general primero
  SELECT COALESCE(SUM(amount), 0) INTO grand_total
  FROM transactions
  WHERE type = 'income'
    AND category = 'Venta General'
    AND user_id = auth.uid()
    AND (start_date IS NULL OR created_at::DATE >= start_date)
    AND (end_date IS NULL OR created_at::DATE <= end_date);

  -- Retornar datos agrupados por hora
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM t.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::INTEGER as hour_of_day,
    COALESCE(SUM(t.amount), 0)::NUMERIC as total_sales,
    COUNT(t.id)::BIGINT as total_transactions,
    COALESCE(AVG(t.amount), 0)::NUMERIC as average_ticket,
    CASE 
      WHEN grand_total > 0 THEN (COALESCE(SUM(t.amount), 0) / grand_total * 100)::NUMERIC
      ELSE 0
    END as sales_percentage
  FROM transactions t
  WHERE t.type = 'income'
    AND t.category = 'Venta General'
    AND t.user_id = auth.uid()
    AND (start_date IS NULL OR t.created_at::DATE >= start_date)
    AND (end_date IS NULL OR t.created_at::DATE <= end_date)
  GROUP BY EXTRACT(HOUR FROM t.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')
  ORDER BY hour_of_day;
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION get_sales_by_hour(DATE, DATE) TO authenticated;
