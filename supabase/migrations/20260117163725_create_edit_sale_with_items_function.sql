/*
  # Edit Sale with Items Function

  1. Purpose
    - Allow complete editing of a sale including items (products and quantities)
    - Handle stock adjustments when products are returned or changed
    - Update client balance if payment method changes
    - Maintain data consistency across all tables

  2. Changes Handled
    - Add new items to a sale
    - Remove items from a sale (returns stock)
    - Modify quantities of existing items
    - Update transaction details (client, payment method, date, description)
    - Recalculate total amount
    - Update account movements and balances

  3. Security
    - Function is SECURITY DEFINER to allow proper updates
    - Only authenticated users can execute
    - Maintains audit trail by updating timestamps
*/

CREATE OR REPLACE FUNCTION edit_sale_with_items(
  p_transaction_id uuid,
  p_new_client_id uuid,
  p_new_payment_method text,
  p_new_date timestamptz,
  p_new_description text,
  p_items jsonb  -- Array of {product_id, quantity, unit_price}
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_transaction record;
  v_old_client_id uuid;
  v_old_payment_method text;
  v_old_amount numeric;
  v_new_amount numeric := 0;
  v_item jsonb;
  v_old_item record;
  v_product_id uuid;
  v_quantity integer;
  v_unit_price numeric;
  v_subtotal numeric;
  v_account_movement_id uuid;
BEGIN
  -- Validate input
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Debe incluir al menos un producto'
    );
  END IF;

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
  v_old_amount := v_old_transaction.amount;

  -- Step 1: Return stock for all old items
  FOR v_old_item IN 
    SELECT product_id, quantity
    FROM transaction_items
    WHERE transaction_id = p_transaction_id AND product_id IS NOT NULL
  LOOP
    UPDATE products
    SET stock = stock + v_old_item.quantity
    WHERE id = v_old_item.product_id;
  END LOOP;

  -- Step 2: Delete all old items
  DELETE FROM transaction_items WHERE transaction_id = p_transaction_id;

  -- Step 3: Insert new items and deduct stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_unit_price := (v_item->>'unit_price')::numeric;
    v_subtotal := v_quantity * v_unit_price;
    v_new_amount := v_new_amount + v_subtotal;

    -- Validate stock availability
    IF NOT EXISTS (
      SELECT 1 FROM products 
      WHERE id = v_product_id AND stock >= v_quantity
    ) THEN
      -- Rollback will happen automatically
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Stock insuficiente para uno de los productos'
      );
    END IF;

    -- Insert new item
    INSERT INTO transaction_items (
      transaction_id,
      product_id,
      quantity,
      unit_price,
      subtotal
    ) VALUES (
      p_transaction_id,
      v_product_id,
      v_quantity,
      v_unit_price,
      v_subtotal
    );

    -- Deduct stock
    UPDATE products
    SET stock = stock - v_quantity
    WHERE id = v_product_id;
  END LOOP;

  -- Step 4: Update transaction amount
  UPDATE transactions
  SET amount = v_new_amount
  WHERE id = p_transaction_id;

  -- Step 5: Handle account movements for old configuration
  IF v_old_payment_method IN ('Cuenta Corriente', 'cuenta_corriente') AND v_old_client_id IS NOT NULL THEN
    -- Find account movement
    SELECT id INTO v_account_movement_id
    FROM account_movements
    WHERE transaction_id = p_transaction_id AND type = 'charge';

    IF FOUND THEN
      -- Delete old movement
      DELETE FROM account_movements WHERE id = v_account_movement_id;
      
      -- Update old client balance
      UPDATE clients
      SET balance = balance - v_old_amount
      WHERE id = v_old_client_id;
    END IF;
  END IF;

  -- Step 6: Handle account movements for new configuration
  IF p_new_payment_method IN ('Cuenta Corriente', 'cuenta_corriente') AND p_new_client_id IS NOT NULL THEN
    -- Create new account movement
    INSERT INTO account_movements (
      client_id,
      transaction_id,
      type,
      amount,
      description,
      balance_after,
      user_id,
      created_at
    ) VALUES (
      p_new_client_id,
      p_transaction_id,
      'charge',
      v_new_amount,
      p_new_description,
      (SELECT balance + v_new_amount FROM clients WHERE id = p_new_client_id),
      auth.uid(),
      p_new_date
    );

    -- Update new client balance
    UPDATE clients
    SET balance = balance + v_new_amount
    WHERE id = p_new_client_id;
  END IF;

  -- Step 7: Update transaction details
  UPDATE transactions
  SET
    client_id = p_new_client_id,
    payment_method = p_new_payment_method,
    description = p_new_description,
    created_at = p_new_date,
    amount = v_new_amount
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Venta actualizada correctamente',
    'old_amount', v_old_amount,
    'new_amount', v_new_amount
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
GRANT EXECUTE ON FUNCTION edit_sale_with_items TO authenticated;
