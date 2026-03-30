/*
  # Add Cashbox Summary Functions
  
  1. New Functions
    - `get_cashbox_by_day` - Returns daily cashbox movements
    - `get_cashbox_by_period` - Returns cashbox totals for a date range
    - `get_cashbox_by_month` - Returns monthly cashbox summary
    - `get_cashbox_by_year` - Returns yearly cashbox summary
  
  2. Calculations
    - Cash Income: Sales (Efectivo + Transferencia) + Collections (Cobranza)
    - Cash Outflow: All expenses
    - Net Balance: Income - Outflow
    - Does NOT include: Sales on "Cuenta Corriente" (credit sales)
*/

-- Function: Get Cashbox by Day
CREATE OR REPLACE FUNCTION get_cashbox_by_day(target_date DATE)
RETURNS TABLE (
  date DATE,
  total_income NUMERIC,
  cash_sales NUMERIC,
  transfer_sales NUMERIC,
  collections NUMERIC,
  total_expenses NUMERIC,
  net_balance NUMERIC,
  opening_balance NUMERIC,
  closing_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  opening_bal NUMERIC;
BEGIN
  -- Calculate opening balance (net of all previous days)
  SELECT COALESCE(SUM(
    CASE 
      WHEN type = 'income' AND payment_method != 'Cuenta Corriente' THEN amount
      WHEN type = 'expense' THEN -amount
      ELSE 0
    END
  ), 0) INTO opening_bal
  FROM transactions
  WHERE created_at::DATE < target_date;

  RETURN QUERY
  SELECT 
    target_date,
    -- Total Income (excluding credit sales)
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method IN ('Efectivo', 'Transferencia') 
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as total_income,
    -- Cash Sales
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Venta General' 
          AND t.payment_method = 'Efectivo'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as cash_sales,
    -- Transfer Sales
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Venta General' 
          AND t.payment_method = 'Transferencia'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as transfer_sales,
    -- Collections
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Cobranza (Cta. Cte.)'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as collections,
    -- Total Expenses
    COALESCE(SUM(
      CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END
    ), 0)::NUMERIC as total_expenses,
    -- Net Balance
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method != 'Cuenta Corriente' THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as net_balance,
    -- Opening Balance
    opening_bal as opening_balance,
    -- Closing Balance
    (opening_bal + COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method != 'Cuenta Corriente' THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0))::NUMERIC as closing_balance
  FROM transactions t
  WHERE t.created_at::DATE = target_date;
END;
$$;

-- Function: Get Cashbox by Period
CREATE OR REPLACE FUNCTION get_cashbox_by_period(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  period_start DATE,
  period_end DATE,
  total_income NUMERIC,
  cash_sales NUMERIC,
  transfer_sales NUMERIC,
  collections NUMERIC,
  total_expenses NUMERIC,
  net_balance NUMERIC,
  daily_average NUMERIC,
  opening_balance NUMERIC,
  closing_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  opening_bal NUMERIC;
  days_count INTEGER;
BEGIN
  -- Calculate opening balance
  SELECT COALESCE(SUM(
    CASE 
      WHEN type = 'income' AND payment_method != 'Cuenta Corriente' THEN amount
      WHEN type = 'expense' THEN -amount
      ELSE 0
    END
  ), 0) INTO opening_bal
  FROM transactions
  WHERE created_at::DATE < start_date;

  -- Calculate number of days
  days_count := (end_date - start_date + 1);

  RETURN QUERY
  SELECT 
    start_date,
    end_date,
    -- Total Income
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method IN ('Efectivo', 'Transferencia') 
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as total_income,
    -- Cash Sales
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Venta General' 
          AND t.payment_method = 'Efectivo'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as cash_sales,
    -- Transfer Sales
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Venta General' 
          AND t.payment_method = 'Transferencia'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as transfer_sales,
    -- Collections
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Cobranza (Cta. Cte.)'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as collections,
    -- Total Expenses
    COALESCE(SUM(
      CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END
    ), 0)::NUMERIC as total_expenses,
    -- Net Balance
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method != 'Cuenta Corriente' THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as net_balance,
    -- Daily Average
    CASE 
      WHEN days_count > 0 THEN
        (COALESCE(SUM(
          CASE 
            WHEN t.type = 'income' AND t.payment_method != 'Cuenta Corriente' THEN t.amount
            WHEN t.type = 'expense' THEN -t.amount
            ELSE 0
          END
        ), 0) / days_count)::NUMERIC
      ELSE 0
    END as daily_average,
    -- Opening Balance
    opening_bal as opening_balance,
    -- Closing Balance
    (opening_bal + COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method != 'Cuenta Corriente' THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0))::NUMERIC as closing_balance
  FROM transactions t
  WHERE t.created_at::DATE BETWEEN start_date AND end_date;
END;
$$;

-- Function: Get Cashbox by Month
CREATE OR REPLACE FUNCTION get_cashbox_by_month(
  target_year INTEGER,
  target_month INTEGER
)
RETURNS TABLE (
  year INTEGER,
  month INTEGER,
  month_name TEXT,
  total_income NUMERIC,
  cash_sales NUMERIC,
  transfer_sales NUMERIC,
  collections NUMERIC,
  total_expenses NUMERIC,
  net_balance NUMERIC,
  daily_average NUMERIC,
  opening_balance NUMERIC,
  closing_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_date DATE;
  end_date DATE;
  opening_bal NUMERIC;
  days_count INTEGER;
  month_names TEXT[] := ARRAY['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
BEGIN
  start_date := make_date(target_year, target_month, 1);
  end_date := (start_date + INTERVAL '1 month - 1 day')::DATE;
  days_count := EXTRACT(DAY FROM end_date);

  -- Calculate opening balance
  SELECT COALESCE(SUM(
    CASE 
      WHEN type = 'income' AND payment_method != 'Cuenta Corriente' THEN amount
      WHEN type = 'expense' THEN -amount
      ELSE 0
    END
  ), 0) INTO opening_bal
  FROM transactions
  WHERE created_at::DATE < start_date;

  RETURN QUERY
  SELECT 
    target_year,
    target_month,
    month_names[target_month],
    -- Total Income
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method IN ('Efectivo', 'Transferencia') 
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as total_income,
    -- Cash Sales
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Venta General' 
          AND t.payment_method = 'Efectivo'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as cash_sales,
    -- Transfer Sales
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Venta General' 
          AND t.payment_method = 'Transferencia'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as transfer_sales,
    -- Collections
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Cobranza (Cta. Cte.)'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as collections,
    -- Total Expenses
    COALESCE(SUM(
      CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END
    ), 0)::NUMERIC as total_expenses,
    -- Net Balance
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method != 'Cuenta Corriente' THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as net_balance,
    -- Daily Average
    CASE 
      WHEN days_count > 0 THEN
        (COALESCE(SUM(
          CASE 
            WHEN t.type = 'income' AND t.payment_method != 'Cuenta Corriente' THEN t.amount
            WHEN t.type = 'expense' THEN -t.amount
            ELSE 0
          END
        ), 0) / days_count)::NUMERIC
      ELSE 0
    END as daily_average,
    -- Opening Balance
    opening_bal as opening_balance,
    -- Closing Balance
    (opening_bal + COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method != 'Cuenta Corriente' THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0))::NUMERIC as closing_balance
  FROM transactions t
  WHERE EXTRACT(YEAR FROM t.created_at) = target_year
    AND EXTRACT(MONTH FROM t.created_at) = target_month;
END;
$$;

-- Function: Get Cashbox by Year
CREATE OR REPLACE FUNCTION get_cashbox_by_year(target_year INTEGER)
RETURNS TABLE (
  year INTEGER,
  total_income NUMERIC,
  cash_sales NUMERIC,
  transfer_sales NUMERIC,
  collections NUMERIC,
  total_expenses NUMERIC,
  net_balance NUMERIC,
  monthly_average NUMERIC,
  opening_balance NUMERIC,
  closing_balance NUMERIC,
  months_with_data INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_date DATE;
  opening_bal NUMERIC;
  months_count INTEGER;
BEGIN
  start_date := make_date(target_year, 1, 1);

  -- Calculate opening balance
  SELECT COALESCE(SUM(
    CASE 
      WHEN type = 'income' AND payment_method != 'Cuenta Corriente' THEN amount
      WHEN type = 'expense' THEN -amount
      ELSE 0
    END
  ), 0) INTO opening_bal
  FROM transactions
  WHERE created_at::DATE < start_date;

  -- Count months with data
  SELECT COUNT(DISTINCT EXTRACT(MONTH FROM created_at)) INTO months_count
  FROM transactions
  WHERE EXTRACT(YEAR FROM created_at) = target_year;

  RETURN QUERY
  SELECT 
    target_year,
    -- Total Income
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method IN ('Efectivo', 'Transferencia') 
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as total_income,
    -- Cash Sales
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Venta General' 
          AND t.payment_method = 'Efectivo'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as cash_sales,
    -- Transfer Sales
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Venta General' 
          AND t.payment_method = 'Transferencia'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as transfer_sales,
    -- Collections
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Cobranza (Cta. Cte.)'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as collections,
    -- Total Expenses
    COALESCE(SUM(
      CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END
    ), 0)::NUMERIC as total_expenses,
    -- Net Balance
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method != 'Cuenta Corriente' THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as net_balance,
    -- Monthly Average
    CASE 
      WHEN months_count > 0 THEN
        (COALESCE(SUM(
          CASE 
            WHEN t.type = 'income' AND t.payment_method != 'Cuenta Corriente' THEN t.amount
            WHEN t.type = 'expense' THEN -t.amount
            ELSE 0
          END
        ), 0) / months_count)::NUMERIC
      ELSE 0
    END as monthly_average,
    -- Opening Balance
    opening_bal as opening_balance,
    -- Closing Balance
    (opening_bal + COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method != 'Cuenta Corriente' THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0))::NUMERIC as closing_balance,
    months_count as months_with_data
  FROM transactions t
  WHERE EXTRACT(YEAR FROM t.created_at) = target_year;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_cashbox_by_day(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cashbox_by_period(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cashbox_by_month(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cashbox_by_year(INTEGER) TO authenticated;