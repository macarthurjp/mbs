/*
  # Fix current accounts report to show all clients with debt

  ## Changes
  - Updates `get_current_accounts_status` function to show ALL clients with balance != 0
  - Previously only showed clients with balance > 0, excluding clients with negative balances
  - Both positive and negative balances represent debt that should be displayed
  - Uses absolute value to display all debts as positive amounts

  ## Affected Functions
  - `get_current_accounts_status` - Now includes clients with any non-zero balance

  ## Important Notes
  - This ensures clients like "norma sanchez vecina" with negative balance appear in reports
  - All debts now display consistently in the accounts report
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
  SELECT 
    c.id,
    c.name,
    ABS(COALESCE(c.balance, 0))::NUMERIC as total_debt,
    MIN(am.created_at) as oldest_debt_date,
    CASE 
      WHEN MIN(am.created_at) IS NOT NULL THEN 
        EXTRACT(DAY FROM (NOW() - MIN(am.created_at)))::INTEGER
      ELSE 0
    END as days_overdue,
    COALESCE(ABS(SUM(CASE WHEN am.type = 'payment' THEN am.amount ELSE 0 END)), 0)::NUMERIC as total_payments,
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
  WHERE COALESCE(c.balance, 0) != 0
  GROUP BY c.id, c.name, c.balance
  ORDER BY ABS(c.balance) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_current_accounts_status() TO authenticated;