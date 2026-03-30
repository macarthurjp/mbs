/*
  # Create Gift Cards System

  1. New Tables
    - `gift_cards`
      - `id` (uuid, primary key)
      - `code` (text, unique) - Código único de la gift card
      - `initial_amount` (decimal) - Monto inicial
      - `current_balance` (decimal) - Saldo actual disponible
      - `status` (text) - Estado: active, used, expired, cancelled
      - `issued_by` (uuid) - Usuario que emitió la gift card
      - `issued_at` (timestamptz) - Fecha de emisión
      - `expires_at` (timestamptz) - Fecha de expiración
      - `client_id` (uuid, nullable) - Cliente asociado (opcional)
      - `notes` (text) - Notas adicionales
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `gift_card_transactions`
      - `id` (uuid, primary key)
      - `gift_card_id` (uuid) - Referencia a gift_cards
      - `transaction_id` (uuid, nullable) - Transacción asociada si se usó
      - `transaction_type` (text) - Tipo: issue, use, refund, cancel
      - `amount` (decimal) - Monto de la transacción
      - `balance_after` (decimal) - Saldo después de la transacción
      - `performed_by` (uuid) - Usuario que realizó la transacción
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
    
  3. Functions
    - Function to generate unique gift card codes
    - Function to validate and use gift card
    - Function to check gift card balance
*/

-- Create gift_cards table
CREATE TABLE IF NOT EXISTS gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  initial_amount decimal(10,2) NOT NULL CHECK (initial_amount > 0),
  current_balance decimal(10,2) NOT NULL CHECK (current_balance >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  issued_by uuid REFERENCES auth.users(id) NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  client_id uuid REFERENCES clients(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create gift_card_transactions table
CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id uuid REFERENCES gift_cards(id) ON DELETE CASCADE NOT NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('issue', 'use', 'refund', 'cancel')),
  amount decimal(10,2) NOT NULL,
  balance_after decimal(10,2) NOT NULL,
  performed_by uuid REFERENCES auth.users(id) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_card_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for gift_cards
CREATE POLICY "Authenticated users can view gift cards"
  ON gift_cards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create gift cards"
  ON gift_cards FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = issued_by);

CREATE POLICY "Authenticated users can update gift cards"
  ON gift_cards FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for gift_card_transactions
CREATE POLICY "Authenticated users can view gift card transactions"
  ON gift_card_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create gift card transactions"
  ON gift_card_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = performed_by);

-- Function to generate unique gift card code
CREATE OR REPLACE FUNCTION generate_gift_card_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate code: GC-XXXXXX (6 random alphanumeric characters)
    new_code := 'GC-' || upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM gift_cards WHERE code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Function to create a new gift card
CREATE OR REPLACE FUNCTION create_gift_card(
  p_amount decimal,
  p_expires_at timestamptz DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_gift_card_id uuid;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;
  
  -- Generate unique code
  v_code := generate_gift_card_code();
  
  -- Create gift card
  INSERT INTO gift_cards (
    code,
    initial_amount,
    current_balance,
    issued_by,
    expires_at,
    client_id,
    notes
  ) VALUES (
    v_code,
    p_amount,
    p_amount,
    v_user_id,
    p_expires_at,
    p_client_id,
    p_notes
  ) RETURNING id INTO v_gift_card_id;
  
  -- Create initial transaction
  INSERT INTO gift_card_transactions (
    gift_card_id,
    transaction_type,
    amount,
    balance_after,
    performed_by,
    notes
  ) VALUES (
    v_gift_card_id,
    'issue',
    p_amount,
    p_amount,
    v_user_id,
    'Gift card issued'
  );
  
  RETURN json_build_object(
    'success', true,
    'gift_card_id', v_gift_card_id,
    'code', v_code,
    'amount', p_amount,
    'balance', p_amount
  );
END;
$$;

-- Function to validate and get gift card info
CREATE OR REPLACE FUNCTION validate_gift_card(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gift_card gift_cards%ROWTYPE;
  v_is_valid boolean := false;
  v_message text;
BEGIN
  -- Get gift card
  SELECT * INTO v_gift_card
  FROM gift_cards
  WHERE code = upper(trim(p_code));
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'message', 'Gift card no encontrada'
    );
  END IF;
  
  -- Check status
  IF v_gift_card.status = 'cancelled' THEN
    v_message := 'Gift card cancelada';
  ELSIF v_gift_card.status = 'used' THEN
    v_message := 'Gift card ya utilizada completamente';
  ELSIF v_gift_card.current_balance <= 0 THEN
    v_message := 'Gift card sin saldo disponible';
  ELSIF v_gift_card.expires_at IS NOT NULL AND v_gift_card.expires_at < now() THEN
    -- Auto-expire if needed
    UPDATE gift_cards SET status = 'expired', updated_at = now()
    WHERE id = v_gift_card.id;
    v_message := 'Gift card vencida';
  ELSE
    v_is_valid := true;
    v_message := 'Gift card válida';
  END IF;
  
  RETURN json_build_object(
    'valid', v_is_valid,
    'message', v_message,
    'gift_card_id', v_gift_card.id,
    'code', v_gift_card.code,
    'current_balance', v_gift_card.current_balance,
    'initial_amount', v_gift_card.initial_amount,
    'expires_at', v_gift_card.expires_at,
    'status', v_gift_card.status
  );
END;
$$;

-- Function to use gift card (deduct amount)
CREATE OR REPLACE FUNCTION use_gift_card(
  p_code text,
  p_amount decimal,
  p_transaction_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gift_card gift_cards%ROWTYPE;
  v_user_id uuid;
  v_new_balance decimal;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get and lock gift card
  SELECT * INTO v_gift_card
  FROM gift_cards
  WHERE code = upper(trim(p_code))
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Gift card no encontrada');
  END IF;
  
  -- Validate
  IF v_gift_card.status NOT IN ('active') THEN
    RETURN json_build_object('success', false, 'message', 'Gift card no está activa');
  END IF;
  
  IF v_gift_card.current_balance < p_amount THEN
    RETURN json_build_object('success', false, 'message', 'Saldo insuficiente en gift card');
  END IF;
  
  IF v_gift_card.expires_at IS NOT NULL AND v_gift_card.expires_at < now() THEN
    UPDATE gift_cards SET status = 'expired', updated_at = now() WHERE id = v_gift_card.id;
    RETURN json_build_object('success', false, 'message', 'Gift card vencida');
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_gift_card.current_balance - p_amount;
  
  -- Update gift card
  UPDATE gift_cards
  SET 
    current_balance = v_new_balance,
    status = CASE WHEN v_new_balance <= 0 THEN 'used' ELSE status END,
    updated_at = now()
  WHERE id = v_gift_card.id;
  
  -- Record transaction
  INSERT INTO gift_card_transactions (
    gift_card_id,
    transaction_id,
    transaction_type,
    amount,
    balance_after,
    performed_by,
    notes
  ) VALUES (
    v_gift_card.id,
    p_transaction_id,
    'use',
    p_amount,
    v_new_balance,
    v_user_id,
    COALESCE(p_notes, 'Used in sale')
  );
  
  RETURN json_build_object(
    'success', true,
    'message', 'Gift card aplicada correctamente',
    'amount_used', p_amount,
    'new_balance', v_new_balance
  );
END;
$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_client ON gift_cards(client_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_gift_card ON gift_card_transactions(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_transaction ON gift_card_transactions(transaction_id);
