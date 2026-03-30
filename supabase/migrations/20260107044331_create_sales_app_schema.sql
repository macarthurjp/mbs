/*
  # Create Sales App Schema

  1. New Tables
    - `products` - Store product information
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `description` (text)
      - `price` (numeric)
      - `created_at` (timestamp)
    
    - `sales` - Store all sales transactions
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `product_id` (uuid, references products)
      - `quantity` (integer)
      - `unit_price` (numeric)
      - `total_amount` (numeric)
      - `customer_name` (text)
      - `payment_method` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Users can only see their own products and sales
    - Users can create, read, update products and sales
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price > 0),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price > 0),
  total_amount numeric NOT NULL,
  customer_name text NOT NULL,
  payment_method text DEFAULT 'cash',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sales"
  ON sales FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sales"
  ON sales FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sales"
  ON sales FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);
