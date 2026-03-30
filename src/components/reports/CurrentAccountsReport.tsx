import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Clock, AlertCircle, FileText, Eye, X, ArrowUpDown, ArrowUp, ArrowDown, Filter, RefreshCw } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { generateCurrentAccountsPDF, generateClientAccountPDF } from '../../utils/pdfGenerators';
import { formatArgentinaDateTime, formatArgentinaDate } from '../../utils/dateHelpers';

interface AccountData {
  client_id: string;
  client_name: string;
  total_debt: number;
  oldest_debt_date: string;
  days_overdue: number;
  total_payments: number;
  last_payment_date: string | null;
  payment_behavior: string;
  debtAging?: {
    current_debt: number;
    debt_30_60: number;
    debt_60_90: number;
    debt_over_90: number;
    total_debt: number;
    oldest_debt_days: number;
  };
}

interface DebtAging {
  current_debt: number;
  debt_30_60: number;
  debt_60_90: number;
  debt_over_90: number;
  total_debt: number;
  oldest_debt_days: number;
}

interface ClientMovement {
  id: string;
  date: string;
  type: string;
  amount: number;
  description: string;
  balance: number;
}

interface TransactionItem {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products: {
    name: string;
    category: string;
    size: string;
  };
}

interface ClientTransaction {
  id: string;
  amount: number;
  payment_method: string;
  category: string;
  description: string;
  created_at: string;
  items: TransactionItem[];
}

interface Props {
  onClose: () => void;
}

const behaviorLabels: Record<string, { label: string; color: string }> = {
  paid_up: { label: 'Al día', color: 'bg-green-100 text-green-800' },
  current: { label: 'Corriente', color: 'bg-blue-100 text-blue-800' },
  late_30: { label: '30+ días', color: 'bg-yellow-100 text-yellow-800' },
  late_60: { label: '60+ días', color: 'bg-orange-100 text-orange-800' },
  late_90_plus: { label: '90+ días', color: 'bg-red-100 text-red-800' },
};

type SortField = 'client_name' | 'total_debt' | 'days_overdue' | 'total_payments' | 'last_payment_date' | 'payment_behavior';
type SortDirection = 'asc' | 'desc' | null;

export default function CurrentAccountsReport({ onClose }: Props) {
  const [accountsData, setAccountsData] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientMovements, setClientMovements] = useState<ClientMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<AccountData | null>(null);
  const [clientTransactions, setClientTransactions] = useState<ClientTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [debtAging, setDebtAging] = useState<DebtAging | null>(null);
  const [loadingDebtAging, setLoadingDebtAging] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    minDaysOverdue: '',
    maxDaysOverdue: '',
    minDebt: '',
    maxDebt: '',
    paymentBehavior: 'all',
  });

  const applyQuickFilter = (preset: string) => {
    switch (preset) {
      case 'all_with_debt':
        setFilters({
          minDaysOverdue: '',
          maxDaysOverdue: '',
          minDebt: '1',
          maxDebt: '',
          paymentBehavior: 'all',
        });
        break;
      case '30_plus':
        setFilters({
          minDaysOverdue: '30',
          maxDaysOverdue: '',
          minDebt: '',
          maxDebt: '',
          paymentBehavior: 'all',
        });
        break;
      case '60_plus':
        setFilters({
          minDaysOverdue: '60',
          maxDaysOverdue: '',
          minDebt: '',
          maxDebt: '',
          paymentBehavior: 'all',
        });
        break;
      case '90_plus':
        setFilters({
          minDaysOverdue: '90',
          maxDaysOverdue: '',
          minDebt: '',
          maxDebt: '',
          paymentBehavior: 'all',
        });
        break;
      case 'high_debt':
        setFilters({
          minDaysOverdue: '',
          maxDaysOverdue: '',
          minDebt: '10000',
          maxDebt: '',
          paymentBehavior: 'all',
        });
        break;
      default:
        handleResetFilters();
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      loadClientMovements(selectedClientId);
    }
  }, [selectedClientId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_current_accounts_status');

      if (error) throw error;

      const accountsWithAging = await Promise.all((data || []).map(async (account) => {
        const { data: agingData, error: agingError } = await supabase
          .rpc('get_debt_aging_by_client', { client_uuid: account.client_id });

        if (!agingError && agingData && agingData.length > 0) {
          return {
            ...account,
            debtAging: agingData[0]
          };
        }
        return account;
      }));

      setAccountsData(accountsWithAging);
    } catch (error) {
      console.error('Error loading accounts data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientMovements = async (clientId: string) => {
    setLoadingMovements(true);
    try {
      const { data, error } = await supabase
        .from('account_movements')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      let balance = 0;
      const movements = (data || []).map((m) => {
        if (m.type === 'charge') {
          balance += m.amount;
        } else if (m.type === 'payment') {
          balance += m.amount;
        }

        return {
          id: m.id,
          date: m.created_at,
          type: m.type === 'charge' ? 'Cargo' : 'Pago',
          amount: Math.abs(m.amount),
          description: m.description || '',
          balance: balance,
        };
      });

      setClientMovements(movements);
    } catch (error) {
      console.error('Error loading client movements:', error);
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedData = () => {
    if (!sortField || !sortDirection) {
      return accountsData;
    }

    return [...accountsData].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'last_payment_date') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      } else if (sortField === 'client_name') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (sortField === 'payment_behavior') {
        const order = ['paid_up', 'current', 'late_30', 'late_60', 'late_90_plus'];
        aValue = order.indexOf(aValue);
        bValue = order.indexOf(bValue);
      } else {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-4 h-4 text-pink-600" />;
    }
    return <ArrowDown className="w-4 h-4 text-pink-600" />;
  };

  const handleClientClick = async (account: AccountData) => {
    setSelectedClient(account);
    setLoadingTransactions(true);
    setLoadingMovements(true);
    setLoadingDebtAging(true);

    try {
      const [transactionsResult, movementsResult, debtAgingResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('client_id', account.client_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('account_movements')
          .select('*')
          .eq('client_id', account.client_id)
          .order('created_at', { ascending: true }),
        supabase.rpc('get_debt_aging_by_client', { client_uuid: account.client_id })
      ]);

      if (transactionsResult.error) throw transactionsResult.error;
      if (movementsResult.error) throw movementsResult.error;
      if (debtAgingResult.error) throw debtAgingResult.error;

      // Set debt aging data
      if (debtAgingResult.data && debtAgingResult.data.length > 0) {
        setDebtAging(debtAgingResult.data[0]);
      }

      const transactionsWithItems: ClientTransaction[] = [];
      for (const transaction of transactionsResult.data || []) {
        const { data: items } = await supabase
          .from('transaction_items')
          .select(`
            id,
            quantity,
            unit_price,
            subtotal,
            products (
              name,
              category,
              size
            )
          `)
          .eq('transaction_id', transaction.id);

        transactionsWithItems.push({
          ...transaction,
          items: items || []
        });
      }

      setClientTransactions(transactionsWithItems);

      let balance = 0;
      const movements = (movementsResult.data || []).map((m) => {
        if (m.type === 'charge') {
          balance += m.amount;
        } else if (m.type === 'payment') {
          balance += m.amount;
        }

        return {
          id: m.id,
          date: m.created_at,
          type: m.type === 'charge' ? 'Cargo' : 'Pago',
          amount: Math.abs(m.amount),
          description: m.description || '',
          balance: balance,
        };
      });

      setClientMovements(movements);
    } catch (error) {
      console.error('Error loading client details:', error);
    } finally {
      setLoadingTransactions(false);
      setLoadingMovements(false);
      setLoadingDebtAging(false);

      setTimeout(() => {
        setIsDetailModalOpen(true);
      }, 50);
    }
  };

  const totals = accountsData.reduce(
    (acc, row) => ({
      total_debt: acc.total_debt + Number(row.total_debt),
      total_payments: acc.total_payments + Number(row.total_payments),
    }),
    { total_debt: 0, total_payments: 0 }
  );

  const behaviorCounts = accountsData.reduce((acc, row) => {
    acc[row.payment_behavior] = (acc[row.payment_behavior] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getFilteredData = () => {
    return accountsData.filter((account) => {
      if (filters.minDaysOverdue) {
        const minDays = Number(filters.minDaysOverdue);
        const hasOldDebt = account.debtAging
          ? (minDays >= 90 && account.debtAging.debt_over_90 > 0) ||
            (minDays >= 60 && minDays < 90 && (account.debtAging.debt_60_90 > 0 || account.debtAging.debt_over_90 > 0)) ||
            (minDays >= 30 && minDays < 60 && (account.debtAging.debt_30_60 > 0 || account.debtAging.debt_60_90 > 0 || account.debtAging.debt_over_90 > 0)) ||
            (minDays < 30 && account.total_debt > 0)
          : account.days_overdue >= minDays;

        if (!hasOldDebt) return false;
      }

      if (filters.maxDaysOverdue) {
        const maxDays = Number(filters.maxDaysOverdue);
        if (account.debtAging) {
          if (maxDays < 30 && (account.debtAging.debt_30_60 > 0 || account.debtAging.debt_60_90 > 0 || account.debtAging.debt_over_90 > 0)) {
            return false;
          }
          if (maxDays >= 30 && maxDays < 60 && (account.debtAging.debt_60_90 > 0 || account.debtAging.debt_over_90 > 0)) {
            return false;
          }
          if (maxDays >= 60 && maxDays < 90 && account.debtAging.debt_over_90 > 0) {
            return false;
          }
        } else if (account.days_overdue > maxDays) {
          return false;
        }
      }

      if (filters.minDebt && Number(account.total_debt) < Number(filters.minDebt)) {
        return false;
      }
      if (filters.maxDebt && Number(account.total_debt) > Number(filters.maxDebt)) {
        return false;
      }
      if (filters.paymentBehavior !== 'all' && account.payment_behavior !== filters.paymentBehavior) {
        return false;
      }
      return true;
    });
  };

  const handleExportPDF = async () => {
    const filteredData = getFilteredData();
    const filteredTotals = filteredData.reduce(
      (acc, row) => ({
        total_debt: acc.total_debt + Number(row.total_debt),
        total_payments: acc.total_payments + Number(row.total_payments),
      }),
      { total_debt: 0, total_payments: 0 }
    );
    await generateCurrentAccountsPDF({ accountsData: filteredData, totals: filteredTotals });
    setShowFilterModal(false);
  };

  const handleResetFilters = () => {
    setFilters({
      minDaysOverdue: '',
      maxDaysOverdue: '',
      minDebt: '',
      maxDebt: '',
      paymentBehavior: 'all',
    });
  };

  const handleExportClientPDF = async () => {
    if (!selectedClientId) return;

    const clientData = accountsData.find((a) => a.client_id === selectedClientId);
    if (!clientData) return;

    // Get transactions with items for this client
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('client_id', selectedClientId)
      .order('created_at', { ascending: false });

    const transactionsWithItems: ClientTransaction[] = [];
    for (const transaction of transactions || []) {
      const { data: items } = await supabase
        .from('transaction_items')
        .select(`
          id,
          quantity,
          unit_price,
          subtotal,
          products (
            name,
            category,
            size
          )
        `)
        .eq('transaction_id', transaction.id);

      transactionsWithItems.push({
        ...transaction,
        items: items || []
      });
    }

    await generateClientAccountPDF({
      client: clientData,
      movements: clientMovements,
      transactions: transactionsWithItems,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={onClose} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Estado de Cuentas Corrientes</h1>
            <p className="text-gray-600 mt-1">Análisis de cuentas por cobrar</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button onClick={() => setShowFilterModal(true)} variant="primary">
            <Filter className="w-4 h-4 mr-2" />
            Exportar PDF con Filtros
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total por Cobrar</p>
                <p className="text-3xl font-bold text-red-900 mt-1">
                  ${totals.total_debt.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clientes con Deuda</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">
                  {accountsData.length}
                </p>
              </div>
              <Clock className="w-10 h-10 text-blue-500" />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Distribución por Antigüedad
          </h2>
          <div className="flex flex-wrap gap-4">
            {Object.entries(behaviorLabels).map(([key, { label, color }]) => (
              <div key={key} className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
                  {label}: {behaviorCounts[key] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Detalle de Clientes</h2>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-100"></div>
                <span className="text-gray-600">Al día (&lt; 30 días)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-100"></div>
                <span className="text-red-700 font-medium">Vencida (&gt; 30 días)</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando datos...</p>
            </div>
          ) : accountsData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay cuentas corrientes con deuda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('client_name')}
                    >
                      <div className="flex items-center gap-2">
                        Cliente
                        <SortIcon field="client_name" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('total_debt')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Deuda Total
                        <SortIcon field="total_debt" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Antigüedad de Deuda
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('last_payment_date')}
                    >
                      <div className="flex items-center gap-2">
                        Último Pago
                        <SortIcon field="last_payment_date" />
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('payment_behavior')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Estado
                        <SortIcon field="payment_behavior" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getSortedData().map((account) => {
                    const behavior = behaviorLabels[account.payment_behavior];
                    const isOverdue = account.days_overdue > 30;
                    return (
                      <tr
                        key={account.client_id}
                        className={`${isOverdue ? 'bg-red-50' : ''} transition-colors`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {isOverdue && (
                              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            )}
                            <span className={`text-sm font-medium ${isOverdue ? 'text-red-900' : 'text-gray-900'}`}>
                              {account.client_name}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClientClick(account);
                              }}
                              className="p-1.5 rounded-lg bg-pink-100 hover:bg-pink-200 transition-colors group"
                              title="Ver detalle"
                            >
                              <Eye className="w-4 h-4 text-pink-600 group-hover:text-pink-700" />
                            </button>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${isOverdue ? 'text-red-700' : 'text-red-600'}`}>
                          ${Number(account.total_debt).toLocaleString('es-AR', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {account.debtAging ? (
                            <div className="space-y-1">
                              {account.debtAging.current_debt > 0 && (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-gray-600 text-xs">0-30 días:</span>
                                  <span className="font-semibold text-blue-600">
                                    ${Number(account.debtAging.current_debt).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                              {account.debtAging.debt_30_60 > 0 && (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-gray-600 text-xs">31-60 días:</span>
                                  <span className="font-semibold text-yellow-600">
                                    ${Number(account.debtAging.debt_30_60).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                              {account.debtAging.debt_60_90 > 0 && (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-gray-600 text-xs">61-90 días:</span>
                                  <span className="font-semibold text-orange-600">
                                    ${Number(account.debtAging.debt_60_90).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                              {account.debtAging.debt_over_90 > 0 && (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-gray-600 text-xs">+90 días:</span>
                                  <span className="font-semibold text-red-800">
                                    ${Number(account.debtAging.debt_over_90).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {account.last_payment_date
                            ? formatArgentinaDate(account.last_payment_date)
                            : 'Sin pagos'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${behavior.color}`}
                          >
                            {behavior.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Reporte Individual por Cliente</h2>
          <p className="text-gray-600 mb-4">
            Selecciona un cliente para ver el detalle de sus movimientos y exportar su reporte en PDF
          </p>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">Seleccionar cliente...</option>
                {accountsData.map((account) => (
                  <option key={account.client_id} value={account.client_id}>
                    {account.client_name} - ${Number(account.total_debt).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              onClick={handleExportClientPDF}
              disabled={!selectedClientId || loadingMovements}
              variant="primary"
            >
              <FileText className="w-4 h-4 mr-2" />
              Exportar PDF Cliente
            </Button>
          </div>

          {selectedClientId && (
            <>
              {loadingMovements ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Cargando movimientos...</p>
                </div>
              ) : clientMovements.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay movimientos para este cliente</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Descripción
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Monto
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Saldo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {clientMovements.map((movement) => (
                        <tr key={movement.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatArgentinaDate(movement.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                movement.type === 'Cargo'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {movement.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {movement.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                            <span
                              className={
                                movement.type === 'Cargo' ? 'text-red-600' : 'text-green-600'
                              }
                            >
                              ${movement.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                            ${movement.balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      <Modal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filtros para Exportar PDF"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">
              Aplica filtros para exportar solo los clientes que cumplan con los criterios seleccionados.
            </p>
            <p className="text-xs text-blue-700">
              Los filtros de días verifican si el cliente tiene <strong>al menos alguna deuda</strong> en ese rango.
              Por ejemplo: "30 días mínimo\" incluirá clientes que tengan deuda de 30+, 60+ o 90+ días.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtros Rápidos
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => applyQuickFilter('all')}
                className="text-xs"
              >
                Todos
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => applyQuickFilter('all_with_debt')}
                className="text-xs"
              >
                Con deuda
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => applyQuickFilter('30_plus')}
                className="text-xs"
              >
                30+ días
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => applyQuickFilter('60_plus')}
                className="text-xs"
              >
                60+ días
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => applyQuickFilter('90_plus')}
                className="text-xs"
              >
                90+ días
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => applyQuickFilter('high_debt')}
                className="text-xs"
              >
                Deuda alta (+$10k)
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Días de Vencimiento Mínimo
              </label>
              <Input
                type="number"
                value={filters.minDaysOverdue}
                onChange={(e) => setFilters({ ...filters, minDaysOverdue: e.target.value })}
                placeholder="Ej: 30"
              />
              <p className="text-xs text-gray-500 mt-1">Incluye clientes con <strong>al menos alguna deuda</strong> de X+ días</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Días de Vencimiento Máximo
              </label>
              <Input
                type="number"
                value={filters.maxDaysOverdue}
                onChange={(e) => setFilters({ ...filters, maxDaysOverdue: e.target.value })}
                placeholder="Ej: 90"
              />
              <p className="text-xs text-gray-500 mt-1">Clientes con máximo X días de deuda</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deuda Mínima ($)
              </label>
              <Input
                type="number"
                value={filters.minDebt}
                onChange={(e) => setFilters({ ...filters, minDebt: e.target.value })}
                placeholder="Ej: 1000"
              />
              <p className="text-xs text-gray-500 mt-1">Clientes que deban al menos $X</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deuda Máxima ($)
              </label>
              <Input
                type="number"
                value={filters.maxDebt}
                onChange={(e) => setFilters({ ...filters, maxDebt: e.target.value })}
                placeholder="Ej: 50000"
              />
              <p className="text-xs text-gray-500 mt-1">Clientes que deban máximo $X</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado de Comportamiento
            </label>
            <Select
              value={filters.paymentBehavior}
              onChange={(e) => setFilters({ ...filters, paymentBehavior: e.target.value })}
            >
              <option value="all">Todos los estados</option>
              <option value="paid_up">Al día</option>
              <option value="current">Corriente</option>
              <option value="late_30">30+ días</option>
              <option value="late_60">60+ días</option>
              <option value="late_90_plus">90+ días</option>
            </Select>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Vista Previa de Resultados</p>
            <p className="text-lg font-bold text-pink-700">
              {getFilteredData().length} cliente{getFilteredData().length !== 1 ? 's' : ''} cumple{getFilteredData().length === 1 ? '' : 'n'} con los filtros
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Deuda Total: ${getFilteredData().reduce((acc, row) => acc + Number(row.total_debt), 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleResetFilters}
              className="flex-1"
            >
              Limpiar Filtros
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowFilterModal(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleExportPDF}
              disabled={getFilteredData().length === 0}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedClient(null);
          setClientTransactions([]);
          setClientMovements([]);
          setDebtAging(null);
        }}
        title={`Detalle de Cuenta: ${selectedClient?.client_name || ''}`}
      >
        {selectedClient && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-6 border border-pink-200 shadow-sm">
              <h3 className="text-lg font-semibold text-pink-900 mb-5 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Resumen de Cuenta
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-2 font-semibold">Deuda Total</p>
                  <p className="text-3xl font-bold text-red-700">
                    ${Number(selectedClient.total_debt).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-2 font-semibold">Días Vencido</p>
                  <p className="text-3xl font-bold text-orange-700">
                    {selectedClient.days_overdue}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">desde el cargo más antiguo</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-2 font-semibold">Estado</p>
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${behaviorLabels[selectedClient.payment_behavior].color}`}>
                    {behaviorLabels[selectedClient.payment_behavior].label}
                  </span>
                </div>
              </div>

              {loadingDebtAging ? (
                <div className="bg-white rounded-lg p-6 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600"></div>
                  <p className="text-gray-500 mt-2 text-sm">Cargando desglose...</p>
                </div>
              ) : debtAging ? (
                <div className="bg-white rounded-lg p-5 shadow-sm border-l-4 border-pink-500">
                  <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Desglose de Deuda por Antigüedad</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-gray-600 font-semibold mb-1">0-30 días</p>
                      <p className="text-lg font-bold text-green-700">
                        ${Number(debtAging.current_debt).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xs text-gray-600 font-semibold mb-1">31-60 días</p>
                      <p className="text-lg font-bold text-yellow-700">
                        ${Number(debtAging.debt_30_60).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-xs text-gray-600 font-semibold mb-1">61-90 días</p>
                      <p className="text-lg font-bold text-orange-700">
                        ${Number(debtAging.debt_60_90).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-xs text-gray-600 font-semibold mb-1">Más de 90 días</p>
                      <p className="text-lg font-bold text-red-700">
                        ${Number(debtAging.debt_over_90).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-pink-600" />
                    Historial de Compras
                  </h3>
                </div>
                <div className="p-4">
                  {loadingTransactions ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
                      <p className="text-gray-500 mt-3">Cargando compras...</p>
                    </div>
                  ) : clientTransactions.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No hay compras registradas</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                      {clientTransactions.map((transaction) => (
                        <div key={transaction.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-xs text-gray-500 font-medium">
                                {formatArgentinaDateTime(transaction.created_at)}
                              </p>
                              <p className="text-sm text-gray-700 mt-1">
                                <span className="font-semibold text-gray-900">{transaction.payment_method}</span>
                                <span className="text-gray-400 mx-2">·</span>
                                <span>{transaction.category}</span>
                              </p>
                            </div>
                            <p className="text-xl font-bold text-pink-700">
                              ${Number(transaction.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>

                          {transaction.items && transaction.items.length > 0 && (
                            <div className="space-y-2 pt-3 border-t border-gray-300">
                              <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Productos:</p>
                              {transaction.items.map((item) => (
                                <div key={item.id} className="bg-white rounded-lg p-3 flex justify-between items-center border border-pink-100">
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-900">{item.products.name}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {item.products.category} · {item.products.size} · <span className="font-medium">Cant: {item.quantity}</span>
                                    </p>
                                  </div>
                                  <p className="text-base font-bold text-pink-700 ml-4">
                                    ${Number(item.subtotal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {transaction.description && (
                            <div className="mt-3 pt-3 border-t border-gray-300">
                              <p className="text-xs text-gray-600 italic">
                                {transaction.description}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-pink-600" />
                    Movimientos de Cuenta
                  </h3>
                </div>
                <div className="p-4">
                  {loadingMovements ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
                      <p className="text-gray-500 mt-3">Cargando movimientos...</p>
                    </div>
                  ) : clientMovements.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No hay movimientos registrados</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded-lg border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Fecha</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Tipo</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Descripción</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Monto</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Saldo</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {clientMovements.map((movement) => (
                            <tr key={movement.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                                {formatArgentinaDate(movement.date)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  movement.type === 'Cargo' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                }`}>
                                  {movement.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {movement.description}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold">
                                <span className={movement.type === 'Cargo' ? 'text-red-600' : 'text-green-600'}>
                                  ${movement.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                                ${movement.balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedClient(null);
                  setClientTransactions([]);
                  setClientMovements([]);
                  setDebtAging(null);
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
