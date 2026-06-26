import { useCallback, useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Search, Filter, Calendar, Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useNotification } from '../../contexts/NotificationContext';
import { formatCurrency, formatDateTime, getTodayArgentina, getArgentinaDateString } from '../../utils/dateHelpers';
import EditSaleModal from '../EditSaleModal';

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
    subtotal: number;
    product_id: string;
    products: {
      id: string;
      name: string;
      size: string;
      stock: number;
    } | null;
  }[];
}

type SupabaseTransactionItem = Omit<Transaction['transaction_items'][number], 'products'> & {
  products: Transaction['transaction_items'][number]['products'] | Transaction['transaction_items'][number]['products'][];
};

type SupabaseTransaction = Omit<Transaction, 'clients' | 'transaction_items'> & {
  clients: Transaction['clients'] | Transaction['clients'][];
  transaction_items: SupabaseTransactionItem[] | null;
};

interface Props {
  onClose: () => void;
}

export default function SalesManagementReport({ onClose }: Props) {
  const [sales, setSales] = useState<Transaction[]>([]);
  const [filteredSales, setFilteredSales] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Transaction | null>(null);
  const { showNotification } = useNotification();

  const loadSales = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          payment_method,
          description,
          created_at,
          client_id,
          clients (
            name
          ),
          transaction_items (
            id,
            quantity,
            unit_price,
            subtotal,
            product_id,
            products (
              id,
              name,
              size,
              stock
            )
          )
        `)
        .eq('type', 'income')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const normalizedSales = ((data || []) as SupabaseTransaction[]).map((sale) => ({
        ...sale,
        clients: Array.isArray(sale.clients) ? sale.clients[0] || null : sale.clients,
        transaction_items: (sale.transaction_items || []).map((item) => ({
          ...item,
          products: Array.isArray(item.products) ? item.products[0] || null : item.products
        }))
      }));

      setSales(normalizedSales as Transaction[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showNotification('Error al cargar ventas: ' + message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const filterSales = useCallback(() => {
    let filtered = [...sales];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(sale =>
        sale.clients?.name.toLowerCase().includes(term) ||
        sale.description?.toLowerCase().includes(term) ||
        sale.transaction_items.some(item =>
          item.products?.name.toLowerCase().includes(term)
        )
      );
    }

    if (filterMethod !== 'all') {
      filtered = filtered.filter(sale => sale.payment_method === filterMethod);
    }

    if (dateFrom) {
      filtered = filtered.filter(sale => {
        const saleDate = getArgentinaDateString(sale.created_at);
        return saleDate >= dateFrom;
      });
    }

    if (dateTo) {
      filtered = filtered.filter(sale => {
        const saleDate = getArgentinaDateString(sale.created_at);
        return saleDate <= dateTo;
      });
    }

    setFilteredSales(filtered);
  }, [dateFrom, dateTo, filterMethod, sales, searchTerm]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  useEffect(() => {
    filterSales();
  }, [filterSales]);

  const handleDeleteClick = (sale: Transaction) => {
    setSelectedSale(sale);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (sale: Transaction) => {
    setEditingSale(sale);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    loadSales();
  };

  const handleConfirmDelete = async () => {
    if (!selectedSale) return;

    try {
      setDeleting(true);
      const { data, error } = await supabase.rpc('delete_sale', {
        p_transaction_id: selectedSale.id
      });

      if (error) throw error;

      if (data?.success) {
        showNotification('Venta eliminada correctamente. Stock restaurado.', 'success');
        await loadSales();
      } else {
        showNotification(data?.message || 'Error al eliminar venta', 'error');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showNotification('Error al eliminar venta: ' + message, 'error');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedSale(null);
    }
  };

  const paymentMethods = [
    { value: 'all', label: 'Todos los métodos' },
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Transferencia', label: 'Transferencia' },
    { value: 'Tarjeta', label: 'Tarjeta' },
    { value: 'Cuenta Corriente', label: 'Cuenta Corriente' },
  ];

  const getPaymentMethodLabel = (method: string) => {
    const found = paymentMethods.find(pm => pm.value === method);
    return found?.label || method;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Ventas</h1>
          <p className="text-gray-600 mt-2">Administra y elimina ventas pasadas</p>
        </div>
        <Button onClick={onClose} variant="secondary">
          Volver a Reportes
        </Button>
      </div>

      <Card>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar por cliente, producto o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {paymentMethods.map(method => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Button
                onClick={() => {
                  const today = getTodayArgentina();
                  setDateFrom(today);
                  setDateTo(today);
                }}
                variant="secondary"
                size="sm"
                className="w-full"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Hoy
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="date"
                placeholder="Desde"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="date"
                placeholder="Hasta"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {(dateFrom || dateTo) && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
              <span className="text-sm text-blue-800">
                {dateFrom && dateTo && dateFrom === dateTo
                  ? `Mostrando ventas del ${dateFrom}`
                  : `Filtrando desde ${dateFrom || 'inicio'} hasta ${dateTo || 'hoy'}`}
              </span>
              <Button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                variant="secondary"
                size="sm"
              >
                Limpiar fechas
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>
              Eliminar una venta restaurará el stock y actualizará las cuentas corrientes automáticamente
            </span>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card>
          <div className="p-12 text-center text-gray-500">
            Cargando ventas...
          </div>
        </Card>
      ) : filteredSales.length === 0 ? (
        <Card>
          <div className="p-12 text-center text-gray-500">
            No se encontraron ventas
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSales.map((sale) => (
            <Card key={sale.id} className="hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formatCurrency(sale.amount)}
                      </h3>
                      <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                        {getPaymentMethodLabel(sale.payment_method)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(sale.created_at)}
                    </p>
                    {sale.clients && (
                      <p className="text-sm text-gray-700 mt-1">
                        Cliente: <span className="font-medium">{sale.clients.name}</span>
                      </p>
                    )}
                    {sale.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {sale.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEditClick(sale)}
                      variant="secondary"
                      size="sm"
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleDeleteClick(sale)}
                      variant="secondary"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </Button>
                  </div>
                </div>

                {sale.transaction_items.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                      Productos vendidos:
                    </h4>
                    <div className="space-y-2">
                      {sale.transaction_items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm">
                          <div className="flex-1">
                            {item.products ? (
                              <span className="text-gray-700">
                                {item.products.name} - Talle {item.products.size}
                              </span>
                            ) : (
                              <span className="text-gray-500 italic">
                                Producto eliminado
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-gray-600">
                            <span>Cant: {item.quantity}</span>
                            <span>{formatCurrency(item.unit_price)}</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(item.subtotal)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <EditSaleModal
        isOpen={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingSale(null);
        }}
        sale={editingSale}
        onSuccess={handleEditSuccess}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Eliminar Venta"
        message={
          selectedSale ? (
            <div className="space-y-3">
              <p>¿Estás seguro de que deseas eliminar esta venta?</p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-amber-900">
                  Monto: {formatCurrency(selectedSale.amount)}
                </p>
                <p className="text-sm text-amber-800">
                  Fecha: {formatDateTime(selectedSale.created_at)}
                </p>
                {selectedSale.clients && (
                  <p className="text-sm text-amber-800">
                    Cliente: {selectedSale.clients.name}
                  </p>
                )}
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <strong>Esta acción:</strong>
                </p>
                <ul className="text-sm text-red-700 mt-2 ml-4 list-disc space-y-1">
                  <li>Restaurará el stock de los productos vendidos</li>
                  <li>Actualizará el saldo del cliente (si es cuenta corriente)</li>
                  <li>No se podrá deshacer</li>
                </ul>
              </div>
            </div>
          ) : (
            'Cargando...'
          )
        }
        confirmText={deleting ? 'Eliminando...' : 'Eliminar Venta'}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setSelectedSale(null);
        }}
        type="danger"
      />
    </div>
  );
}
