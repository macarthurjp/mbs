/*
  # Fix days overdue calculation - only count unpaid charges (v2)

  ## Problem
  - Previous version still counted charges that were fully paid
  - Example: Client had $122k debt from 12/4, paid it on 1/16, then new $60k debt on 1/16
  - System shows 44 days overdue, but should show only ~1 day (since the new unpaid charge)

  ## Solution
  - Apply FIFO (First In, First Out) logic for payments
  - For each client, apply payments to oldest charges first
  - Find the oldest charge that still has unpaid balance
  - Use that date for days overdue calculation

  ## Logic
  1. Get all charges ordered by date
  2. Get total payments
  3. Apply payments to charges in order (FIFO)
  4. Find first charge that is not fully paid
  5. That's the oldest unpaid charge date
*/

DROP FUNCTION IF EXISTS get_current_accounts_status();

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
  WITH charges AS (
    SELECT 
      am.client_id,
      am.created_at,
      am.amount,
      SUM(am.amount) OVER (PARTITION BY am.client_id ORDER BY am.created_at, am.id) as cumulative_charges
    FROM account_movements am
    WHERE am.type = 'charge'
  ),
  payments_total AS (
    SELECT 
      client_id,
      ABS(SUM(amount)) as total_paid
    FROM account_movements
    WHERE type = 'payment'
    GROUP BY client_id
  ),
  oldest_unpaid AS (
    SELECT DISTINCT ON (c.client_id)
      c.client_id,
      c.created_at as oldest_charge_date
    FROM charges c
    LEFT JOIN payments_total pt ON c.client_id = pt.client_id
    WHERE c.cumulative_charges > COALESCE(pt.total_paid, 0)
    ORDER BY c.client_id, c.created_at ASC
  )
  SELECT 
    c.id,
    c.name,
    ABS(COALESCE(c.balance, 0))::NUMERIC as total_debt,
    ou.oldest_charge_date as oldest_debt_date,
    CASE 
      WHEN ou.oldest_charge_date IS NOT NULL THEN 
        EXTRACT(DAY FROM (NOW() - ou.oldest_charge_date))::INTEGER
      ELSE 0
    END as days_overdue,
    COALESCE(ABS(SUM(CASE WHEN am.type = 'payment' THEN am.amount ELSE 0 END)), 0)::NUMERIC as total_payments,
    MAX(CASE WHEN am.type = 'payment' THEN am.created_at END) as last_payment_date,
    CASE 
      WHEN COALESCE(c.balance, 0) = 0 THEN 'paid_up'
      WHEN ou.oldest_charge_date IS NULL THEN 'current'
      WHEN EXTRACT(DAY FROM (NOW() - ou.oldest_charge_date)) <= 30 THEN 'current'
      WHEN EXTRACT(DAY FROM (NOW() - ou.oldest_charge_date)) <= 60 THEN 'late_30'
      WHEN EXTRACT(DAY FROM (NOW() - ou.oldest_charge_date)) <= 90 THEN 'late_60'
      ELSE 'late_90_plus'
    END as payment_behavior
  FROM clients c
  LEFT JOIN oldest_unpaid ou ON c.id = ou.client_id
  LEFT JOIN account_movements am ON c.id = am.client_id
  WHERE COALESCE(c.balance, 0) != 0
  GROUP BY c.id, c.name, c.balance, ou.oldest_charge_date
  ORDER BY ABS(c.balance) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_current_accounts_status() TO authenticated;