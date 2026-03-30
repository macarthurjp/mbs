/*
  # Update Sale Function

  1. Purpose
    - Allow updating sale details including client, payment method, date, and description
    - Automatically handle account movement changes when client or payment method changes
    - Maintain data consistency across all related tables

  2. Changes Handled
    - Client change: Updates account movements and balances
    - Payment method change: Creates/removes account movements as needed
    - Date change: Updates timestamps on transaction and movements
    - Description change: Updates description field

  3. Security
    - Function is SECURITY DEFINER to allow proper updates
    - Only authenticated users can execute
*/

CREATE OR REPLACE FUNCTION update_sale(
  p_transaction_id uuid,
  p_new_client_id uuid,
  p_new_payment_method text,
  p_new_date timestamptz,
  p_new_description text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_transaction record;
  v_old_client_id uuid;
  v_old_payment_method text;
  v_amount numeric;
  v_old_movement_id uuid;
BEGIN
  -- Get current transaction data
  SELECT * INTO v_old_transaction
  FROM transactions
  WHERE id = p_transaction_id AND type = 'income';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Venta no encontrada'
    );
  END IF;

  v_old_client_id := v_old_transaction.client_id;
  v_old_payment_method := v_old_transaction.payment_method;
  v_amount := v_old_transaction.amount;

  -- Handle account movements based on changes
  -- Case 1: Old was cuenta corriente, need to remove old movement
  IF v_old_payment_method IN ('Cuenta Corriente', 'cuenta_corriente') AND v_old_client_id IS NOT NULL THEN
    -- Find and delete old account movement
    SELECT id INTO v_old_movement_id
    FROM account_movements
    WHERE transaction_id = p_transaction_id AND type = 'sale';

    IF FOUND THEN
      DELETE FROM account_movements WHERE id = v_old_movement_id;

      -- Update old client balance
      UPDATE clients
      SET balance = balance - v_amount
      WHERE id = v_old_client_id;
    END IF;
  END IF;

  -- Case 2: New is cuenta corriente, need to create new movement
  IF p_new_payment_method IN ('Cuenta Corriente', 'cuenta_corriente') AND p_new_client_id IS NOT NULL THEN
    -- Create new account movement
    INSERT INTO account_movements (
      client_id,
      transaction_id,
      type,
      amount,
      description,
      user_id,
      created_at
    ) VALUES (
      p_new_client_id,
      p_transaction_id,
      'sale',
      v_amount,
      p_new_description,
      auth.uid(),
      p_new_date
    );

    -- Update new client balance
    UPDATE clients
    SET balance = balance + v_amount
    WHERE id = p_new_client_id;
  END IF;

  -- Update the transaction
  UPDATE transactions
  SET
    client_id = p_new_client_id,
    payment_method = p_new_payment_method,
    description = p_new_description,
    created_at = p_new_date
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Venta actualizada correctamente'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Error: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_sale TO authenticated;
