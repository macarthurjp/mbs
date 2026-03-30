/*
  # Add Delete Gift Card Function

  1. New Functions
    - `delete_gift_card` - Deletes a gift card and its transactions
    
  2. Security
    - Only authenticated users can delete gift cards
    - Deletes related transactions in cascade
    
  3. Notes
    - Checks if gift card has been used before allowing deletion
    - Returns success/error message
*/

CREATE OR REPLACE FUNCTION delete_gift_card(p_gift_card_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_gift_card gift_cards%ROWTYPE;
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
  
  IF v_gift_card.current_balance < v_gift_card.initial_amount THEN
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
