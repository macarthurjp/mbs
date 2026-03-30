/*
  # Create Cashbox Closures Table
  
  This migration creates the cashbox closures system for daily cash management.
  
  ## New Tables
  
  ### `cashbox_closures`
  Stores daily cashbox opening and closing records
  
  - `id` (uuid, primary key) - Unique identifier for the closure
  - `opening_date` (timestamptz) - When the cashbox was opened
  - `closing_date` (timestamptz, nullable) - When the cashbox was closed
  - `initial_cash` (decimal) - Cash amount when opening the cashbox
  - `final_cash` (decimal, nullable) - Cash amount when closing
  - `expected_cash` (decimal, nullable) - Expected cash based on sales
  - `cash_difference` (decimal, nullable) - Difference between final and expected
  - `total_sales` (decimal, nullable) - Total sales for the period
  - `total_cash_sales` (decimal, nullable) - Sales paid with cash
  - `total_transfer_sales` (decimal, nullable) - Sales paid with transfer
  - `total_cc_sales` (decimal, nullable) - Sales paid with credit card
  - `total_cc_collections` (decimal, nullable) - Current account collections
  - `notes` (text, nullable) - Notes about the closure
  - `closed_by` (uuid, nullable) - User who closed the cashbox (references auth.users)
  - `opened_by` (uuid) - User who opened the cashbox (references auth.users)
  - `status` (text) - Status: 'open' or 'closed'
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record update timestamp
  
  ## Security
  
  - Enable RLS on `cashbox_closures` table
  - Allow authenticated users to read all closures
  - Allow authenticated users to create and update closures
*/

-- Create cashbox_closures table
CREATE TABLE IF NOT EXISTS cashbox_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_date timestamptz NOT NULL DEFAULT now(),
  closing_date timestamptz,
  initial_cash decimal(10,2) NOT NULL DEFAULT 0,
  final_cash decimal(10,2),
  expected_cash decimal(10,2),
  cash_difference decimal(10,2),
  total_sales decimal(10,2),
  total_cash_sales decimal(10,2),
  total_transfer_sales decimal(10,2),
  total_cc_sales decimal(10,2),
  total_cc_collections decimal(10,2),
  notes text,
  closed_by uuid REFERENCES auth.users(id),
  opened_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cashbox_closures ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all closures
CREATE POLICY "Authenticated users can read all cashbox closures"
  ON cashbox_closures
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to create closures
CREATE POLICY "Authenticated users can create cashbox closures"
  ON cashbox_closures
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update closures
CREATE POLICY "Authenticated users can update cashbox closures"
  ON cashbox_closures
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_cashbox_closures_status ON cashbox_closures(status);
CREATE INDEX IF NOT EXISTS idx_cashbox_closures_opening_date ON cashbox_closures(opening_date DESC);

-- Create function to get current open cashbox
CREATE OR REPLACE FUNCTION get_current_open_cashbox()
RETURNS TABLE (
  id uuid,
  opening_date timestamptz,
  initial_cash decimal,
  opened_by uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.opening_date,
    c.initial_cash,
    c.opened_by
  FROM cashbox_closures c
  WHERE c.status = 'open'
  ORDER BY c.opening_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;