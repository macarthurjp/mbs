/*
  # Fix Reporting Functions for Spanish Categories
  
  1. Updates
    - Update all reporting functions to use correct Spanish categories
    - Fix payment method names to match actual data
    - Update views to use correct filters
  
  2. Changes
    - Change 'sale' to 'Venta General'
    - Update payment methods to Spanish versions
*/

-- Drop existing views and functions
DROP VIEW IF EXISTS sales_summary_view CASCADE;
DROP VIEW IF EXISTS product_performance_view CASCADE;
DROP FUNCTION IF EXISTS get_sales_by_period(DATE, DATE);
DROP FUNCTION IF EXISTS get_top_products(DATE, DATE, INTEGER);
DROP FUNCTION IF EXISTS get_inventory_analysis();
DROP FUNCTION IF EXISTS get_current_accounts_status();
DROP FUNCTION IF EXISTS get_business_profitability(DATE, DATE);

-- Recreate Sales Summary View with correct category
CREATE OR REPLACE VIEW sales_summary_view AS
SELECT 
  t.id,
  t.created_at as sale_date,
  t.amount as total_amount,
  t.payment_method,
  t.client_id,
  c.name as client_name,
  t.category,
  COUNT(ti.id) as items_count,
  SUM(ti.quantity) as total_units,
  SUM(ti.quantity * p.cost) as total_cost,
  t.amount - COALESCE(SUM(ti.quantity * p.cost), 0) as profit
FROM transactions t
LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
LEFT JOIN products p ON ti.product_id = p.id
LEFT JOIN clients c ON t.client_id = c.id
WHERE t.type = 'income' AND t.category = 'Venta General'
GROUP BY t.id, t.created_at, t.amount, t.payment_method, t.client_id, c.name, t.category;

-- Recreate Product Performance View with correct category
CREATE OR REPLACE VIEW product_performance_view AS
SELECT 
  p.id,
  p.name,
  p.category,
  p.size,
  p.price,
  p.cost as cost_price,
  p.stock as stock_quantity,
  COALESCE(SUM(ti.quantity), 0) as units_sold,
  COALESCE(SUM(ti.subtotal), 0) as revenue,
  COALESCE(SUM(ti.quantity * p.cost), 0) as cost,
  COALESCE(SUM(ti.subtotal - (ti.quantity * p.cost)), 0) as profit,
  MAX(t.created_at) as last_sale_date
FROM products p
LEFT JOIN transaction_items ti ON p.id = ti.product_id
LEFT JOIN transactions t ON ti.transaction_id = t.id AND t.type = 'income' AND t.category = 'Venta General'
GROUP BY p.id, p.name, p.category, p.size, p.price, p.cost, p.stock;

-- Function: Get Sales by Period (Fixed for Spanish)
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
  GROUP BY t.created_at::DATE
  ORDER BY t.created_at::DATE;
END;
$$;

-- Function: Get Top Products (Fixed for Spanish)
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
    AND t.category = 'Venta General'
    AND (start_date IS NULL OR t.created_at::DATE >= start_date)
    AND (end_date IS NULL OR t.created_at::DATE <= end_date)
  GROUP BY p.id, p.name, p.category, p.size, p.stock
  HAVING SUM(ti.quantity) > 0
  ORDER BY units_sold DESC
  LIMIT limit_count;
END;
$$;

-- Function: Get Inventory Analysis (No changes needed)
CREATE OR REPLACE FUNCTION get_inventory_analysis()
RETURNS TABLE (
  category TEXT,
  total_products BIGINT,
  total_units BIGINT,
  total_value NUMERIC,
  low_stock_products BIGINT,
  no_movement_products BIGINT,
  average_price NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.category,
    COUNT(p.id)::BIGINT as total_products,
    SUM(p.stock)::BIGINT as total_units,
    SUM(p.stock * p.cost)::NUMERIC as total_value,
    COUNT(CASE WHEN p.stock <= p.min_stock THEN 1 END)::BIGINT as low_stock_products,
    COUNT(CASE WHEN ppv.units_sold = 0 THEN 1 END)::BIGINT as no_movement_products,
    AVG(p.price)::NUMERIC as average_price
  FROM products p
  LEFT JOIN product_performance_view ppv ON p.id = ppv.id
  GROUP BY p.category
  ORDER BY total_value DESC;
END;
$$;

-- Function: Get Current Accounts Status (No changes needed)
CREATE OR REPLACE FUNCTION get_current_accounts_status()
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  total_debt NUMERIC,
  oldest_debt_date TIMESTAMP WITH TIME ZONE,
  days_overdue INTEGER,
  total_payments NUMERIC,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  payment_behavior TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    COALESCE(c.balance, 0)::NUMERIC,
    MIN(am.created_at) as oldest_debt_date,
    CASE 
      WHEN MIN(am.created_at) IS NOT NULL THEN 
        EXTRACT(DAY FROM (NOW() - MIN(am.created_at)))::INTEGER
      ELSE 0
    END as days_overdue,
    COALESCE(SUM(CASE WHEN am.type = 'payment' THEN am.amount ELSE 0 END), 0)::NUMERIC as total_payments,
    MAX(CASE WHEN am.type = 'payment' THEN am.created_at END) as last_payment_date,
    CASE 
      WHEN COALESCE(c.balance, 0) = 0 THEN 'paid_up'
      WHEN EXTRACT(DAY FROM (NOW() - MIN(am.created_at))) <= 30 THEN 'current'
      WHEN EXTRACT(DAY FROM (NOW() - MIN(am.created_at))) <= 60 THEN 'late_30'
      WHEN EXTRACT(DAY FROM (NOW() - MIN(am.created_at))) <= 90 THEN 'late_60'
      ELSE 'late_90_plus'
    END as payment_behavior
  FROM clients c
  LEFT JOIN account_movements am ON c.id = am.client_id
  WHERE COALESCE(c.balance, 0) > 0
  GROUP BY c.id, c.name, c.balance
  ORDER BY c.balance DESC;
END;
$$;

-- Function: Get Business Profitability (Fixed for Spanish)
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
       AND created_at::DATE BETWEEN start_date AND end_date)::NUMERIC as total_cash_in,
    (SELECT COALESCE(SUM(amount), 0)
     FROM transactions 
     WHERE type = 'expense' 
       AND created_at::DATE BETWEEN start_date AND end_date)::NUMERIC as total_cash_out,
    (SELECT COALESCE(
       SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)
     FROM transactions 
     WHERE created_at::DATE BETWEEN start_date AND end_date)::NUMERIC as net_cash_flow,
    (SELECT COALESCE(SUM(balance), 0) FROM clients WHERE balance > 0)::NUMERIC as accounts_receivable,
    (SELECT COALESCE(SUM(stock * cost), 0) FROM products)::NUMERIC as inventory_value
  FROM sales_summary_view sv
  WHERE sv.sale_date::DATE BETWEEN start_date AND end_date;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_sales_by_period(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_products(DATE, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_analysis() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_accounts_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_profitability(DATE, DATE) TO authenticated;

-- Grant select on views
GRANT SELECT ON sales_summary_view TO authenticated;
GRANT SELECT ON product_performance_view TO authenticated;