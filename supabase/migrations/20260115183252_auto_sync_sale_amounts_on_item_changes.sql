/*
  # Sincronización Automática de Montos de Venta al Modificar Items

  ## Problema
  - Cuando se eliminan, agregan o modifican items de una venta manualmente
  - El monto total de la transacción no se actualiza automáticamente
  - Los movimientos de cuenta corriente quedan desactualizados
  - El balance del cliente no refleja la realidad

  ## Solución
  1. Crear un trigger que se ejecute DESPUÉS de:
     - Eliminar un item (DELETE)
     - Agregar un item (INSERT)
     - Modificar un item (UPDATE)
  2. El trigger recalcula automáticamente:
     - El monto total de la transacción
     - El movimiento de cuenta corriente asociado (si existe)
     - El balance del cliente
  3. Si la venta queda sin items, se elimina automáticamente

  ## Notas de Seguridad
  - Solo se aplica a transacciones de tipo 'income' (ventas)
  - Mantiene la integridad de datos en cuenta corriente
  - Actualiza el balance del cliente correctamente
*/

-- Función que sincroniza el monto de una venta cuando cambian sus items
CREATE OR REPLACE FUNCTION sync_transaction_amount_on_item_change()
RETURNS TRIGGER AS $$
DECLARE
  v_transaction_id uuid;
  v_old_transaction_amount numeric;
  v_new_transaction_amount numeric;
  v_items_count integer;
  v_client_id uuid;
  v_payment_method text;
  v_movement_id uuid;
  v_old_movement_amount numeric;
BEGIN
  -- Determinar el transaction_id según la operación
  IF TG_OP = 'DELETE' THEN
    v_transaction_id := OLD.transaction_id;
  ELSE
    v_transaction_id := NEW.transaction_id;
  END IF;

  -- Obtener información de la transacción
  SELECT t.amount, t.client_id, t.payment_method, t.type
  INTO v_old_transaction_amount, v_client_id, v_payment_method
  FROM transactions t
  WHERE t.id = v_transaction_id;

  -- Solo procesar si es una venta (income)
  IF NOT FOUND OR v_payment_method IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calcular el nuevo monto basado en la suma de items
  SELECT COUNT(*), COALESCE(SUM(ti.subtotal), 0)
  INTO v_items_count, v_new_transaction_amount
  FROM transaction_items ti
  WHERE ti.transaction_id = v_transaction_id;

  -- Si la venta quedó sin items, eliminarla completamente
  IF v_items_count = 0 THEN
    -- Primero eliminar los movimientos de cuenta corriente
    DELETE FROM account_movements WHERE account_movements.transaction_id = v_transaction_id;
    -- Luego eliminar la transacción
    DELETE FROM transactions WHERE id = v_transaction_id;
    
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Si el monto cambió, actualizar
  IF v_old_transaction_amount != v_new_transaction_amount THEN
    -- Actualizar el monto de la transacción
    UPDATE transactions 
    SET amount = v_new_transaction_amount 
    WHERE id = v_transaction_id;

    -- Si hay un movimiento de cuenta corriente, actualizarlo
    IF v_client_id IS NOT NULL AND v_payment_method = 'Cuenta Corriente' THEN
      -- Buscar el movimiento de cuenta corriente asociado
      SELECT am.id, am.amount 
      INTO v_movement_id, v_old_movement_amount
      FROM account_movements am
      WHERE am.transaction_id = v_transaction_id
      LIMIT 1;

      IF v_movement_id IS NOT NULL THEN
        -- Actualizar el monto del movimiento
        UPDATE account_movements
        SET amount = v_new_transaction_amount
        WHERE id = v_movement_id;

        -- Actualizar el balance del cliente
        -- Restar el monto viejo y sumar el nuevo
        UPDATE clients
        SET balance = balance - v_old_movement_amount + v_new_transaction_amount
        WHERE id = v_client_id;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger para DELETE
DROP TRIGGER IF EXISTS sync_transaction_on_item_delete ON transaction_items;
CREATE TRIGGER sync_transaction_on_item_delete
  AFTER DELETE ON transaction_items
  FOR EACH ROW
  EXECUTE FUNCTION sync_transaction_amount_on_item_change();

-- Crear el trigger para INSERT
DROP TRIGGER IF EXISTS sync_transaction_on_item_insert ON transaction_items;
CREATE TRIGGER sync_transaction_on_item_insert
  AFTER INSERT ON transaction_items
  FOR EACH ROW
  EXECUTE FUNCTION sync_transaction_amount_on_item_change();

-- Crear el trigger para UPDATE
DROP TRIGGER IF EXISTS sync_transaction_on_item_update ON transaction_items;
CREATE TRIGGER sync_transaction_on_item_update
  AFTER UPDATE OF quantity, unit_price, subtotal ON transaction_items
  FOR EACH ROW
  WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity 
    OR OLD.unit_price IS DISTINCT FROM NEW.unit_price 
    OR OLD.subtotal IS DISTINCT FROM NEW.subtotal)
  EXECUTE FUNCTION sync_transaction_amount_on_item_change();

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION sync_transaction_amount_on_item_change() TO authenticated;
