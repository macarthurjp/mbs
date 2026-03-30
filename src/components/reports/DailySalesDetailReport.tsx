import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { generateDailySalesDetailPDF } from '../../utils/pdfGenerators';
import { getTodayArgentina, getArgentinaDateString, formatArgentinaDate } from '../../utils/dateHelpers';

interface TransactionItem {
  product_name: string;
  category: string;
  size: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface DailySale {
  id: string;
  created_at: string;
  description: string;
  payment_method: string;
  amount: number;
  client_name: string | null;
  items: TransactionItem[];
}

interface DailyData {
  date: string;
  transactions: DailySale[];
  total: number;
  count: number;
}

interface Props {
  onClose: () => void;
}

export default function DailySalesDetailReport({ onClose }: Props) {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const argDate = new Date(today.getTime() - 3 * 60 * 60 * 1000);
    argDate.setDate(argDate.getDate() - 7);
    return argDate.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return getTodayArgentina();
  });
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const startUTC = `${startDate}T03:00:00Z`;
      const endUTC = new Date(new Date(`${endDate}T23:59:59-03:00`).getTime() + 1000).toISOString();

      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select(`
          id,
          created_at,
          description,
          payment_method,
          amount,
          clients (
            name
          )
        `)
        .eq('type', 'income')
        .eq('category', 'Venta General')
        .gte('created_at', startUTC)
        .lt('created_at', endUTC)
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      const dailyMap = new Map<string, DailySale[]>();

      for (const tx of transactions || []) {
        const { data: items } = await supabase
          .from('transaction_items')
          .select(`
            quantity,
            unit_price,
            subtotal,
            products (
              name,
              category,
              size
            )
          `)
          .eq('transaction_id', tx.id);

        const date = getArgentinaDateString(tx.created_at);
        const sale: DailySale = {
          id: tx.id,
          created_at: tx.created_at,
          description: tx.description || '',
          payment_method: tx.payment_method,
          amount: Number(tx.amount),
          client_name: tx.clients?.name || null,
          items: items?.map((item: any) => ({
            product_name: item.products.name,
            category: item.products.category,
            size: item.products.size,
            quantity: item.quantity,
            unit_price: Number(item.unit_price),
            subtotal: Number(item.subtotal)
          })) || []
        };

        if (!dailyMap.has(date)) {
          dailyMap.set(date, []);
        }
        dailyMap.get(date)!.push(sale);
      }

      const dailyDataArray: DailyData[] = Array.from(dailyMap.entries()).map(([date, txs]) => ({
        date,
        transactions: txs,
        total: txs.reduce((sum, tx) => sum + tx.amount, 0),
        count: txs.length
      }));

      dailyDataArray.sort((a, b) => b.date.localeCompare(a.date));
      setDailyData(dailyDataArray);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const grandTotal = dailyData.reduce((sum, day) => sum + day.total, 0);
  const totalTransactions = dailyData.reduce((sum, day) => sum + day.count, 0);

  const handleExportPDF = async () => {
    await generateDailySalesDetailPDF({
      startDate,
      endDate,
      dailyData,
      totals: {
        grandTotal,
        totalTransactions
      }
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
            <h1 className="text-3xl font-bold text-gray-900">Ventas Diarias Detalladas</h1>
            <p className="text-gray-600 mt-1">Detalle completo de productos vendidos por día</p>
          </div>
        </div>
        <Button onClick={handleExportPDF} variant="primary">
          <Download className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Inicio
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                icon={Calendar}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Fin
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                icon={Calendar}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Total del Período</p>
              <p className="text-3xl font-bold text-blue-700">
                ${grandTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Total de Ventas</p>
              <p className="text-3xl font-bold text-green-700">{totalTransactions}</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando datos...</p>
            </div>
          ) : dailyData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay ventas para el período seleccionado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dailyData.map((day) => (
                <div key={day.date} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleDay(day.date)}
                    className="w-full bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 transition-colors p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-2 rounded-lg border border-pink-200">
                        {expandedDays.has(day.date) ? (
                          <ChevronUp className="w-5 h-5 text-pink-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-pink-600" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900 text-lg">
                          {formatArgentinaDate(day.date + 'T12:00:00')}
                        </p>
                        <p className="text-sm text-gray-600">{day.count} ventas realizadas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-pink-700">
                        ${day.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </button>

                  {expandedDays.has(day.date) && (
                    <div className="bg-white p-4 space-y-4">
                      {day.transactions.map((sale, idx) => (
                        <div key={sale.id} className="border-l-4 border-pink-500 bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-sm text-gray-500">
                                {new Date(sale.created_at).toLocaleTimeString('es-AR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                              {sale.client_name && (
                                <p className="text-sm font-medium text-gray-700 mt-1">
                                  Cliente: {sale.client_name}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                Medio: {sale.payment_method}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-pink-700">
                                ${sale.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>

                          {sale.items.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-xs uppercase tracking-wide font-semibold text-gray-600 mb-2">
                                Productos:
                              </p>
                              {sale.items.map((item, itemIdx) => (
                                <div
                                  key={itemIdx}
                                  className="bg-white rounded p-3 flex justify-between items-center border border-gray-200"
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 text-sm">
                                      {item.product_name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {item.category} · {item.size}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm">
                                    <span className="text-gray-600">
                                      {item.quantity} × ${item.unit_price.toFixed(2)}
                                    </span>
                                    <span className="font-bold text-pink-700 min-w-[80px] text-right">
                                      ${item.subtotal.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 italic">Sin productos asociados</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
