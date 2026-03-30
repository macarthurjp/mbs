/*
  # Fix Timezone Handling in Reporting Functions
  
  1. Changes
    - Update `get_sales_by_period` to use Argentina timezone (UTC-3)
    - Update `get_top_products` to use Argentina timezone
    - Update `get_business_profitability` to use Argentina timezone
    - All date comparisons now properly handle Argentina timezone
  
  2. Notes
    - Converts UTC timestamps to Argentina time before extracting dates
    - Ensures all date groupings and filters respect Argentina timezone
    - Prevents showing transactions from wrong dates due to timezone issues
*/

-- Function: Get Sales by Period (Fixed for Argentina timezone)
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
    (t.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE as sale_date,
    COALESCE(SUM(t.amount), 0)::NUMERIC as total_sales,
    COUNT(t.id)::BIGINT as total_transactions,
    COALESCE(AVG(t.amount), 0)::NUMERIC as average_ticket,
    COALESCE(SUM(CASE WHEN t.payment_method = 'cash' THEN t.amount ELSE 0 END), 0)::NUMERIC as cash_sales,
    COALESCE(SUM(CASE WHEN t.payment_method = 'transfer' THEN t.amount ELSE 0 END), 0)::NUMERIC as transfer_sales,
    COALESCE(SUM(CASE WHEN t.payment_method = 'current_account' THEN t.amount ELSE 0 END), 0)::NUMERIC as current_account_sales,
    COALESCE(SUM(sv.profit), 0)::NUMERIC as total_profit
  FROM transactions t
  LEFT JOIN sales_summary_view sv ON t.id = sv.id
  WHERE (t.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE BETWEEN start_date AND end_date
    AND t.type = 'income' 
    AND t.category = 'sale'
  GROUP BY (t.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE
  ORDER BY (t.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE;
END;
$$;

-- Function: Get Top Products (Fixed for Argentina timezone)
CREATE OR REPLACE FUNCTION get_top_products(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  category TEXT,
  size TEXT,
  units_sold BIGINT,
  revenue NUMERIC,
  profit NUMERIC,
  profit_margin NUMERIC,
  current_stock INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.category,
    p.size,
    COALESCE(SUM(ti.quantity), 0)::BIGINT as units_sold,
    COALESCE(SUM(ti.subtotal), 0)::NUMERIC as revenue,
    COALESCE(SUM(ti.subtotal - (ti.quantity * p.cost)), 0)::NUMERIC as profit,
    CASE 
      WHEN SUM(ti.subtotal) > 0 THEN 
        (SUM(ti.subtotal - (ti.quantity * p.cost)) / SUM(ti.subtotal) * 100)::NUMERIC
      ELSE 0
    END as profit_margin,
    p.stock
  FROM products p
  LEFT JOIN transaction_items ti ON p.id = ti.product_id
  LEFT JOIN transactions t ON ti.transaction_id = t.id
  WHERE t.type = 'income' 
    AND t.category = 'sale'
    AND (start_date IS NULL OR (t.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE >= start_date)
    AND (end_date IS NULL OR (t.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE <= end_date)
  GROUP BY p.id, p.name, p.category, p.size, p.stock
  ORDER BY units_sold DESC
  LIMIT limit_count;
END;
$$;

-- Function: Get Business Profitability (Fixed for Argentina timezone)
CREATE OR REPLACE FUNCTION get_business_profitability(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  total_revenue NUMERIC,
  total_cost NUMERIC,
  gross_profit NUMERIC,
  gross_margin NUMERIC,
  total_cash_in NUMERIC,
  total_cash_out NUMERIC,
  net_cash_flow NUMERIC,
  accounts_receivable NUMERIC,
  inventory_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(sv.total_amount), 0)::NUMERIC as total_revenue,
    COALESCE(SUM(sv.total_cost), 0)::NUMERIC as total_cost,
    COALESCE(SUM(sv.profit), 0)::NUMERIC as gross_profit,
    CASE 
      WHEN SUM(sv.total_amount) > 0 THEN 
        (SUM(sv.profit) / SUM(sv.total_amount) * 100)::NUMERIC
      ELSE 0
    END as gross_margin,
    (SELECT COALESCE(SUM(amount), 0)
     FROM transactions 
     WHERE type = 'income' 
       AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE BETWEEN start_date AND end_date)::NUMERIC as total_cash_in,
    (SELECT COALESCE(SUM(amount), 0)
     FROM transactions 
     WHERE type = 'expense' 
       AND (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE BETWEEN start_date AND end_date)::NUMERIC as total_cash_out,
    (SELECT COALESCE(
       SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)
     FROM transactions 
     WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE BETWEEN start_date AND end_date)::NUMERIC as net_cash_flow,
    (SELECT COALESCE(SUM(balance), 0) FROM clients WHERE balance > 0)::NUMERIC as accounts_receivable,
    (SELECT COALESCE(SUM(stock * cost), 0) FROM products)::NUMERIC as inventory_value
  FROM sales_summary_view sv
  WHERE (sv.sale_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE BETWEEN start_date AND end_date;
END;
$$;