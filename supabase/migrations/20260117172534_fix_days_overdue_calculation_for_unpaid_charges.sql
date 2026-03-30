/*
  # Fix days overdue calculation to only consider unpaid charges

  ## Problem
  - The current function calculates days overdue based on the oldest account movement date
  - This is incorrect when old charges have been fully paid
  - Example: Client had debt from 12/4, paid it on 1/16, then took new items on 1/16
  - System shows 30+ days overdue, but should show only days since the unpaid charges

  ## Solution
  - Calculate running balance for each movement chronologically
  - Find the oldest charge where the balance became positive and remains positive
  - Use that date as the oldest unpaid charge date
  - This ensures only unpaid charges are considered for days overdue calculation

  ## Changes
  - Recreates `get_current_accounts_status` function with correct logic
  - Uses CTE to calculate running balance and identify oldest unpaid charge
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
  WITH movement_balances AS (
    SELECT 
      am.client_id,
      am.created_at,
      am.type,
      am.amount,
      SUM(am.amount) OVER (PARTITION BY am.client_id ORDER BY am.created_at, am.id) as running_balance
    FROM account_movements am
  ),
  oldest_unpaid_charge AS (
    SELECT DISTINCT ON (mb.client_id)
      mb.client_id,
      mb.created_at as oldest_charge_date
    FROM movement_balances mb
    WHERE mb.running_balance > 0
      AND mb.type = 'charge'
      AND EXISTS (
        SELECT 1 
        FROM movement_balances mb2 
        WHERE mb2.client_id = mb.client_id 
          AND mb2.created_at >= mb.created_at
        HAVING SUM(mb2.amount) > 0
      )
    ORDER BY mb.client_id, mb.created_at ASC
  )
  SELECT 
    c.id,
    c.name,
    ABS(COALESCE(c.balance, 0))::NUMERIC as total_debt,
    ouc.oldest_charge_date as oldest_debt_date,
    CASE 
      WHEN ouc.oldest_charge_date IS NOT NULL THEN 
        EXTRACT(DAY FROM (NOW() - ouc.oldest_charge_date))::INTEGER
      ELSE 0
    END as days_overdue,
    COALESCE(ABS(SUM(CASE WHEN am.type = 'payment' THEN am.amount ELSE 0 END)), 0)::NUMERIC as total_payments,
    MAX(CASE WHEN am.type = 'payment' THEN am.created_at END) as last_payment_date,
    CASE 
      WHEN COALESCE(c.balance, 0) = 0 THEN 'paid_up'
      WHEN ouc.oldest_charge_date IS NULL THEN 'current'
      WHEN EXTRACT(DAY FROM (NOW() - ouc.oldest_charge_date)) <= 30 THEN 'current'
      WHEN EXTRACT(DAY FROM (NOW() - ouc.oldest_charge_date)) <= 60 THEN 'late_30'
      WHEN EXTRACT(DAY FROM (NOW() - ouc.oldest_charge_date)) <= 90 THEN 'late_60'
      ELSE 'late_90_plus'
    END as payment_behavior
  FROM clients c
  LEFT JOIN oldest_unpaid_charge ouc ON c.id = ouc.client_id
  LEFT JOIN account_movements am ON c.id = am.client_id
  WHERE COALESCE(c.balance, 0) != 0
  GROUP BY c.id, c.name, c.balance, ouc.oldest_charge_date
  ORDER BY ABS(c.balance) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_current_accounts_status() TO authenticated;