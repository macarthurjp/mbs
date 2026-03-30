import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Calendar } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { generateSalesPDF } from '../../utils/pdfGenerators';
import { getTodayArgentina, formatArgentinaDate } from '../../utils/dateHelpers';

interface SalesData {
  sale_date: string;
  total_sales: number;
  total_transactions: number;
  average_ticket: number;
  cash_sales: number;
  transfer_sales: number;
  current_account_sales: number;
  total_profit: number;
}

interface Props {
  onClose: () => void;
}

export default function SalesByPeriodReport({ onClose }: Props) {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const argDate = new Date(today.getTime() - 3 * 60 * 60 * 1000);
    argDate.setDate(argDate.getDate() - 30);
    return argDate.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return getTodayArgentina();
  });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_sales_by_period', {
        start_date: startDate,
        end_date: endDate,
      });

      if (error) throw error;
      setSalesData(data || []);
    } catch (error) {
      console.error('Error loading sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totals = salesData.reduce(
    (acc, row) => ({
      total_sales: acc.total_sales + Number(row.total_sales),
      total_transactions: acc.total_transactions + Number(row.total_transactions),
      cash_sales: acc.cash_sales + Number(row.cash_sales),
      transfer_sales: acc.transfer_sales + Number(row.transfer_sales),
      current_account_sales: acc.current_account_sales + Number(row.current_account_sales),
      total_profit: acc.total_profit + Number(row.total_profit),
    }),
    {
      total_sales: 0,
      total_transactions: 0,
      cash_sales: 0,
      transfer_sales: 0,
      current_account_sales: 0,
      total_profit: 0,
    }
  );

  const averageTicket = totals.total_transactions > 0
    ? totals.total_sales / totals.total_transactions
    : 0;

  const handleExportPDF = async () => {
    await generateSalesPDF({
      startDate,
      endDate,
      salesData,
      totals: { ...totals, average_ticket: averageTicket },
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
            <h1 className="text-3xl font-bold text-gray-900">Ventas por Período</h1>
            <p className="text-gray-600 mt-1">Análisis detallado de ventas</p>
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Ventas Totales</p>
              <p className="text-2xl font-bold text-blue-600">
                ${totals.total_sales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Transacciones</p>
              <p className="text-2xl font-bold text-green-600">{totals.total_transactions}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Ticket Promedio</p>
              <p className="text-2xl font-bold text-yellow-600">
                ${averageTicket.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Ganancia Total</p>
              <p className="text-2xl font-bold text-emerald-600">
                ${totals.total_profit.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Efectivo</p>
              <p className="text-xl font-bold text-gray-900">
                ${totals.cash_sales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Transferencia</p>
              <p className="text-xl font-bold text-gray-900">
                ${totals.transfer_sales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Cuenta Corriente</p>
              <p className="text-xl font-bold text-gray-900">
                ${totals.current_account_sales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando datos...</p>
            </div>
          ) : salesData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay datos para el período seleccionado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Ventas
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Transacciones
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Ticket Prom.
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Ganancia
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatArgentinaDate(row.sale_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        ${Number(row.total_sales).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {row.total_transactions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        ${Number(row.average_ticket).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-emerald-600">
                        ${Number(row.total_profit).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
