/*
  # Fix days overdue calculation - only count unpaid charges (v3)

  ## Problem
  - Previous version had ambiguous column reference error
  - Fixed by using proper table aliases in all CTEs

  ## Solution
  - Apply FIFO (First In, First Out) logic for payments
  - For each client, apply payments to oldest charges first
  - Find the oldest charge that still has unpaid balance
  - Use that date for days overdue calculation
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
      am2.client_id,
      ABS(SUM(am2.amount)) as total_paid
    FROM account_movements am2
    WHERE am2.type = 'payment'
    GROUP BY am2.client_id
  ),
  oldest_unpaid AS (
    SELECT DISTINCT ON (ch.client_id)
      ch.client_id,
      ch.created_at as oldest_charge_date
    FROM charges ch
    LEFT JOIN payments_total pt ON ch.client_id = pt.client_id
    WHERE ch.cumulative_charges > COALESCE(pt.total_paid, 0)
    ORDER BY ch.client_id, ch.created_at ASC
  )
  SELECT 
    cl.id,
    cl.name,
    ABS(COALESCE(cl.balance, 0))::NUMERIC as total_debt,
    ou.oldest_charge_date as oldest_debt_date,
    CASE 
      WHEN ou.oldest_charge_date IS NOT NULL THEN 
        EXTRACT(DAY FROM (NOW() - ou.oldest_charge_date))::INTEGER
      ELSE 0
    END as days_overdue,
    COALESCE(ABS(SUM(CASE WHEN am3.type = 'payment' THEN am3.amount ELSE 0 END)), 0)::NUMERIC as total_payments,
    MAX(CASE WHEN am3.type = 'payment' THEN am3.created_at END) as last_payment_date,
    CASE 
      WHEN COALESCE(cl.balance, 0) = 0 THEN 'paid_up'
      WHEN ou.oldest_charge_date IS NULL THEN 'current'
      WHEN EXTRACT(DAY FROM (NOW() - ou.oldest_charge_date)) <= 30 THEN 'current'
      WHEN EXTRACT(DAY FROM (NOW() - ou.oldest_charge_date)) <= 60 THEN 'late_30'
      WHEN EXTRACT(DAY FROM (NOW() - ou.oldest_charge_date)) <= 90 THEN 'late_60'
      ELSE 'late_90_plus'
    END as payment_behavior
  FROM clients cl
  LEFT JOIN oldest_unpaid ou ON cl.id = ou.client_id
  LEFT JOIN account_movements am3 ON cl.id = am3.client_id
  WHERE COALESCE(cl.balance, 0) != 0
  GROUP BY cl.id, cl.name, cl.balance, ou.oldest_charge_date
  ORDER BY ABS(cl.balance) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_current_accounts_status() TO authenticated;