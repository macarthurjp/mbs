/*
  # Sincronización de Montos de Ventas con Items y Cuenta Corriente V3

  ## Problema
  - Cuando se eliminan items manualmente de una venta, el monto total no se actualiza
  - Los movimientos de cuenta corriente quedan con montos incorrectos
  - El balance del cliente no refleja la realidad
  - Si una venta no tiene items, debe eliminarse completamente

  ## Solución
  1. Función para detectar y corregir ventas con montos incorrectos
  2. Si una venta no tiene items, eliminarla completamente
  3. Si una venta tiene items pero el monto es incorrecto, actualizarlo
  4. Actualizar automáticamente el balance del cliente

  ## Uso
  - Ejecutar `SELECT * FROM sync_sale_amounts()` para corregir todas las inconsistencias
*/

-- Función para sincronizar los montos de ventas con sus items
CREATE OR REPLACE FUNCTION sync_sale_amounts()
RETURNS TABLE (
  fixed_transaction_id uuid,
  client_name text,
  old_amount numeric,
  new_amount numeric,
  difference numeric,
  action text
) AS $$
DECLARE
  rec RECORD;
  v_old_movement_amount numeric;
  v_movement_id uuid;
BEGIN
  -- Buscar transacciones donde el monto no coincide con la suma de items
  FOR rec IN
    SELECT 
      t.id as tid,
      t.amount as current_amount,
      COALESCE(SUM(ti.subtotal), 0) as calculated_amount,
      COUNT(ti.id) as items_count,
      t.client_id,
      c.name as cname,
      c.balance as client_balance
    FROM transactions t
    LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
    LEFT JOIN clients c ON t.client_id = c.id
    WHERE t.type = 'income'
    GROUP BY t.id, t.amount, t.client_id, c.name, c.balance
    HAVING t.amount != COALESCE(SUM(ti.subtotal), 0)
  LOOP
    -- Guardar valores para el resultado
    fixed_transaction_id := rec.tid;
    client_name := rec.cname;
    old_amount := rec.current_amount;
    new_amount := rec.calculated_amount;
    difference := rec.current_amount - rec.calculated_amount;
    
    -- Si la venta no tiene items, eliminarla completamente
    IF rec.items_count = 0 THEN
      -- Eliminar movimientos de cuenta corriente (el trigger revertirá el balance)
      DELETE FROM account_movements WHERE account_movements.transaction_id = rec.tid;
      
      -- Eliminar la transacción
      DELETE FROM transactions WHERE transactions.id = rec.tid;
      
      action := 'Eliminada (sin items)';
      
    ELSE
      -- La venta tiene items, actualizar el monto
      UPDATE transactions 
      SET amount = rec.calculated_amount 
      WHERE id = rec.tid;
      
      -- Si hay un movimiento de cuenta corriente asociado, actualizarlo
      IF rec.client_id IS NOT NULL THEN
        SELECT am.id, am.amount INTO v_movement_id, v_old_movement_amount
        FROM account_movements am
        WHERE am.transaction_id = rec.tid
        LIMIT 1;
        
        IF v_movement_id IS NOT NULL THEN
          -- Actualizar el movimiento de cuenta corriente
          UPDATE account_movements
          SET amount = rec.calculated_amount
          WHERE id = v_movement_id;
          
          -- Actualizar el balance del cliente
          -- Restar el monto viejo y sumar el monto nuevo
          UPDATE clients
          SET balance = balance - v_old_movement_amount + rec.calculated_amount
          WHERE id = rec.client_id;
        END IF;
      END IF;
      
      action := 'Monto actualizado';
    END IF;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION sync_sale_amounts() TO authenticated;

-- Ejecutar la sincronización automáticamente para corregir los datos existentes
DO $$
DECLARE
  v_result RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_result IN SELECT * FROM sync_sale_amounts() LOOP
    v_count := v_count + 1;
    RAISE NOTICE 'Venta %: % - Cliente: % - Monto anterior: % -> Monto nuevo: % (Diferencia: %)', 
      v_result.fixed_transaction_id, 
      v_result.action,
      v_result.client_name,
      v_result.old_amount,
      v_result.new_amount,
      v_result.difference;
  END LOOP;
  
  IF v_count > 0 THEN
    RAISE NOTICE 'Total de ventas corregidas: %', v_count;
  ELSE
    RAISE NOTICE 'No se encontraron inconsistencias';
  END IF;
END $$;
