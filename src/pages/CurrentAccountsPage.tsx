import React, { useEffect, useState, useRef } from 'react';
import { CreditCard, DollarSign, ArrowUp, ArrowDown, Clock, ShoppingBag, User, Search, ChevronLeft, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { Client, AccountMovement, Transaction, Product } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { formatArgentinaDateTime, formatArgentinaDate } from '../utils/dateHelpers';

interface DebtAging {
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  over_90_days: number;
}

interface ClientWithMovements extends Client {
  movements?: AccountMovement[];
  debtAging?: DebtAging;
}

interface TransactionWithItems extends Transaction {
  transaction_items: Array<{
    id: string;
    product_id: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
    products: Product | null;
  }>;
}

const CLIENTS_PER_PAGE = 10;

export function CurrentAccountsPage() {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [clients, setClients] = useState<ClientWithMovements[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientWithMovements | null>(null);
  const [movements, setMovements] = useState<AccountMovement[]>([]);
  const [clientSales, setClientSales] = useState<TransactionWithItems[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [movementToDelete, setMovementToDelete] = useState<AccountMovement | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const clientDetailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;

      const clientsWithAging = await Promise.all((data || []).map(async (client) => {
        if (client.balance !== 0) {
          const { data: agingData, error: agingError } = await supabase
            .rpc('get_debt_aging_by_client', { p_client_id: client.id });

          if (!agingError && agingData && agingData.length > 0) {
            return {
              ...client,
              debtAging: agingData[0]
            };
          }
        }
        return client;
      }));

      setClients(clientsWithAging);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }

  async function loadMovements(clientId: string) {
    try {
      const { data, error } = await supabase
        .from('account_movements')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Error loading movements:', error);
    }
  }

  async function loadClientSales(clientId: string) {
    try {
      console.log('Loading sales for client:', clientId);

      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('client_id', clientId)
        .eq('type', 'income')
        .order('created_at', { ascending: false });

      if (transError) {
        console.error('Error loading transactions:', transError);
        throw transError;
      }

      console.log('Transactions found:', transactions);

      if (!transactions || transactions.length === 0) {
        setClientSales([]);
        return;
      }

      const transactionIds = transactions.map(t => t.id);

      const { data: items, error: itemsError } = await supabase
        .from('transaction_items')
        .select('*, products(*)')
        .in('transaction_id', transactionIds);

      if (itemsError) {
        console.error('Error loading items:', itemsError);
        throw itemsError;
      }

      console.log('Items found:', items);

      const transactionsWithItems = transactions.map(transaction => ({
        ...transaction,
        transaction_items: (items || []).filter(item => item.transaction_id === transaction.id)
      }));

      console.log('Final transactions with items:', transactionsWithItems);
      setClientSales(transactionsWithItems as TransactionWithItems[]);
    } catch (error) {
      console.error('Error loading client sales:', error);
    }
  }

  async function handleSelectClient(client: ClientWithMovements) {
    console.log('Selected client:', client);
    setSelectedClient(client);
    await Promise.all([
      loadMovements(client.id),
      loadClientSales(client.id)
    ]);

    // Scroll al inicio del panel de detalles del cliente
    if (clientDetailRef.current) {
      clientDetailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClient) return;

    if (!user) {
      showToast('No hay usuario autenticado', 'error');
      return;
    }

    try {
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        showToast('Por favor ingresa un monto válido', 'warning');
        return;
      }

      if (!paymentDate) {
        showToast('Por favor selecciona una fecha', 'warning');
        return;
      }

      const paymentDateTime = new Date(paymentDate + 'T12:00:00Z').toISOString();

      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          type: 'income',
          category: 'Cobranza (Cta. Cte.)',
          payment_method: 'Efectivo',
          amount,
          description: paymentDescription || `Pago de cuenta corriente - ${selectedClient.name}`,
          client_id: selectedClient.id,
          user_id: user.id,
          created_at: paymentDateTime
        }])
        .select()
        .single();

      if (transactionError) throw transactionError;

      const { error: movementError } = await supabase
        .from('account_movements')
        .insert([{
          client_id: selectedClient.id,
          transaction_id: transaction.id,
          type: 'payment',
          amount: -amount,
          description: paymentDescription || 'Pago de cuenta corriente',
          user_id: user.id,
          created_at: paymentDateTime
        }]);

      if (movementError) throw movementError;

      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentDescription('');
      setPaymentDate('');
      await loadClients();

      const { data: updatedClientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', selectedClient.id)
        .single();

      if (!clientError && updatedClientData) {
        setSelectedClient(updatedClientData);
      }

      await Promise.all([
        loadMovements(selectedClient.id),
        loadClientSales(selectedClient.id)
      ]);
      showToast('Pago registrado correctamente', 'success');
    } catch (error) {
      console.error('Error processing payment:', error);
      showToast('Error al procesar el pago', 'error');
    }
  }

  const clientsWithDebt = clients.filter(c => c.balance !== 0);
  const totalDebt = clients.reduce((sum, c) => sum + Math.abs(Number(c.balance)), 0);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredClients.length / CLIENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * CLIENTS_PER_PAGE;
  const endIndex = startIndex + CLIENTS_PER_PAGE;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  function handlePayTotal() {
    if (selectedClient && selectedClient.balance !== 0) {
      setPaymentAmount(Math.abs(selectedClient.balance).toString());
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setIsPaymentModalOpen(true);
    }
  }

  function handlePreviousPage() {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }

  function handleNextPage() {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  }

  function handleDeleteMovement(movement: AccountMovement) {
    setMovementToDelete(movement);
    setIsDeleteDialogOpen(true);
  }

  async function confirmDeleteMovement() {
    if (!movementToDelete || !selectedClient) return;

    try {
      // First delete the transaction associated with the payment
      if (movementToDelete.transaction_id) {
        const { error: transactionError } = await supabase
          .from('transactions')
          .delete()
          .eq('id', movementToDelete.transaction_id);

        if (transactionError) throw transactionError;
      }

      // Then delete the account movement
      const { error: movementError } = await supabase
        .from('account_movements')
        .delete()
        .eq('id', movementToDelete.id);

      if (movementError) throw movementError;

      setIsDeleteDialogOpen(false);
      setMovementToDelete(null);

      // Reload client data
      await loadClients();
      const { data: updatedClientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', selectedClient.id)
        .single();

      if (!clientError && updatedClientData) {
        setSelectedClient(updatedClientData);
      }

      await loadMovements(selectedClient.id);
      showToast('Movimiento eliminado correctamente', 'success');
    } catch (error) {
      console.error('Error deleting movement:', error);
      showToast('Error al eliminar el movimiento', 'error');
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-pink-700 mb-2">Cuentas Corrientes</h1>
          <p className="text-gray-600 uppercase tracking-wider text-sm">Gestiona los saldos y movimientos de tus clientes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm text-pink-700 uppercase tracking-wide mb-1 font-medium">Deuda Total</div>
              </div>
              <div className="p-2 bg-pink-100 rounded-lg">
                <DollarSign size={20} className="text-pink-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-pink-700">${totalDebt.toFixed(2)}</div>
            <div className="text-xs text-pink-600 mt-2">{clientsWithDebt.length} clientes con saldo</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm text-blue-700 uppercase tracking-wide mb-1 font-medium">Total Clientes</div>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <User size={20} className="text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-700">{clients.length}</div>
            <div className="text-xs text-blue-600 mt-2">En cuenta corriente</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-800">Clientes</h2>
              {filteredClients.length > 0 && (
                <span className="text-sm text-gray-500">
                  Mostrando {startIndex + 1}-{Math.min(endIndex, filteredClients.length)} de {filteredClients.length}
                </span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar cliente por nombre, teléfono o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-2">
            {paginatedClients.map(client => (
              <Card
                key={client.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedClient?.id === client.id ? 'border-pink-500 bg-pink-50' : 'border-gray-200'
                }`}
                onClick={() => handleSelectClient(client)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{client.name}</h3>
                      {client.phone && (
                        <p className="text-xs text-gray-500 mt-1">{client.phone}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${client.balance !== 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        ${Math.abs(Number(client.balance)).toFixed(2)}
                      </p>
                      {client.balance !== 0 && (
                        <p className="text-xs text-red-500">Saldo deudor</p>
                      )}
                    </div>
                  </div>

                  {client.debtAging && client.balance !== 0 && (
                    <div className="border-t border-gray-200 pt-3 space-y-1.5">
                      {client.debtAging.current > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Al día</span>
                          <span className="font-semibold text-blue-600">
                            ${client.debtAging.current.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {client.debtAging.days_1_30 > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">1-30 días</span>
                          <span className="font-semibold text-yellow-600">
                            ${client.debtAging.days_1_30.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {client.debtAging.days_31_60 > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">31-60 días</span>
                          <span className="font-semibold text-orange-600">
                            ${client.debtAging.days_31_60.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {client.debtAging.days_61_90 > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">61-90 días</span>
                          <span className="font-semibold text-red-600">
                            ${client.debtAging.days_61_90.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {client.debtAging.over_90_days > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Más de 90 días</span>
                          <span className="font-semibold text-red-800">
                            ${client.debtAging.over_90_days.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {filteredClients.length === 0 && searchTerm === '' && (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <CreditCard className="mx-auto text-gray-400 mb-3" size={40} />
                <p className="text-gray-500">No hay clientes registrados</p>
                <p className="text-sm text-gray-400 mt-1">Los clientes con cuenta corriente aparecerán aquí</p>
              </div>
            )}

            {filteredClients.length === 0 && searchTerm !== '' && (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Search className="mx-auto text-gray-400 mb-3" size={40} />
                <p className="text-gray-500">No se encontraron clientes</p>
                <p className="text-sm text-gray-400 mt-1">Intenta con otro término de búsqueda</p>
              </div>
            )}
          </div>

          {filteredClients.length > CLIENTS_PER_PAGE && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  Anterior
                </Button>
                <Button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  Siguiente
                  <ChevronRight size={16} />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </span>
              </div>
            </div>
          )}
        </div>

        <div ref={clientDetailRef}>
          {selectedClient ? (
            <>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-800">{selectedClient.name}</h2>
                <p className="text-sm text-gray-500">Detalle de cuenta corriente</p>
              </div>

              <Card className="mb-4 bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-600 mb-2">Saldo Pendiente</p>
                    <p className={`text-4xl font-bold mb-4 ${selectedClient.balance !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${Math.abs(Number(selectedClient.balance)).toFixed(2)}
                    </p>
                  </div>
                  {selectedClient.balance !== 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={handlePayTotal}
                        variant="primary"
                        className="w-full"
                      >
                        Pagar Total
                      </Button>
                      <Button
                        onClick={() => {
                          setPaymentAmount('');
                          setPaymentDate(new Date().toISOString().split('T')[0]);
                          setIsPaymentModalOpen(true);
                        }}
                        variant="secondary"
                        className="w-full"
                      >
                        Pago Parcial
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">Movimientos de Cuenta</h3>
              <div className="space-y-3 mb-6 max-h-[250px] overflow-y-auto pr-2">
                {movements.map(movement => (
                  <Card key={movement.id} className="border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          movement.type === 'payment' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {movement.type === 'payment' ? (
                            <ArrowDown size={18} className="text-green-600" />
                          ) : (
                            <ArrowUp size={18} className="text-red-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">
                                {movement.type === 'payment' ? 'Pago' : 'Cargo'}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <Clock size={12} />
                                {formatArgentinaDateTime(movement.created_at)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className={`font-bold whitespace-nowrap ${
                                movement.type === 'payment' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ${Math.abs(Number(movement.amount)).toFixed(2)}
                              </p>
                              {movement.type === 'payment' && (
                                <button
                                  onClick={() => handleDeleteMovement(movement)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar movimiento"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                          {movement.description && (
                            <p className="text-xs text-gray-600">{movement.description}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {movements.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <DollarSign className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-gray-500 text-sm">No hay movimientos registrados</p>
                  </div>
                )}
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">Historial de Compras</h3>
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                {clientSales.map(sale => (
                  <Card key={sale.id} className="border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-pink-100">
                          <ShoppingBag size={18} className="text-pink-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">
                                Venta #{sale.id.substring(0, 8)}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <Clock size={12} />
                                {formatArgentinaDateTime(sale.created_at)}
                              </div>
                            </div>
                            <p className="font-bold text-pink-600 whitespace-nowrap">
                              ${Number(sale.amount).toFixed(2)}
                            </p>
                          </div>

                          {sale.transaction_items && sale.transaction_items.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                              <p className="text-xs font-medium text-gray-700 mb-2">Productos:</p>
                              {sale.transaction_items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-xs">
                                  <div className="flex-1">
                                    <p className="text-gray-900 font-medium">
                                      {item.products?.name || 'Producto eliminado'}
                                    </p>
                                    <p className="text-gray-500">
                                      {item.quantity} x ${Number(item.unit_price).toFixed(2)}
                                    </p>
                                  </div>
                                  <p className="font-semibold text-gray-700">
                                    ${Number(item.subtotal).toFixed(2)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {sale.description && (
                            <p className="text-xs text-gray-600 mt-2">{sale.description}</p>
                          )}

                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Método de pago:</span>
                              <span className="font-medium text-gray-900">{sale.payment_method}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {clientSales.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <ShoppingBag className="mx-auto text-gray-400 mb-3" size={40} />
                    <p className="text-gray-500">No hay compras registradas</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <CreditCard className="mx-auto text-gray-400 mb-3" size={48} />
                <p className="text-gray-500 font-medium">Selecciona un cliente</p>
                <p className="text-sm text-gray-400 mt-1">para ver su historial de compras</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentAmount('');
          setPaymentDescription('');
          setPaymentDate('');
        }}
        title="Registrar Pago"
      >
        <form onSubmit={handlePayment} className="space-y-4">
          {selectedClient && (
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">Cliente</p>
              <p className="font-semibold text-gray-900">{selectedClient.name}</p>
              <p className="text-sm text-gray-600 mt-2">Saldo actual</p>
              <p className="text-2xl font-bold text-red-600">${Math.abs(Number(selectedClient.balance)).toFixed(2)}</p>
            </div>
          )}

          <Input
            label="Fecha del Pago"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />

          <Input
            label="Monto del Pago"
            type="number"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="Ingresa el monto"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Descripción (Opcional)
            </label>
            <textarea
              value={paymentDescription}
              onChange={(e) => setPaymentDescription(e.target.value)}
              placeholder="Ej. Pago en efectivo..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPaymentModalOpen(false);
                setPaymentAmount('');
                setPaymentDescription('');
                setPaymentDate('');
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Confirmar Pago
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setMovementToDelete(null);
        }}
        onConfirm={confirmDeleteMovement}
        title="Eliminar Movimiento"
        message={
          movementToDelete ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-sm text-red-900 font-medium mb-1">
                    ¿Estás seguro de eliminar este movimiento?
                  </p>
                  <p className="text-xs text-red-700">
                    Esta acción no se puede deshacer. El saldo del cliente se actualizará automáticamente.
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium">{movementToDelete.type === 'payment' ? 'Pago' : 'Cargo'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Monto:</span>
                  <span className="font-bold text-red-600">
                    ${Math.abs(Number(movementToDelete.amount)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">
                    {formatArgentinaDate(movementToDelete.created_at)}
                  </span>
                </div>
                {movementToDelete.description && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Descripción:</span> {movementToDelete.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : ''
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
}
