/*
  # Corregir permisos de la función delete_sale

  1. Cambios
    - Permitir que cualquier usuario autenticado pueda eliminar ventas
    - Mantener la seguridad verificando que sea una venta válida
    - Eliminar restricción de user_id para permitir gestión colaborativa
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
  v_items_count integer;
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
  SELECT user_id, client_id, amount, payment_method
  INTO v_user_id, v_client_id, v_amount, v_payment_method
  FROM transactions
  WHERE id = p_transaction_id
  AND type = 'income';

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Venta no encontrada'
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
