/*
  # Función para Eliminar Ventas de forma Segura

  1. Nueva Función
    - `delete_sale` - Elimina una venta y revierte todos sus efectos
      - Restaura el stock de los productos vendidos
      - Actualiza el balance del cliente si fue venta a crédito
      - Elimina los movimientos de cuenta corriente asociados
      - Elimina los items de la transacción
      - Elimina la transacción principal

  2. Seguridad
    - Solo el propietario de la venta puede eliminarla
    - Usa transacciones para garantizar consistencia de datos
    - Valida que la venta exista y pertenezca al usuario

  3. Importante
    - Esta operación es IRREVERSIBLE
    - Se recomienda usar con precaución
    - Todos los cambios se aplican de forma atómica
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
  v_items_count integer;
  v_item RECORD;
BEGIN
  -- Verificar que la transacción existe y pertenece al usuario
  SELECT user_id, client_id, amount
  INTO v_user_id, v_client_id, v_amount
  FROM transactions
  WHERE id = p_transaction_id
  AND type = 'income';

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Venta no encontrada'
    );
  END IF;

  IF v_user_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No tienes permiso para eliminar esta venta'
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
  IF v_client_id IS NOT NULL THEN
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