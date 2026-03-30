/*
  # Create Stock Management Function

  1. New Functions
    - `decrement_product_stock`: Decrements the stock of a product by a specified quantity
      - Takes product_id (uuid) and quantity_sold (integer) as parameters
      - Safely decrements the stock value
      - Returns the updated stock value

  2. Security
    - Function is SECURITY DEFINER to allow stock updates
    - Only accessible by authenticated users
*/

-- Drop function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS decrement_product_stock;

-- Create function to decrement product stock
CREATE OR REPLACE FUNCTION decrement_product_stock(
  product_id uuid,
  quantity_sold integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_stock integer;
BEGIN
  -- Update the product stock
  UPDATE products
  SET stock = stock - quantity_sold
  WHERE id = product_id
  RETURNING stock INTO new_stock;

  RETURN new_stock;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION decrement_product_stock TO authenticated;
