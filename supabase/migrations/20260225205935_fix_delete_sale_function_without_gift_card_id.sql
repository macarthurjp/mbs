/*
  # Corregir función delete_sale para eliminar referencia a gift_card_id
  
  1. Cambios
    - Remover referencia a gift_card_id que no existe en transactions
    - Buscar gift cards usadas a través de gift_card_transactions
    - Restaurar correctamente el saldo de gift cards cuando se elimina una venta
    
  2. Seguridad
    - Mantener SECURITY DEFINER para permitir operaciones en todas las tablas
    - Verificar autenticación del usuario
*/

CREATE OR REPLACE FUNCTION delete_sale(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_client_id uuid;
  v_amount numeric;
  v_payment_method text;
  v_category text;
  v_gift_card RECORD;
  v_item RECORD;
BEGIN
  -- Verificar que el usuario está autenticado
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuario no autenticado'
    );
  END IF;

  -- Verificar que la transacción existe y obtener sus datos
  SELECT user_id, client_id, amount, payment_method, category
  INTO v_user_id, v_client_id, v_amount, v_payment_method, v_category
  FROM transactions
  WHERE id = p_transaction_id
  AND type = 'income';

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Venta no encontrada'
    );
  END IF;

  -- Si la venta usó gift cards, revertir las transacciones
  FOR v_gift_card IN
    SELECT gift_card_id, SUM(ABS(amount)) as total_used
    FROM gift_card_transactions
    WHERE transaction_id = p_transaction_id
    AND transaction_type = 'use'
    GROUP BY gift_card_id
  LOOP
    -- Restaurar el saldo de la gift card
    UPDATE gift_cards
    SET 
      current_balance = current_balance + v_gift_card.total_used,
      status = CASE
        WHEN current_balance + v_gift_card.total_used > 0 THEN 'active'
        ELSE status
      END,
      updated_at = now()
    WHERE id = v_gift_card.gift_card_id;

    -- Eliminar las transacciones de gift card asociadas a esta venta
    DELETE FROM gift_card_transactions
    WHERE gift_card_id = v_gift_card.gift_card_id
    AND transaction_id = p_transaction_id;
  END LOOP;

  -- Si esta venta fue la emisión de una gift card, eliminar la gift card
  IF v_category = 'Gift Cards' THEN
    -- Primero eliminar las transacciones de la gift card
    DELETE FROM gift_card_transactions
    WHERE transaction_id = p_transaction_id;
    
    -- Luego eliminar la gift card misma
    DELETE FROM gift_cards
    WHERE id IN (
      SELECT gift_card_id 
      FROM gift_card_transactions 
      WHERE transaction_id = p_transaction_id
      AND transaction_type = 'issue'
    );
  END IF;

  -- Restaurar el stock de los productos vendidos
  FOR v_item IN
    SELECT ti.product_id, ti.quantity
    FROM transaction_items ti
    WHERE ti.transaction_id = p_transaction_id
    AND ti.product_id IS NOT NULL
  LOOP
    UPDATE products
    SET stock = stock + v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  -- Si la venta fue a cuenta corriente, revertir el balance del cliente
  IF v_client_id IS NOT NULL AND v_payment_method = 'cuenta_corriente' THEN
    -- Eliminar movimientos de cuenta corriente asociados
    DELETE FROM account_movements
    WHERE transaction_id = p_transaction_id;

    -- Actualizar el balance del cliente restando el monto de la venta
    UPDATE clients
    SET balance = balance - v_amount
    WHERE id = v_client_id;
  END IF;

  -- Eliminar los items de la transacción
  DELETE FROM transaction_items
  WHERE transaction_id = p_transaction_id;

  -- Eliminar la transacción
  DELETE FROM transactions
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Venta eliminada correctamente'
  );
END;
$$;
