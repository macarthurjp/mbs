/*
  # Add debt aging breakdown function

  ## Overview
  This migration creates a function to break down client debt by age ranges.
  This allows users to see how much debt is from different time periods.

  ## New Function
  - `get_debt_aging_by_client(client_uuid)` - Returns debt breakdown by age ranges

  ## Returns
  For a given client:
    - current_debt (0-30 days)
    - debt_30_60 (30-60 days)
    - debt_60_90 (60-90 days)
    - debt_over_90 (90+ days)
    - total_debt
    - oldest_debt_days

  ## Logic
  Uses FIFO (First In, First Out) to apply payments to oldest charges first,
  then calculates how much unpaid debt falls into each age range.
*/

CREATE OR REPLACE FUNCTION get_debt_aging_by_client(client_uuid UUID)
RETURNS TABLE (
  current_debt NUMERIC,
  debt_30_60 NUMERIC,
  debt_60_90 NUMERIC,
  debt_over_90 NUMERIC,
  total_debt NUMERIC,
  oldest_debt_days INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_charges NUMERIC;
  total_payments NUMERIC;
  remaining_to_allocate NUMERIC;
  current_period NUMERIC := 0;
  period_30_60 NUMERIC := 0;
  period_60_90 NUMERIC := 0;
  period_over_90 NUMERIC := 0;
  charge_record RECORD;
  oldest_days INTEGER := 0;
BEGIN
  -- Get total payments for this client
  SELECT COALESCE(ABS(SUM(amount)), 0) INTO total_payments
  FROM account_movements
  WHERE client_id = client_uuid AND type = 'payment';

  -- Start with remaining debt to allocate (this will decrease as we apply to charges)
  remaining_to_allocate := total_payments;

  -- Loop through charges from oldest to newest (FIFO)
  FOR charge_record IN (
    SELECT
      amount,
      created_at,
      EXTRACT(DAY FROM (NOW() - created_at))::INTEGER as days_old
    FROM account_movements
    WHERE client_id = client_uuid AND type = 'charge'
    ORDER BY created_at ASC, id ASC
  )
  LOOP
    DECLARE
      charge_amount NUMERIC := charge_record.amount;
      unpaid_amount NUMERIC;
    BEGIN
      -- Calculate how much of this charge is still unpaid
      IF remaining_to_allocate >= charge_amount THEN
        -- This charge is fully paid
        remaining_to_allocate := remaining_to_allocate - charge_amount;
        unpaid_amount := 0;
      ELSE
        -- This charge is partially or fully unpaid
        unpaid_amount := charge_amount - remaining_to_allocate;
        remaining_to_allocate := 0;
      END IF;

      -- If there's unpaid amount, add it to the appropriate age bucket
      IF unpaid_amount > 0 THEN
        -- Track oldest debt days
        IF oldest_days = 0 THEN
          oldest_days := charge_record.days_old;
        END IF;

        -- Add to appropriate age range
        IF charge_record.days_old <= 30 THEN
          current_period := current_period + unpaid_amount;
        ELSIF charge_record.days_old <= 60 THEN
          period_30_60 := period_30_60 + unpaid_amount;
        ELSIF charge_record.days_old <= 90 THEN
          period_60_90 := period_60_90 + unpaid_amount;
        ELSE
          period_over_90 := period_over_90 + unpaid_amount;
        END IF;
      END IF;
    END;
  END LOOP;

  -- Return the breakdown
  RETURN QUERY SELECT
    current_period,
    period_30_60,
    period_60_90,
    period_over_90,
    (current_period + period_30_60 + period_60_90 + period_over_90) as total,
    oldest_days;
END;
$$;

GRANT EXECUTE ON FUNCTION get_debt_aging_by_client(UUID) TO authenticated;
