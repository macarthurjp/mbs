/*
  # Fix create_gift_card function to use correct column names
  
  1. Changes
    - Use `amount` instead of `total_amount`
    - Use `description` instead of `notes`
    - Match the actual schema of transactions table
*/

-- Drop existing function
DROP FUNCTION IF EXISTS create_gift_card(decimal, text, text, text, timestamptz, uuid, text);

-- Recreate with correct column names
CREATE OR REPLACE FUNCTION create_gift_card(
  p_amount decimal,
  p_payment_method text DEFAULT 'efectivo',
  p_gift_from text DEFAULT NULL,
  p_gift_to text DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_gift_card_id uuid;
  v_transaction_id uuid;
  v_user_id uuid;
  v_payment_method_valid boolean;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;
  
  -- Validate payment method
  SELECT EXISTS(
    SELECT 1 FROM unnest(ARRAY['efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito']) 
    AS valid_method 
    WHERE valid_method = p_payment_method
  ) INTO v_payment_method_valid;
  
  IF NOT v_payment_method_valid THEN
    RAISE EXCEPTION 'Invalid payment method. Must be: efectivo, transferencia, tarjeta_debito, or tarjeta_credito';
  END IF;
  
  -- Generate unique code
  v_code := generate_gift_card_code();
  
  -- Create sale transaction for the gift card
  INSERT INTO transactions (
    type,
    amount,
    payment_method,
    client_id,
    description,
    user_id,
    created_at
  ) VALUES (
    'income',
    p_amount,
    p_payment_method,
    p_client_id,
    COALESCE('Venta de Gift Card ' || v_code || 
             CASE WHEN p_gift_to IS NOT NULL THEN ' para ' || p_gift_to ELSE '' END,
             'Venta de Gift Card'),
    v_user_id,
    now()
  ) RETURNING id INTO v_transaction_id;
  
  -- Create gift card
  INSERT INTO gift_cards (
    code,
    initial_amount,
    current_balance,
    issued_by,
    gift_from,
    gift_to,
    client_id,
    notes
  ) VALUES (
    v_code,
    p_amount,
    p_amount,
    v_user_id,
    p_gift_from,
    p_gift_to,
    p_client_id,
    p_notes
  ) RETURNING id INTO v_gift_card_id;
  
  -- Create initial gift card transaction linked to sale
  INSERT INTO gift_card_transactions (
    gift_card_id,
    transaction_id,
    transaction_type,
    amount,
    balance_after,
    performed_by,
    notes
  ) VALUES (
    v_gift_card_id,
    v_transaction_id,
    'issue',
    p_amount,
    p_amount,
    v_user_id,
    'Gift card issued - Payment: ' || p_payment_method
  );
  
  RETURN json_build_object(
    'success', true,
    'gift_card_id', v_gift_card_id,
    'transaction_id', v_transaction_id,
    'code', v_code,
    'amount', p_amount,
    'balance', p_amount,
    'payment_method', p_payment_method
  );
END;
$$;
