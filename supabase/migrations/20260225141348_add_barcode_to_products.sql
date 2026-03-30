/*
  # Add Barcode Support to Products

  1. Changes
    - Add `barcode` column to `products` table
      - Stores product barcode (EAN-13, UPC, Code128, etc.)
      - Unique constraint to prevent duplicate barcodes
      - Optional field (can be null)
    
  2. Notes
    - Barcodes are unique identifiers for products
    - Used for scanning with barcode readers/guns
    - Speeds up sales process and reduces errors
*/

-- Add barcode column to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE products ADD COLUMN barcode text;
  END IF;
END $$;

-- Create unique index on barcode (excluding nulls)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'products' AND indexname = 'products_barcode_key'
  ) THEN
    CREATE UNIQUE INDEX products_barcode_key ON products(barcode) WHERE barcode IS NOT NULL;
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN products.barcode IS 'Product barcode for scanning (EAN-13, UPC, Code128, etc.)';