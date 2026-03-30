/*
  # Add Increment Stock Function

  1. New Functions
    - `increment_product_stock`: Increments the stock of a product by a specified quantity
      - Takes product_id (uuid) and quantity_returned (integer) as parameters
      - Safely increments the stock value
      - Returns the updated stock value
      - Used when canceling sales to restore inventory

  2. Security
    - Function is SECURITY DEFINER to allow stock updates
    - Only accessible by authenticated users
*/

-- Drop function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS increment_product_stock;

-- Create function to increment product stock
CREATE OR REPLACE FUNCTION increment_product_stock(
  product_id uuid,
  quantity_returned integer
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
  SET stock = stock + quantity_returned
  WHERE id = product_id
  RETURNING stock INTO new_stock;

  RETURN new_stock;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_product_stock TO authenticated;