/*
  # Drop and Recreate Cashbox Functions
  
  1. Changes
    - Drop existing functions
    - Recreate with new fields: credit_card_sales, credit_sales
    - Remove opening_balance accumulation (always 0)
    - Closing_balance equals net_balance
  
  2. New Fields
    - credit_card_sales: Sales paid with credit card
    - credit_sales: Sales on current account (Cuenta Corriente)
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS get_cashbox_by_day(DATE);
DROP FUNCTION IF EXISTS get_cashbox_by_period(DATE, DATE);
DROP FUNCTION IF EXISTS get_cashbox_by_month(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_cashbox_by_year(INTEGER);

-- Function: Get Cashbox by Day
CREATE FUNCTION get_cashbox_by_day(target_date DATE)
RETURNS TABLE (
  date DATE,
  total_income NUMERIC,
  cash_sales NUMERIC,
  transfer_sales NUMERIC,
  credit_card_sales NUMERIC,
  collections NUMERIC,
  credit_sales NUMERIC,
  total_expenses NUMERIC,
  net_balance NUMERIC,
  opening_balance NUMERIC,
  closing_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    target_date,
    -- Total Income (excluding credit sales)
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method IN ('Efectivo', 'Transferencia', 'Tarjeta de Crédito') 
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
    -- Credit Card Sales
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Venta General' 
          AND t.payment_method = 'Tarjeta de Crédito'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as credit_card_sales,
    -- Collections (Current Account)
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Cobranza (Cta. Cte.)'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as collections,
    -- Credit Sales (Cuenta Corriente)
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Venta General' 
          AND t.payment_method = 'Cuenta Corriente'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as credit_sales,
    -- Total Expenses
    COALESCE(SUM(
      CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END
    ), 0)::NUMERIC as total_expenses,
    -- Net Balance (only for this period)
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method != 'Cuenta Corriente' THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as net_balance,
    -- Opening Balance (always 0)
    0::NUMERIC as opening_balance,
    -- Closing Balance (equals net_balance)
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method != 'Cuenta Corriente' THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as closing_balance
  FROM transactions t
  WHERE (t.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE = target_date;
END;
$$;

-- Function: Get Cashbox by Period
CREATE FUNCTION get_cashbox_by_period(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  period_start DATE,
  period_end DATE,
  total_income NUMERIC,
  cash_sales NUMERIC,
  transfer_sales NUMERIC,
  credit_card_sales NUMERIC,
  collections NUMERIC,
  credit_sales NUMERIC,
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
  days_count INTEGER;
BEGIN
  days_count := (end_date - start_date + 1);

  RETURN QUERY
  SELECT 
    start_date,
    end_date,
    -- Total Income
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method IN ('Efectivo', 'Transferencia', 'Tarjeta de Crédito') 
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
    -- Credit Card Sales
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Venta General' 
          AND t.payment_method = 'Tarjeta de Crédito'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as credit_card_sales,
    -- Collections
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Cobranza (Cta. Cte.)'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as collections,
    -- Credit Sales
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Venta General' 
          AND t.payment_method = 'Cuenta Corriente'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as credit_sales,
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
    -- Opening Balance (always 0)
    0::NUMERIC as opening_balance,
    -- Closing Balance (equals net_balance)
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method != 'Cuenta Corriente' THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as closing_balance
  FROM transactions t
  WHERE (t.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE BETWEEN start_date AND end_date;
END;
$$;

-- Function: Get Cashbox by Month
CREATE FUNCTION get_cashbox_by_month(
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
  credit_card_sales NUMERIC,
  collections NUMERIC,
  credit_sales NUMERIC,
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
  days_count INTEGER;
  month_names TEXT[] := ARRAY['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
BEGIN
  start_date := make_date(target_year, target_month, 1);
  end_date := (start_date + INTERVAL '1 month - 1 day')::DATE;
  days_count := EXTRACT(DAY FROM end_date);

  RETURN QUERY
  SELECT 
    target_year,
    target_month,
    month_names[target_month],
    -- Total Income
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method IN ('Efectivo', 'Transferencia', 'Tarjeta de Crédito') 
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
    -- Credit Card Sales
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Venta General' 
          AND t.payment_method = 'Tarjeta de Crédito'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as credit_card_sales,
    -- Collections
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Cobranza (Cta. Cte.)'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as collections,
    -- Credit Sales
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Venta General' 
          AND t.payment_method = 'Cuenta Corriente'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as credit_sales,
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
    -- Opening Balance (always 0)
    0::NUMERIC as opening_balance,
    -- Closing Balance (equals net_balance)
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method != 'Cuenta Corriente' THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as closing_balance
  FROM transactions t
  WHERE EXTRACT(YEAR FROM (t.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')) = target_year
    AND EXTRACT(MONTH FROM (t.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')) = target_month;
END;
$$;

-- Function: Get Cashbox by Year
CREATE FUNCTION get_cashbox_by_year(target_year INTEGER)
RETURNS TABLE (
  year INTEGER,
  total_income NUMERIC,
  cash_sales NUMERIC,
  transfer_sales NUMERIC,
  credit_card_sales NUMERIC,
  collections NUMERIC,
  credit_sales NUMERIC,
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
  months_count INTEGER;
BEGIN
  -- Count months with data
  SELECT COUNT(DISTINCT EXTRACT(MONTH FROM (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')))::INTEGER INTO months_count
  FROM transactions
  WHERE EXTRACT(YEAR FROM (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')) = target_year;

  RETURN QUERY
  SELECT 
    target_year,
    -- Total Income
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method IN ('Efectivo', 'Transferencia', 'Tarjeta de Crédito') 
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
    -- Credit Card Sales
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Venta General' 
          AND t.payment_method = 'Tarjeta de Crédito'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as credit_card_sales,
    -- Collections
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Cobranza (Cta. Cte.)'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as collections,
    -- Credit Sales
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' 
          AND t.category = 'Venta General' 
          AND t.payment_method = 'Cuenta Corriente'
        THEN t.amount 
        ELSE 0 
      END
    ), 0)::NUMERIC as credit_sales,
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
    -- Opening Balance (always 0)
    0::NUMERIC as opening_balance,
    -- Closing Balance (equals net_balance)
    COALESCE(SUM(
      CASE 
        WHEN t.type = 'income' AND t.payment_method != 'Cuenta Corriente' THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as closing_balance,
    months_count as months_with_data
  FROM transactions t
  WHERE EXTRACT(YEAR FROM (t.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')) = target_year;
END;
$$;