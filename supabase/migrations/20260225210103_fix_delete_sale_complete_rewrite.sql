/*
  # Reescribir completamente la función delete_sale
  
  1. Cambios
    - Simplificar la lógica de eliminación
    - Manejar correctamente gift cards sin depender de columnas inexistentes
    - Asegurar que todas las operaciones sean atómicas
    
  2. Seguridad
    - Mantener SECURITY DEFINER
    - Verificar autenticación
*/

DROP FUNCTION IF EXISTS delete_sale(uuid);

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
  v_item RECORD;
  v_gift_card_count int;
BEGIN
  -- Verificar autenticación
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuario no autenticado'
    );
  END IF;

  -- Obtener datos de la transacción
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

  -- 1. Manejar gift cards usadas en esta venta
  -- Restaurar saldo de gift cards que se usaron
  UPDATE gift_cards gc
  SET 
    current_balance = current_balance + ABS(gct.amount),
    status = CASE
      WHEN current_balance + ABS(gct.amount) > 0 THEN 'active'
      ELSE status
    END,
    updated_at = now()
  FROM gift_card_transactions gct
  WHERE gct.gift_card_id = gc.id
  AND gct.transaction_id = p_transaction_id
  AND gct.transaction_type = 'use';

  -- Eliminar registros de uso de gift cards
  DELETE FROM gift_card_transactions
  WHERE transaction_id = p_transaction_id
  AND transaction_type = 'use';

  -- 2. Si esta venta fue la emisión de una gift card, eliminarla
  IF v_category = 'Gift Cards' THEN
    -- Eliminar la gift card y sus transacciones
    DELETE FROM gift_cards
    WHERE id IN (
      SELECT gift_card_id 
      FROM gift_card_transactions 
      WHERE transaction_id = p_transaction_id
      AND transaction_type = 'issue'
    );
    
    DELETE FROM gift_card_transactions
    WHERE transaction_id = p_transaction_id
    AND transaction_type = 'issue';
  END IF;

  -- 3. Restaurar stock de productos
  FOR v_item IN
    SELECT product_id, quantity
    FROM transaction_items
    WHERE transaction_id = p_transaction_id
    AND product_id IS NOT NULL
  LOOP
    UPDATE products
    SET stock = stock + v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  -- 4. Revertir cuenta corriente si aplica
  IF v_client_id IS NOT NULL AND v_payment_method = 'cuenta_corriente' THEN
    -- Eliminar movimientos de cuenta
    DELETE FROM account_movements
    WHERE transaction_id = p_transaction_id;

    -- Restar el monto del balance del cliente
    UPDATE clients
    SET balance = balance - v_amount
    WHERE id = v_client_id;
  END IF;

  -- 5. Eliminar items de la transacción
  DELETE FROM transaction_items
  WHERE transaction_id = p_transaction_id;

  -- 6. Eliminar la transacción
  DELETE FROM transactions
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Venta eliminada correctamente'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Error al eliminar venta: ' || SQLERRM
    );
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION delete_sale TO authenticated;
