/*
  # Tabla de Movimientos de Cuenta Corriente

  1. Nueva Tabla
    - `account_movements` - Movimientos de cuenta corriente por cliente
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - Propietario del negocio
      - `client_id` (uuid, foreign key) - Cliente relacionado
      - `transaction_id` (uuid, foreign key, optional) - Transacción de caja relacionada
      - `type` (text) - Tipo: 'charge' (cargo/venta a crédito) o 'payment' (pago)
      - `amount` (numeric) - Monto del movimiento (positivo para cargos, negativo para pagos)
      - `description` (text) - Descripción del movimiento
      - `balance_after` (numeric) - Balance del cliente después del movimiento
      - `created_at` (timestamp)

  2. Seguridad
    - RLS habilitado
    - Los usuarios solo pueden ver y modificar movimientos de sus propios clientes

  3. Triggers
    - Actualización automática del balance del cliente al insertar movimiento

  4. Índices
    - Índices en user_id, client_id, created_at para consultas rápidas
*/

-- Tabla de Movimientos de Cuenta Corriente
CREATE TABLE IF NOT EXISTS account_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('charge', 'payment')),
  amount numeric NOT NULL,
  description text NOT NULL,
  balance_after numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE account_movements ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para account_movements
CREATE POLICY "Users can view own account movements"
  ON account_movements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own account movements"
  ON account_movements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own account movements"
  ON account_movements FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own account movements"
  ON account_movements FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_account_movements_user_id ON account_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_account_movements_client_id ON account_movements(client_id);
CREATE INDEX IF NOT EXISTS idx_account_movements_created_at ON account_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_movements_transaction_id ON account_movements(transaction_id);

-- Función para actualizar el balance del cliente automáticamente
CREATE OR REPLACE FUNCTION update_client_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar el balance del cliente
  UPDATE clients
  SET balance = balance + NEW.amount
  WHERE id = NEW.client_id;
  
  -- Establecer balance_after con el nuevo balance
  SELECT balance INTO NEW.balance_after
  FROM clients
  WHERE id = NEW.client_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar balance automáticamente
DROP TRIGGER IF EXISTS update_client_balance_trigger ON account_movements;
CREATE TRIGGER update_client_balance_trigger
  BEFORE INSERT ON account_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_client_balance();