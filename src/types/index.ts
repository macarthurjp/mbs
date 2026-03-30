export interface Product {
  id: string;
  user_id: string;
  name: string;
  category: string;
  size: string;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  description?: string;
  barcode?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  client_id?: string;
  product_id?: string;
  quantity: number;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  category: string;
  payment_method: string;
  amount: number;
  description?: string;
  client_id?: string;
  created_at: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
}

export interface DashboardStats {
  totalIncome: number;
  pendingOrders: number;
  lowStock: number;
  salesToday: number;
}

export interface WeeklySales {
  day: string;
  amount: number;
}

export interface AccountMovement {
  id: string;
  user_id: string;
  client_id: string;
  transaction_id?: string;
  type: 'charge' | 'payment';
  amount: number;
  description: string;
  balance_after: number;
  created_at: string;
}

export type UserRole = 'admin' | 'seller';

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
