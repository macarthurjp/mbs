/*
  # Corregir función delete_sale para manejar gift cards

  1. Cambios
    - Cuando se elimina una venta que usó gift card, revertir las transacciones de gift card
    - Restaurar el saldo de la gift card al estado anterior
    - Eliminar las transacciones de gift card asociadas a la venta
    
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
  v_gift_card_id uuid;
  v_gift_card_amount numeric;
  v_item RECORD;
BEGIN
  -- Verificar que el usuario está autenticado
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuario no autenticado'
    );
  END IF;

  -- Verificar que la transacción existe y es una venta
  SELECT user_id, client_id, amount, payment_method, gift_card_id
  INTO v_user_id, v_client_id, v_amount, v_payment_method, v_gift_card_id
  FROM transactions
  WHERE id = p_transaction_id
  AND type = 'income';

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Venta no encontrada'
    );
  END IF;

  -- Si la venta usó una gift card, revertir las transacciones
  IF v_gift_card_id IS NOT NULL THEN
    -- Obtener el monto que se usó de la gift card en esta venta
    SELECT COALESCE(SUM(amount), 0)
    INTO v_gift_card_amount
    FROM gift_card_transactions
    WHERE gift_card_id = v_gift_card_id
    AND transaction_id = p_transaction_id
    AND transaction_type = 'use';

    -- Restaurar el saldo de la gift card
    IF v_gift_card_amount > 0 THEN
      UPDATE gift_cards
      SET 
        current_balance = current_balance + v_gift_card_amount,
        status = CASE
          WHEN current_balance + v_gift_card_amount > 0 THEN 'active'
          ELSE status
        END
      WHERE id = v_gift_card_id;
    END IF;

    -- Eliminar las transacciones de gift card asociadas a esta venta
    DELETE FROM gift_card_transactions
    WHERE gift_card_id = v_gift_card_id
    AND transaction_id = p_transaction_id;
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
