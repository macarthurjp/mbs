/*
  # Add Gift Card Sales to Cashbox Reports

  1. Problem
    - Gift card sales (category = 'Gift Cards') are not shown in cashbox reports
    - Functions only show 'Venta General' category items
    - Users can't see gift card revenue breakdown

  2. Solution
    - Add gift_card_sales field to all 4 cashbox functions return types
    - Include gift cards with category = 'Gift Cards' in the calculations
    - Update total_income to include gift card sales

  3. Changes
    - Drop and recreate all 4 functions with gift_card_sales field
    - get_cashbox_by_day
    - get_cashbox_by_period
    - get_cashbox_by_month
    - get_cashbox_by_year
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
  gift_card_sales NUMERIC,
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
    -- Total Income (including gift card sales, excluding gift card payments)
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.payment_method IN ('Efectivo', 'Transferencia', 'Tarjeta de Crédito', 'efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito')
          AND t.payment_method != 'gift_card'
        THEN t.amount
        WHEN t.type = 'income' AND t.category = 'Gift Cards'
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as total_income,
    -- Cash Sales (Venta General only)
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Venta General'
          AND (t.payment_method = 'Efectivo' OR t.payment_method = 'efectivo')
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as cash_sales,
    -- Transfer Sales (Venta General only)
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Venta General'
          AND (t.payment_method = 'Transferencia' OR t.payment_method = 'transferencia')
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as transfer_sales,
    -- Credit Card Sales (Venta General only)
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Venta General'
          AND (t.payment_method = 'Tarjeta de Crédito' OR t.payment_method = 'tarjeta_credito')
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as credit_card_sales,
    -- Gift Card Sales (NEW)
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Gift Cards'
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as gift_card_sales,
    -- Collections (Current Account)
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Cobranza (Cta. Cte.)'
          AND t.payment_method != 'gift_card'
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
    -- Net Balance (excluding gift card payments and credit sales)
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.payment_method NOT IN ('Cuenta Corriente', 'gift_card')
        THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as net_balance,
    -- Opening Balance (always 0)
    0::NUMERIC as opening_balance,
    -- Closing Balance (equals net_balance)
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.payment_method NOT IN ('Cuenta Corriente', 'gift_card')
        THEN t.amount
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
  gift_card_sales NUMERIC,
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
    -- Total Income (including gift card sales)
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.payment_method IN ('Efectivo', 'Transferencia', 'Tarjeta de Crédito', 'efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito')
          AND t.payment_method != 'gift_card'
        THEN t.amount
        WHEN t.type = 'income' AND t.category = 'Gift Cards'
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as total_income,
    -- Cash Sales
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Venta General'
          AND (t.payment_method = 'Efectivo' OR t.payment_method = 'efectivo')
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as cash_sales,
    -- Transfer Sales
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Venta General'
          AND (t.payment_method = 'Transferencia' OR t.payment_method = 'transferencia')
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as transfer_sales,
    -- Credit Card Sales
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Venta General'
          AND (t.payment_method = 'Tarjeta de Crédito' OR t.payment_method = 'tarjeta_credito')
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as credit_card_sales,
    -- Gift Card Sales
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Gift Cards'
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as gift_card_sales,
    -- Collections
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Cobranza (Cta. Cte.)'
          AND t.payment_method != 'gift_card'
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
    -- Net Balance (excluding gift card payments)
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.payment_method NOT IN ('Cuenta Corriente', 'gift_card')
        THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as net_balance,
    -- Daily Average
    CASE
      WHEN days_count > 0 THEN
        (COALESCE(SUM(
          CASE
            WHEN t.type = 'income'
              AND t.payment_method NOT IN ('Cuenta Corriente', 'gift_card')
            THEN t.amount
            WHEN t.type = 'expense' THEN -t.amount
            ELSE 0
          END
        ), 0) / days_count)::NUMERIC
      ELSE 0
    END as daily_average,
    -- Opening Balance (always 0)
    0::NUMERIC as opening_balance,
    -- Closing Balance
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.payment_method NOT IN ('Cuenta Corriente', 'gift_card')
        THEN t.amount
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
  gift_card_sales NUMERIC,
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
    -- Total Income (including gift card sales)
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.payment_method IN ('Efectivo', 'Transferencia', 'Tarjeta de Crédito', 'efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito')
          AND t.payment_method != 'gift_card'
        THEN t.amount
        WHEN t.type = 'income' AND t.category = 'Gift Cards'
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as total_income,
    -- Cash Sales
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Venta General'
          AND (t.payment_method = 'Efectivo' OR t.payment_method = 'efectivo')
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as cash_sales,
    -- Transfer Sales
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Venta General'
          AND (t.payment_method = 'Transferencia' OR t.payment_method = 'transferencia')
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as transfer_sales,
    -- Credit Card Sales
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Venta General'
          AND (t.payment_method = 'Tarjeta de Crédito' OR t.payment_method = 'tarjeta_credito')
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as credit_card_sales,
    -- Gift Card Sales
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Gift Cards'
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as gift_card_sales,
    -- Collections
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Cobranza (Cta. Cte.)'
          AND t.payment_method != 'gift_card'
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
    -- Net Balance (excluding gift card payments)
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.payment_method NOT IN ('Cuenta Corriente', 'gift_card')
        THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as net_balance,
    -- Daily Average
    CASE
      WHEN days_count > 0 THEN
        (COALESCE(SUM(
          CASE
            WHEN t.type = 'income'
              AND t.payment_method NOT IN ('Cuenta Corriente', 'gift_card')
            THEN t.amount
            WHEN t.type = 'expense' THEN -t.amount
            ELSE 0
          END
        ), 0) / days_count)::NUMERIC
      ELSE 0
    END as daily_average,
    -- Opening Balance (always 0)
    0::NUMERIC as opening_balance,
    -- Closing Balance
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.payment_method NOT IN ('Cuenta Corriente', 'gift_card')
        THEN t.amount
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
  gift_card_sales NUMERIC,
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
    -- Total Income (including gift card sales)
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.payment_method IN ('Efectivo', 'Transferencia', 'Tarjeta de Crédito', 'efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito')
          AND t.payment_method != 'gift_card'
        THEN t.amount
        WHEN t.type = 'income' AND t.category = 'Gift Cards'
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as total_income,
    -- Cash Sales
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Venta General'
          AND (t.payment_method = 'Efectivo' OR t.payment_method = 'efectivo')
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as cash_sales,
    -- Transfer Sales
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Venta General'
          AND (t.payment_method = 'Transferencia' OR t.payment_method = 'transferencia')
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as transfer_sales,
    -- Credit Card Sales
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Venta General'
          AND (t.payment_method = 'Tarjeta de Crédito' OR t.payment_method = 'tarjeta_credito')
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as credit_card_sales,
    -- Gift Card Sales
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Gift Cards'
        THEN t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as gift_card_sales,
    -- Collections
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.category = 'Cobranza (Cta. Cte.)'
          AND t.payment_method != 'gift_card'
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
    -- Net Balance (excluding gift card payments)
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.payment_method NOT IN ('Cuenta Corriente', 'gift_card')
        THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as net_balance,
    -- Monthly Average
    CASE
      WHEN months_count > 0 THEN
        (COALESCE(SUM(
          CASE
            WHEN t.type = 'income'
              AND t.payment_method NOT IN ('Cuenta Corriente', 'gift_card')
            THEN t.amount
            WHEN t.type = 'expense' THEN -t.amount
            ELSE 0
          END
        ), 0) / months_count)::NUMERIC
      ELSE 0
    END as monthly_average,
    -- Opening Balance (always 0)
    0::NUMERIC as opening_balance,
    -- Closing Balance
    COALESCE(SUM(
      CASE
        WHEN t.type = 'income'
          AND t.payment_method NOT IN ('Cuenta Corriente', 'gift_card')
        THEN t.amount
        WHEN t.type = 'expense' THEN -t.amount
        ELSE 0
      END
    ), 0)::NUMERIC as closing_balance,
    months_count as months_with_data
  FROM transactions t
  WHERE EXTRACT(YEAR FROM (t.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')) = target_year;
END;
$$;