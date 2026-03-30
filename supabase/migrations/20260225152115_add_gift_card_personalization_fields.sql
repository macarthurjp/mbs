/*
  # Add Personalization Fields to Gift Cards

  1. Changes
    - Add `gift_from` field (DE:)
    - Add `gift_to` field (PARA:)
    - Remove `expires_at` field (no longer needed)
    
  2. Notes
    - These fields allow personalizing the gift card with sender and recipient names
*/

-- Add new fields
ALTER TABLE gift_cards 
ADD COLUMN IF NOT EXISTS gift_from text,
ADD COLUMN IF NOT EXISTS gift_to text;

-- Remove expires_at since we're not using expiration anymore
ALTER TABLE gift_cards 
DROP COLUMN IF EXISTS expires_at;

-- Update the create_gift_card function
CREATE OR REPLACE FUNCTION create_gift_card(
  p_amount decimal,
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
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;
  
  v_code := generate_gift_card_code();
  
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
  
  INSERT INTO gift_card_transactions (
    gift_card_id,
    transaction_type,
    amount,
    balance_after,
    performed_by,
    notes
  ) VALUES (
    v_gift_card_id,
    'issue',
    p_amount,
    p_amount,
    v_user_id,
    'Gift card issued'
  );
  
  RETURN json_build_object(
    'success', true,
    'gift_card_id', v_gift_card_id,
    'code', v_code,
    'amount', p_amount,
    'balance', p_amount
  );
END;
$$;

-- Update validate_gift_card function to remove expiration check
CREATE OR REPLACE FUNCTION validate_gift_card(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gift_card gift_cards%ROWTYPE;
  v_is_valid boolean := false;
  v_message text;
BEGIN
  SELECT * INTO v_gift_card
  FROM gift_cards
  WHERE code = upper(trim(p_code));
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'message', 'Gift card no encontrada'
    );
  END IF;
  
  IF v_gift_card.status = 'cancelled' THEN
    v_message := 'Gift card cancelada';
  ELSIF v_gift_card.status = 'used' THEN
    v_message := 'Gift card ya utilizada completamente';
  ELSIF v_gift_card.current_balance <= 0 THEN
    v_message := 'Gift card sin saldo disponible';
  ELSE
    v_is_valid := true;
    v_message := 'Gift card válida';
  END IF;
  
  RETURN json_build_object(
    'valid', v_is_valid,
    'message', v_message,
    'gift_card_id', v_gift_card.id,
    'code', v_gift_card.code,
    'current_balance', v_gift_card.current_balance,
    'initial_amount', v_gift_card.initial_amount,
    'gift_from', v_gift_card.gift_from,
    'gift_to', v_gift_card.gift_to,
    'status', v_gift_card.status
  );
END;
$$;

-- Update use_gift_card to remove expiration check
CREATE OR REPLACE FUNCTION use_gift_card(
  p_code text,
  p_amount decimal,
  p_transaction_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gift_card gift_cards%ROWTYPE;
  v_user_id uuid;
  v_new_balance decimal;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT * INTO v_gift_card
  FROM gift_cards
  WHERE code = upper(trim(p_code))
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Gift card no encontrada');
  END IF;
  
  IF v_gift_card.status NOT IN ('active') THEN
    RETURN json_build_object('success', false, 'message', 'Gift card no está activa');
  END IF;
  
  IF v_gift_card.current_balance < p_amount THEN
    RETURN json_build_object('success', false, 'message', 'Saldo insuficiente en gift card');
  END IF;
  
  v_new_balance := v_gift_card.current_balance - p_amount;
  
  UPDATE gift_cards
  SET 
    current_balance = v_new_balance,
    status = CASE WHEN v_new_balance <= 0 THEN 'used' ELSE status END,
    updated_at = now()
  WHERE id = v_gift_card.id;
  
  INSERT INTO gift_card_transactions (
    gift_card_id,
    transaction_id,
    transaction_type,
    amount,
    balance_after,
    performed_by,
    notes
  ) VALUES (
    v_gift_card.id,
    p_transaction_id,
    'use',
    p_amount,
    v_new_balance,
    v_user_id,
    COALESCE(p_notes, 'Used in sale')
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Gift card aplicada correctamente',
    'amount_used', p_amount,
    'new_balance', v_new_balance
  );
END;
$$;
