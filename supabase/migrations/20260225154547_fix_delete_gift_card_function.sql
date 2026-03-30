/*
  # Fix Delete Gift Card Function
  
  1. Changes
    - Updates delete_gift_card function to allow deletion of unused gift cards
    - A gift card is considered "unused" if it has no "use" transactions
    - Allows deletion even if there are "issue" transactions (creation records)
    
  2. Security
    - Only authenticated users can delete gift cards
    - Only allows deletion of gift cards that have never been used
*/

CREATE OR REPLACE FUNCTION delete_gift_card(p_gift_card_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_gift_card gift_cards%ROWTYPE;
  v_use_count integer;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No autenticado'
    );
  END IF;
  
  SELECT * INTO v_gift_card
  FROM gift_cards
  WHERE id = p_gift_card_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Gift card no encontrada'
    );
  END IF;
  
  SELECT COUNT(*) INTO v_use_count
  FROM gift_card_transactions
  WHERE gift_card_id = p_gift_card_id
  AND transaction_type = 'use';
  
  IF v_use_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No se puede eliminar una gift card que ya fue utilizada'
    );
  END IF;
  
  DELETE FROM gift_card_transactions
  WHERE gift_card_id = p_gift_card_id;
  
  DELETE FROM gift_cards
  WHERE id = p_gift_card_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Gift card eliminada correctamente'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION delete_gift_card TO authenticated;
