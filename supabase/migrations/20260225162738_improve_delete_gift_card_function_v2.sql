/*
  # Mejorar función delete_gift_card

  1. Cambios
    - Permitir eliminar gift cards que tienen transacciones huérfanas (sin sale_transaction_id)
    - Solo bloquear eliminación si hay transacciones con ventas activas
    - Eliminar automáticamente transacciones huérfanas al eliminar la gift card
    
  2. Seguridad
    - Mantener SECURITY DEFINER
    - Verificar autenticación del usuario
*/

DROP FUNCTION IF EXISTS delete_gift_card(uuid);

CREATE FUNCTION delete_gift_card(p_gift_card_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_status text;
  v_active_transactions_count integer;
BEGIN
  -- Verificar que el usuario está autenticado
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Usuario no autenticado'
    );
  END IF;

  -- Obtener información de la gift card
  SELECT code, status
  INTO v_code, v_status
  FROM gift_cards
  WHERE id = p_gift_card_id;

  IF v_code IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Gift card no encontrada'
    );
  END IF;

  -- Contar transacciones activas (que tienen una venta asociada válida)
  SELECT COUNT(*)
  INTO v_active_transactions_count
  FROM gift_card_transactions gct
  WHERE gct.gift_card_id = p_gift_card_id
  AND gct.transaction_type = 'use'
  AND gct.transaction_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.id = gct.transaction_id
  );

  -- Si hay transacciones activas, no permitir eliminación
  IF v_active_transactions_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No se puede eliminar la gift card porque tiene transacciones asociadas a ventas activas. Primero elimina las ventas relacionadas.'
    );
  END IF;

  -- Eliminar todas las transacciones de la gift card (incluyendo huérfanas)
  DELETE FROM gift_card_transactions
  WHERE gift_card_id = p_gift_card_id;

  -- Eliminar la gift card
  DELETE FROM gift_cards
  WHERE id = p_gift_card_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Gift card eliminada correctamente'
  );
END;
$$;
