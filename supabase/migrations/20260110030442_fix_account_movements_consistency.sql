/*
  # Corrección de Consistencia en Movimientos de Cuenta Corriente

  ## Problema
  - Al crear movimientos, el trigger actualiza el balance automáticamente
  - Al eliminar movimientos, se debe actualizar manualmente el balance
  - Esto causa inconsistencias y duplicaciones

  ## Solución
  1. Agregar trigger para revertir el balance al eliminar movimientos
  2. Agregar función para verificar y corregir inconsistencias
  3. Evitar que se creen movimientos duplicados para la misma transacción

  ## Cambios
  - Nuevo trigger `revert_client_balance_trigger` para DELETE
  - Nueva función `verify_and_fix_client_balances` para auditar datos
  - Nuevo índice único para evitar duplicados en account_movements
*/

-- Crear índice único parcial para evitar duplicados de transacciones
DROP INDEX IF EXISTS idx_account_movements_unique_transaction;
CREATE UNIQUE INDEX idx_account_movements_unique_transaction 
ON account_movements (transaction_id) 
WHERE transaction_id IS NOT NULL;

-- Función para revertir el balance del cliente al eliminar un movimiento
CREATE OR REPLACE FUNCTION revert_client_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Revertir el balance del cliente (restar el monto del movimiento eliminado)
  UPDATE clients
  SET balance = balance - OLD.amount
  WHERE id = OLD.client_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger para revertir balance automáticamente al eliminar movimientos
DROP TRIGGER IF EXISTS revert_client_balance_trigger ON account_movements;
CREATE TRIGGER revert_client_balance_trigger
  BEFORE DELETE ON account_movements
  FOR EACH ROW
  EXECUTE FUNCTION revert_client_balance();

-- Función para verificar y corregir inconsistencias en balances de clientes
CREATE OR REPLACE FUNCTION verify_and_fix_client_balances()
RETURNS TABLE (
  client_id uuid,
  client_name text,
  current_balance numeric,
  calculated_balance numeric,
  difference numeric,
  fixed boolean
) AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Primero calculamos las inconsistencias
  FOR rec IN
    SELECT 
      c.id,
      c.name,
      c.balance as current_balance,
      COALESCE(SUM(am.amount), 0) as calculated_balance,
      c.balance - COALESCE(SUM(am.amount), 0) as difference
    FROM clients c
    LEFT JOIN account_movements am ON c.id = am.client_id
    GROUP BY c.id, c.name, c.balance
    HAVING c.balance != COALESCE(SUM(am.amount), 0)
  LOOP
    -- Actualizar el balance del cliente
    UPDATE clients 
    SET balance = rec.calculated_balance 
    WHERE id = rec.id;
    
    -- Devolver el resultado
    client_id := rec.id;
    client_name := rec.name;
    current_balance := rec.current_balance;
    calculated_balance := rec.calculated_balance;
    difference := rec.difference;
    fixed := true;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION verify_and_fix_client_balances() TO authenticated;

-- Función mejorada para eliminar ventas que usa los triggers automáticos
CREATE OR REPLACE FUNCTION delete_sale(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_client_id uuid;
  v_amount numeric;
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

  -- Eliminar movimientos de cuenta corriente (el trigger revertirá el balance automáticamente)
  DELETE FROM account_movements
  WHERE transaction_id = p_transaction_id;

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

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION delete_sale(uuid) TO authenticated;
