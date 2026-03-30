/*
  # Sistema POS Completo - Boutique de Indumentaria

  1. Nuevas Tablas
    - `products` - Inventario de productos
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `name` (text) - Nombre del producto
      - `category` (text) - Categoría (Pantalones, Remeras, etc)
      - `size` (text) - Talle (S, M, L, XL, etc)
      - `price` (numeric) - Precio de venta
      - `cost` (numeric) - Costo de compra
      - `stock` (integer) - Cantidad en stock
      - `min_stock` (integer) - Stock mínimo para alertas
      - `description` (text) - Descripción opcional
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `clients` - Base de datos de clientes
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `name` (text) - Nombre completo o razón social
      - `email` (text) - Email del cliente
      - `phone` (text) - Teléfono
      - `address` (text) - Dirección completa
      - `notes` (text) - Notas opcionales
      - `balance` (numeric) - Saldo de cuenta corriente
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `suppliers` - Proveedores
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `name` (text) - Nombre del proveedor
      - `email` (text)
      - `phone` (text)
      - `address` (text)
      - `notes` (text)
      - `created_at` (timestamp)
    
    - `orders` - Pedidos pendientes
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `client_id` (uuid, foreign key)
      - `product_id` (uuid, foreign key)
      - `quantity` (integer)
      - `total_amount` (numeric)
      - `status` (text) - pending, completed, cancelled
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `transactions` - Movimientos de caja (Ventas, Gastos, etc)
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `type` (text) - income, expense
      - `category` (text) - venta_general, pago_proveedor, gastos_varios, etc
      - `payment_method` (text) - efectivo, transferencia, tarjeta_debito, tarjeta_credito
      - `amount` (numeric)
      - `description` (text)
      - `client_id` (uuid, foreign key, optional)
      - `created_at` (timestamp)
    
    - `transaction_items` - Items de cada transacción de venta
      - `id` (uuid, primary key)
      - `transaction_id` (uuid, foreign key)
      - `product_id` (uuid, foreign key)
      - `quantity` (integer)
      - `unit_price` (numeric)
      - `subtotal` (numeric)
      - `created_at` (timestamp)

  2. Seguridad
    - RLS habilitado en todas las tablas
    - Usuarios solo pueden ver y modificar sus propios datos
    - Políticas para SELECT, INSERT, UPDATE, DELETE por usuario

  3. Índices
    - Índices en user_id para todas las tablas
    - Índices en created_at para reportes
    - Índices en stock para alertas
    - Índices en foreign keys para joins rápidos
*/

-- Eliminar tablas antiguas si existen
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Tabla de Productos
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  size text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  cost numeric DEFAULT 0 CHECK (cost >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock integer DEFAULT 5 CHECK (min_stock >= 0),
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de Clientes
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  notes text,
  balance numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de Proveedores
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Tabla de Pedidos
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de Transacciones (Movimientos de Caja)
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text NOT NULL,
  payment_method text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  description text,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabla de Items de Transacciones
CREATE TABLE IF NOT EXISTS transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  subtotal numeric NOT NULL CHECK (subtotal >= 0),
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

-- Políticas para Products
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

-- Políticas para Clients
CREATE POLICY "Users can view own clients"
  ON clients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para Suppliers
CREATE POLICY "Users can view own suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own suppliers"
  ON suppliers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para Orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own orders"
  ON orders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para Transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para Transaction Items
CREATE POLICY "Users can view own transaction items"
  ON transaction_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_items.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own transaction items"
  ON transaction_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_items.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own transaction items"
  ON transaction_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_items.transaction_id
      AND transactions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_items.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own transaction items"
  ON transaction_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      WHERE transactions.id = transaction_items.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_product_id ON transaction_items(product_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();