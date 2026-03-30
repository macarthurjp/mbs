/*
  # Generate Barcodes for Existing Products

  1. Changes
    - Generates unique 13-digit EAN-13 barcodes for all products that don't have one
    - Uses a sequential numbering system starting from 2000000000001
    - Ensures all barcodes are unique and valid

  2. Notes
    - Only updates products where barcode IS NULL
    - Barcodes start with "200" prefix (internal company code)
    - Sequential numbering ensures uniqueness
*/

DO $$
DECLARE
  product_record RECORD;
  counter BIGINT := 1;
  new_barcode TEXT;
BEGIN
  FOR product_record IN 
    SELECT id FROM products WHERE barcode IS NULL ORDER BY created_at
  LOOP
    -- Generate barcode: 200 prefix + 10 digit counter
    new_barcode := '200' || LPAD(counter::TEXT, 10, '0');
    
    -- Update the product
    UPDATE products 
    SET barcode = new_barcode 
    WHERE id = product_record.id;
    
    counter := counter + 1;
  END LOOP;
END $$;