import React, { useCallback, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useNotification } from '../../contexts/NotificationContext';
import { formatPhone } from '../../utils/formatContact';
import {
  Gift,
  TrendingUp,
  Clock,
  Search,
  Download,
  DollarSign,
  Percent,
  CreditCard
} from 'lucide-react';

interface GiftCardSummary {
  total_issued: number;
  total_available: number;
  total_used: number;
  count_active: number;
  count_used: number;
  count_expired: number;
  count_cancelled: number;
  usage_rate: number;
  avg_card_value: number;
  avg_remaining_balance: number;
}

interface GiftCardTransaction {
  id: string;
  gift_card_code: string;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  sale_id: string | null;
  created_at: string;
  user_name: string;
  notes: string | null;
}

interface ExpiringCard {
  id: string;
  code: string;
  initial_amount: number;
  current_balance: number;
  expiration_date: string;
  days_until_expiry: number;
  recipient_name: string | null;
  recipient_phone: string | null;
  status: string;
  created_at: string;
}

interface SaleWithGiftCard {
  sale_id: string;
  sale_date: string;
  total_amount: number;
  gift_card_amount: number;
  other_payments: number;
  gift_card_code: string;
  client_name: string | null;
  user_name: string;
  payment_method: string;
}

interface GiftCardDetail {
  id: string;
  code: string;
  initial_amount: number;
  current_balance: number;
  status: string;
  expiration_date: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  sender_name: string | null;
  custom_message: string | null;
  created_at: string;
  creator_name: string;
  transaction_id: string | null;
  transaction_type: string | null;
  transaction_amount: number | null;
  transaction_date: string | null;
  transaction_user: string | null;
  transaction_notes: string | null;
}

type TabType = 'summary' | 'transactions' | 'expiring' | 'sales' | 'search';

export function GiftCardsReport() {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  const [summary, setSummary] = useState<GiftCardSummary | null>(null);
  const [transactions, setTransactions] = useState<GiftCardTransaction[]>([]);
  const [expiringCards, setExpiringCards] = useState<ExpiringCard[]>([]);
  const [salesWithGiftCards, setSalesWithGiftCards] = useState<SaleWithGiftCard[]>([]);
  const [cardDetails, setCardDetails] = useState<GiftCardDetail[]>([]);

  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [daysAhead, setDaysAhead] = useState(30);
  const [searchCode, setSearchCode] = useState('');

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_gift_cards_summary');
      if (error) throw error;
      if (data && data.length > 0) {
        setSummary(data[0]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showNotification('Error al cargar resumen: ' + message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_gift_cards_transactions', {
        p_start_date: new Date(startDate + 'T00:00:00').toISOString(),
        p_end_date: new Date(endDate + 'T23:59:59').toISOString()
      });
      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showNotification('Error al cargar transacciones: ' + message, 'error');
    } finally {
      setLoading(false);
    }
  }, [endDate, showNotification, startDate]);

  const loadExpiringCards = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_gift_cards_expiring', {
        p_days_ahead: daysAhead
      });
      if (error) throw error;
      setExpiringCards(data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showNotification('Error al cargar tarjetas por vencer: ' + message, 'error');
    } finally {
      setLoading(false);
    }
  }, [daysAhead, showNotification]);

  const loadSalesWithGiftCards = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_sales_with_gift_cards', {
        p_start_date: new Date(startDate + 'T00:00:00').toISOString(),
        p_end_date: new Date(endDate + 'T23:59:59').toISOString()
      });
      if (error) throw error;
      setSalesWithGiftCards(data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showNotification('Error al cargar ventas: ' + message, 'error');
    } finally {
      setLoading(false);
    }
  }, [endDate, showNotification, startDate]);

  useEffect(() => {
    if (activeTab === 'summary') {
      loadSummary();
    } else if (activeTab === 'transactions') {
      loadTransactions();
    } else if (activeTab === 'expiring') {
      loadExpiringCards();
    } else if (activeTab === 'sales') {
      loadSalesWithGiftCards();
    }
  }, [activeTab, loadExpiringCards, loadSalesWithGiftCards, loadSummary, loadTransactions]);

  const searchGiftCard = async () => {
    if (!searchCode.trim()) {
      showNotification('Ingrese un código para buscar', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_gift_card_details', {
        p_code: searchCode.trim()
      });
      if (error) throw error;
      setCardDetails(data || []);
      if (!data || data.length === 0) {
        showNotification('No se encontró la gift card', 'error');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showNotification('Error al buscar gift card: ' + message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      issue: 'Emisión',
      use: 'Uso',
      cancel: 'Cancelación',
      adjust: 'Ajuste'
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Activa',
      used: 'Usada',
      expired: 'Vencida',
      cancelled: 'Cancelada'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'text-green-600 bg-green-100',
      used: 'text-gray-600 bg-gray-100',
      expired: 'text-red-600 bg-red-100',
      cancelled: 'text-orange-600 bg-orange-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const exportToCSV = () => {
    let csvContent = '';
    let filename = '';

    if (activeTab === 'transactions') {
      csvContent = 'Código,Tipo,Monto,Saldo Antes,Saldo Después,Fecha,Usuario,Notas\n';
      transactions.forEach(t => {
        csvContent += `${t.gift_card_code},${getTransactionTypeLabel(t.transaction_type)},${t.amount},${t.balance_before},${t.balance_after},${formatDateTime(t.created_at)},${t.user_name},"${t.notes || ''}"\n`;
      });
      filename = `transacciones_giftcards_${startDate}_${endDate}.csv`;
    } else if (activeTab === 'expiring') {
      csvContent = 'Código,Monto Inicial,Saldo Actual,Vencimiento,Días Restantes,Destinatario,Teléfono\n';
      expiringCards.forEach(c => {
        csvContent += `${c.code},${c.initial_amount},${c.current_balance},${formatDate(c.expiration_date)},${c.days_until_expiry},${c.recipient_name || ''},${c.recipient_phone || ''}\n`;
      });
      filename = `giftcards_por_vencer_${daysAhead}_dias.csv`;
    } else if (activeTab === 'sales') {
      csvContent = 'Fecha,Total,Monto GC,Otros Pagos,Código GC,Cliente,Usuario,Método Pago\n';
      salesWithGiftCards.forEach(s => {
        csvContent += `${formatDateTime(s.sale_date)},${s.total_amount},${s.gift_card_amount},${s.other_payments},${s.gift_card_code},${s.client_name || ''},${s.user_name},${s.payment_method}\n`;
      });
      filename = `ventas_con_giftcards_${startDate}_${endDate}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Reportes de Gift Cards</h2>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'summary', label: 'Resumen', icon: Gift },
            { id: 'transactions', label: 'Transacciones', icon: TrendingUp },
            { id: 'expiring', label: 'Por Vencer', icon: Clock },
            { id: 'sales', label: 'Ventas', icon: CreditCard },
            { id: 'search', label: 'Buscar', icon: Search }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'summary' && summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Emitido</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(summary.total_issued)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Saldo Disponible</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(summary.total_available)}
                  </p>
                </div>
                <Gift className="w-8 h-8 text-green-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Usado</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {formatCurrency(summary.total_used)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tasa de Uso</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">
                    {summary.usage_rate.toFixed(1)}%
                  </p>
                </div>
                <Percent className="w-8 h-8 text-orange-500" />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Estado de Gift Cards</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Activas</span>
                  <span className="font-semibold text-green-600">{summary.count_active}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Usadas</span>
                  <span className="font-semibold text-gray-600">{summary.count_used}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Vencidas</span>
                  <span className="font-semibold text-red-600">{summary.count_expired}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Canceladas</span>
                  <span className="font-semibold text-orange-600">{summary.count_cancelled}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Promedios</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Valor Promedio</span>
                  <span className="font-semibold">{formatCurrency(summary.avg_card_value)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Saldo Promedio</span>
                  <span className="font-semibold">{formatCurrency(summary.avg_remaining_balance)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desde
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hasta
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button onClick={loadTransactions} disabled={loading}>
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
              {transactions.length > 0 && (
                <Button onClick={exportToCSV} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              )}
            </div>
          </Card>

          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo Antes</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo Después</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {transaction.gift_card_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getTransactionTypeLabel(transaction.transaction_type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                          {formatCurrency(transaction.balance_before)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                          {formatCurrency(transaction.balance_after)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(transaction.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.user_name}
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                          No hay transacciones en el período seleccionado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'expiring' && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Días hacia adelante
                </label>
                <Input
                  type="number"
                  value={daysAhead}
                  onChange={(e) => setDaysAhead(parseInt(e.target.value))}
                  min="1"
                />
              </div>
              <Button onClick={loadExpiringCards} disabled={loading}>
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
              {expiringCards.length > 0 && (
                <Button onClick={exportToCSV} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              )}
            </div>
          </Card>

          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Días Restantes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destinatario</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expiringCards.map((card) => (
                      <tr key={card.id} className={card.days_until_expiry <= 7 ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {card.code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {formatCurrency(card.current_balance)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(card.expiration_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            card.days_until_expiry <= 7 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {card.days_until_expiry} días
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {card.recipient_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatPhone(card.recipient_phone)}
                        </td>
                      </tr>
                    ))}
                    {expiringCards.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          No hay gift cards próximas a vencer
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'sales' && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desde
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hasta
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button onClick={loadSalesWithGiftCards} disabled={loading}>
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
              {salesWithGiftCards.length > 0 && (
                <Button onClick={exportToCSV} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              )}
            </div>
          </Card>

          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <>
              {salesWithGiftCards.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <p className="text-sm text-gray-600">Total Ventas</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(salesWithGiftCards.reduce((sum, s) => sum + s.total_amount, 0))}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-gray-600">Pagado con Gift Cards</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {formatCurrency(salesWithGiftCards.reduce((sum, s) => sum + s.gift_card_amount, 0))}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-gray-600">Otros Métodos</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      {formatCurrency(salesWithGiftCards.reduce((sum, s) => sum + s.other_payments, 0))}
                    </p>
                  </Card>
                </div>
              )}

              <Card>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código GC</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto GC</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Otros</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {salesWithGiftCards.map((sale) => (
                        <tr key={sale.sale_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDateTime(sale.sale_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {sale.gift_card_code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                            {formatCurrency(sale.total_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                            {formatCurrency(sale.gift_card_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                            {formatCurrency(sale.other_payments)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sale.client_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sale.user_name}
                          </td>
                        </tr>
                      ))}
                      {salesWithGiftCards.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                            No hay ventas con gift cards en el período seleccionado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {activeTab === 'search' && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código de Gift Card
                </label>
                <Input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="Ingrese el código"
                  onKeyPress={(e) => e.key === 'Enter' && searchGiftCard()}
                />
              </div>
              <Button onClick={searchGiftCard} disabled={loading}>
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
            </div>
          </Card>

          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : cardDetails.length > 0 ? (
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Información de la Gift Card</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Código</p>
                    <p className="font-semibold">{cardDetails[0].code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Estado</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(cardDetails[0].status)}`}>
                      {getStatusLabel(cardDetails[0].status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Monto Inicial</p>
                    <p className="font-semibold">{formatCurrency(cardDetails[0].initial_amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Saldo Actual</p>
                    <p className="font-semibold text-green-600">{formatCurrency(cardDetails[0].current_balance)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Destinatario</p>
                    <p className="font-semibold">{cardDetails[0].recipient_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Teléfono</p>
                    <p className="font-semibold">{formatPhone(cardDetails[0].recipient_phone)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Remitente</p>
                    <p className="font-semibold">{cardDetails[0].sender_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Vencimiento</p>
                    <p className="font-semibold">{cardDetails[0].expiration_date ? formatDate(cardDetails[0].expiration_date) : 'Sin vencimiento'}</p>
                  </div>
                  {cardDetails[0].custom_message && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600">Mensaje</p>
                      <p className="font-semibold">{cardDetails[0].custom_message}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Creada por</p>
                    <p className="font-semibold">{cardDetails[0].creator_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fecha de creación</p>
                    <p className="font-semibold">{formatDateTime(cardDetails[0].created_at)}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Historial de Transacciones</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {cardDetails
                        .filter(d => d.transaction_id)
                        .map((detail) => (
                          <tr key={detail.transaction_id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {detail.transaction_date ? formatDateTime(detail.transaction_date) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {detail.transaction_type ? getTransactionTypeLabel(detail.transaction_type) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                              {detail.transaction_amount ? formatCurrency(detail.transaction_amount) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {detail.transaction_user || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {detail.transaction_notes || '-'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
