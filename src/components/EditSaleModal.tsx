import { useCallback, useState, useEffect } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
import { formatCurrency, getArgentinaDateString } from '../utils/dateHelpers';

interface Product {
  id: string;
  name: string;
  size: string;
  price: number;
  stock: number;
}

interface SaleItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  product_name?: string;
  product_size?: string;
  original_quantity?: number;
}

interface Client {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  amount: number;
  payment_method: string;
  description: string;
  created_at: string;
  client_id: string | null;
  clients: {
    name: string;
  } | null;
  transaction_items: {
    id: string;
    quantity: number;
    unit_price: number;
    product_id: string;
    products: {
      id: string;
      name: string;
      size: string;
      stock: number;
    } | null;
  }[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sale: Transaction | null;
  onSuccess: () => void;
}

export default function EditSaleModal({ isOpen, onClose, sale, onSuccess }: Props) {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [clientId, setClientId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const { showNotification } = useNotification();

  const loadProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, size, price, stock')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showNotification('Error al cargar productos: ' + message, 'error');
    }
  }, [showNotification]);

  const loadClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showNotification('Error al cargar clientes: ' + message, 'error');
    }
  }, [showNotification]);

  const initializeForm = useCallback(() => {
    if (!sale) return;

    setClientId(sale.client_id || '');
    setPaymentMethod(sale.payment_method);
    setDate(getArgentinaDateString(sale.created_at));
    setDescription(sale.description || '');

    const saleItems: SaleItem[] = sale.transaction_items
      .filter(item => item.products)
      .map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        product_name: item.products?.name,
        product_size: item.products?.size,
        original_quantity: item.quantity,
      }));

    setItems(saleItems);
  }, [sale]);

  useEffect(() => {
    if (isOpen && sale) {
      loadProducts();
      loadClients();
      initializeForm();
    }
  }, [initializeForm, isOpen, loadClients, loadProducts, sale]);

  const addItem = () => {
    if (!selectedProductId) {
      showNotification('Selecciona un producto', 'error');
      return;
    }

    const qty = parseInt(quantity);
    if (qty <= 0) {
      showNotification('La cantidad debe ser mayor a 0', 'error');
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) {
      showNotification('Producto no encontrado', 'error');
      return;
    }

    const existingItem = items.find(item => item.product_id === selectedProductId);
    const currentQtyInSale = existingItem ? existingItem.quantity : 0;
    const originalQtyInSale = existingItem ? (existingItem.original_quantity || 0) : 0;
    const qtyDifference = currentQtyInSale - originalQtyInSale;
    const availableStock = product.stock + originalQtyInSale - qtyDifference;

    if (existingItem) {
      const newQty = existingItem.quantity + qty;
      const newQtyDifference = newQty - originalQtyInSale;

      if (newQtyDifference > product.stock + originalQtyInSale) {
        showNotification(`Stock insuficiente. Disponible: ${availableStock}`, 'error');
        return;
      }

      setItems(items.map(item =>
        item.product_id === selectedProductId
          ? { ...item, quantity: newQty }
          : item
      ));
    } else {
      if (qty > product.stock) {
        showNotification(`Stock insuficiente. Disponible: ${product.stock}`, 'error');
        return;
      }

      setItems([...items, {
        product_id: selectedProductId,
        quantity: qty,
        unit_price: product.price,
        product_name: product.name,
        product_size: product.size,
        original_quantity: 0,
      }]);
    }

    setSelectedProductId('');
    setQuantity('1');
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(item => item.product_id !== productId));
  };

  const updateItemQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(productId);
      return;
    }

    const item = items.find(i => i.product_id === productId);
    if (!item) return;

    const product = products.find(p => p.id === productId);
    if (!product) return;

    const originalQty = item.original_quantity || 0;
    const qtyDifference = newQty - originalQty;

    if (qtyDifference > product.stock + originalQty) {
      showNotification(`Stock insuficiente. Disponible: ${product.stock + originalQty}`, 'error');
      return;
    }

    setItems(items.map(i =>
      i.product_id === productId
        ? { ...i, quantity: newQty }
        : i
    ));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSave = async () => {
    if (items.length === 0) {
      showNotification('Agrega al menos un producto', 'error');
      return;
    }

    if (!date) {
      showNotification('Selecciona una fecha', 'error');
      return;
    }

    try {
      setSaving(true);

      const editDateTime = new Date(date + 'T12:00:00Z').toISOString();

      const itemsData = items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

      const { data, error } = await supabase.rpc('edit_sale_with_items', {
        p_transaction_id: sale?.id,
        p_new_client_id: clientId || null,
        p_new_payment_method: paymentMethod,
        p_new_date: editDateTime,
        p_new_description: description,
        p_items: itemsData,
      });

      if (error) throw error;

      if (data?.success) {
        showNotification(
          `Venta actualizada. ${data.old_amount !== data.new_amount
            ? `Monto anterior: ${formatCurrency(data.old_amount)}, Nuevo monto: ${formatCurrency(data.new_amount)}`
            : ''}`,
          'success'
        );
        onSuccess();
        onClose();
      } else {
        showNotification(data?.message || 'Error al actualizar venta', 'error');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showNotification('Error al actualizar venta: ' + message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!sale) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Venta con Productos"
    >
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900">
            Monto original: {formatCurrency(sale.amount)}
          </p>
          <p className="text-sm text-blue-800">
            Venta ID: #{sale.id.substring(0, 8)}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Cliente
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sin cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Método de Pago
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Cuenta Corriente">Cuenta Corriente</option>
            </select>
          </div>

          <Input
            label="Fecha"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Productos</h3>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-7">
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Seleccionar producto...</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - Talle {product.size} (Stock: {product.stock}) - {formatCurrency(product.price)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Cant."
                />
              </div>
              <div className="col-span-2">
                <Button
                  onClick={addItem}
                  size="sm"
                  className="w-full"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay productos en esta venta</p>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div
                  key={item.product_id}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {item.product_name} - Talle {item.product_size}
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatCurrency(item.unit_price)} × {item.quantity} = {formatCurrency(item.unit_price * item.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItemQuantity(item.product_id, parseInt(e.target.value) || 0)}
                      className="w-20 text-center"
                    />
                    <Button
                      onClick={() => removeItem(item.product_id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-green-900">Total de la venta:</span>
              <span className="text-xl font-bold text-green-900">
                {formatCurrency(calculateTotal())}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>Importante:</strong> Al editar los productos:
          </p>
          <ul className="text-sm text-amber-700 mt-2 ml-4 list-disc space-y-1">
            <li>Se devolverá el stock de los productos eliminados o reducidos</li>
            <li>Se descontará el stock de los productos nuevos o aumentados</li>
            <li>Se actualizarán automáticamente los reportes y cuentas corrientes</li>
            <li>El monto total de la venta se recalculará</li>
          </ul>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={saving || items.length === 0}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
