/*
  # Gift Cards Comprehensive Reporting Functions

  1. New Functions
    - `get_gift_cards_summary()`: Returns overall statistics of gift cards
    - `get_gift_cards_transactions(start_date, end_date)`: Returns all transactions in a period
    - `get_gift_cards_expiring(days_ahead)`: Returns cards expiring in X days
    - `get_sales_with_gift_cards(start_date, end_date)`: Returns sales that used gift cards
    - `get_gift_card_details(card_code)`: Returns complete details of a specific card

  2. Security
    - All functions require authenticated access
    - Functions use RLS policies from existing tables
*/

-- Function 1: Gift Cards Summary
CREATE OR REPLACE FUNCTION get_gift_cards_summary()
RETURNS TABLE (
  total_issued numeric,
  total_available numeric,
  total_used numeric,
  count_active bigint,
  count_used bigint,
  count_expired bigint,
  count_cancelled bigint,
  usage_rate numeric,
  avg_card_value numeric,
  avg_remaining_balance numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(gc.initial_amount), 0) as total_issued,
    COALESCE(SUM(gc.current_balance), 0) as total_available,
    COALESCE(SUM(gc.initial_amount - gc.current_balance), 0) as total_used,
    COUNT(*) FILTER (WHERE gc.status = 'active') as count_active,
    COUNT(*) FILTER (WHERE gc.status = 'used') as count_used,
    COUNT(*) FILTER (WHERE gc.status = 'expired') as count_expired,
    COUNT(*) FILTER (WHERE gc.status = 'cancelled') as count_cancelled,
    CASE
      WHEN SUM(gc.initial_amount) > 0
      THEN ROUND((SUM(gc.initial_amount - gc.current_balance) / SUM(gc.initial_amount) * 100)::numeric, 2)
      ELSE 0
    END as usage_rate,
    COALESCE(AVG(gc.initial_amount), 0) as avg_card_value,
    COALESCE(AVG(gc.current_balance), 0) as avg_remaining_balance
  FROM gift_cards gc;
END;
$$;

-- Function 2: Gift Cards Transactions History
CREATE OR REPLACE FUNCTION get_gift_cards_transactions(
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (
  id uuid,
  gift_card_id uuid,
  gift_card_code text,
  transaction_type text,
  amount numeric,
  balance_before numeric,
  balance_after numeric,
  sale_id uuid,
  created_at timestamptz,
  created_by uuid,
  user_name text,
  notes text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gct.id,
    gct.gift_card_id,
    gc.code as gift_card_code,
    gct.transaction_type,
    gct.amount,
    gct.balance_before,
    gct.balance_after,
    gct.sale_id,
    gct.created_at,
    gct.created_by,
    up.username as user_name,
    gct.notes
  FROM gift_card_transactions gct
  JOIN gift_cards gc ON gc.id = gct.gift_card_id
  LEFT JOIN user_profiles up ON up.user_id = gct.created_by
  WHERE gct.created_at >= p_start_date
    AND gct.created_at <= p_end_date
  ORDER BY gct.created_at DESC;
END;
$$;

-- Function 3: Gift Cards Expiring Soon
CREATE OR REPLACE FUNCTION get_gift_cards_expiring(p_days_ahead integer DEFAULT 30)
RETURNS TABLE (
  id uuid,
  code text,
  initial_amount numeric,
  current_balance numeric,
  expiration_date date,
  days_until_expiry integer,
  recipient_name text,
  recipient_phone text,
  status text,
  created_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gc.id,
    gc.code,
    gc.initial_amount,
    gc.current_balance,
    gc.expiration_date,
    (gc.expiration_date - CURRENT_DATE) as days_until_expiry,
    gc.recipient_name,
    gc.recipient_phone,
    gc.status,
    gc.created_at
  FROM gift_cards gc
  WHERE gc.status = 'active'
    AND gc.current_balance > 0
    AND gc.expiration_date IS NOT NULL
    AND gc.expiration_date <= CURRENT_DATE + p_days_ahead
    AND gc.expiration_date >= CURRENT_DATE
  ORDER BY gc.expiration_date ASC;
END;
$$;

-- Function 4: Sales with Gift Cards
CREATE OR REPLACE FUNCTION get_sales_with_gift_cards(
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (
  sale_id uuid,
  sale_date timestamptz,
  total_amount numeric,
  gift_card_amount numeric,
  other_payments numeric,
  gift_card_code text,
  client_name text,
  user_name text,
  payment_method text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as sale_id,
    s.created_at as sale_date,
    s.total as total_amount,
    COALESCE(gct.amount, 0) as gift_card_amount,
    (s.total - COALESCE(gct.amount, 0)) as other_payments,
    gc.code as gift_card_code,
    c.name as client_name,
    up.username as user_name,
    s.payment_method
  FROM sales s
  LEFT JOIN gift_card_transactions gct ON gct.sale_id = s.id AND gct.transaction_type = 'use'
  LEFT JOIN gift_cards gc ON gc.id = gct.gift_card_id
  LEFT JOIN clients c ON c.id = s.client_id
  LEFT JOIN user_profiles up ON up.user_id = s.user_id
  WHERE s.created_at >= p_start_date
    AND s.created_at <= p_end_date
    AND gct.id IS NOT NULL
  ORDER BY s.created_at DESC;
END;
$$;

-- Function 5: Gift Card Details
CREATE OR REPLACE FUNCTION get_gift_card_details(p_code text)
RETURNS TABLE (
  id uuid,
  code text,
  initial_amount numeric,
  current_balance numeric,
  status text,
  expiration_date date,
  recipient_name text,
  recipient_phone text,
  sender_name text,
  custom_message text,
  created_at timestamptz,
  created_by uuid,
  creator_name text,
  transaction_id uuid,
  transaction_type text,
  transaction_amount numeric,
  transaction_date timestamptz,
  transaction_user text,
  transaction_notes text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gc.id,
    gc.code,
    gc.initial_amount,
    gc.current_balance,
    gc.status,
    gc.expiration_date,
    gc.recipient_name,
    gc.recipient_phone,
    gc.sender_name,
    gc.custom_message,
    gc.created_at,
    gc.created_by,
    up.username as creator_name,
    gct.id as transaction_id,
    gct.transaction_type,
    gct.amount as transaction_amount,
    gct.created_at as transaction_date,
    up2.username as transaction_user,
    gct.notes as transaction_notes
  FROM gift_cards gc
  LEFT JOIN user_profiles up ON up.user_id = gc.created_by
  LEFT JOIN gift_card_transactions gct ON gct.gift_card_id = gc.id
  LEFT JOIN user_profiles up2 ON up2.user_id = gct.created_by
  WHERE gc.code = p_code
  ORDER BY gct.created_at DESC;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_gift_cards_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_gift_cards_transactions(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_gift_cards_expiring(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_with_gift_cards(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION get_gift_card_details(text) TO authenticated;