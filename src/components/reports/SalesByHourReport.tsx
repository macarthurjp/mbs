import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Calendar, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { getTodayArgentina } from '../../utils/dateHelpers';

interface HourlyData {
  hour_of_day: number;
  total_sales: number;
  total_transactions: number;
  average_ticket: number;
  sales_percentage: number;
}

interface Props {
  onClose: () => void;
}

export default function SalesByHourReport({ onClose }: Props) {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const argDate = new Date(today.getTime() - 3 * 60 * 60 * 1000);
    argDate.setDate(argDate.getDate() - 30);
    return argDate.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return getTodayArgentina();
  });
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_sales_by_hour', {
        start_date: startDate,
        end_date: endDate,
      });

      if (error) throw error;
      setHourlyData(data || []);
    } catch (error) {
      console.error('Error loading hourly data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totals = hourlyData.reduce(
    (acc, row) => ({
      total_sales: acc.total_sales + Number(row.total_sales),
      total_transactions: acc.total_transactions + Number(row.total_transactions),
    }),
    {
      total_sales: 0,
      total_transactions: 0,
    }
  );

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00 - ${hour.toString().padStart(2, '0')}:59`;
  };

  const getBarWidth = (percentage: number) => {
    return Math.max(percentage, 1);
  };

  const topHour = hourlyData.reduce((max, row) =>
    Number(row.total_sales) > Number(max.total_sales) ? row : max
  , hourlyData[0] || { hour_of_day: 0, total_sales: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={onClose} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ventas por Horario</h1>
            <p className="text-gray-600 mt-1">Análisis de horarios de mayor venta</p>
          </div>
        </div>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            {topHour && (
              <div className="bg-amber-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <p className="text-sm text-gray-600">Horario Pico</p>
                </div>
                <p className="text-2xl font-bold text-amber-600">
                  {formatHour(topHour.hour_of_day)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  ${Number(topHour.total_sales).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Cargando datos...</p>
            </div>
          ) : hourlyData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay datos para el período seleccionado</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Horario</h3>
                {hourlyData.map((row) => (
                  <div key={row.hour_of_day} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700 w-32">
                        {formatHour(row.hour_of_day)}
                      </span>
                      <span className="text-gray-600 flex-1 text-right mr-4">
                        {Number(row.total_transactions)} ventas
                      </span>
                      <span className="font-semibold text-gray-900 w-32 text-right">
                        ${Number(row.total_sales).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-gray-500 w-16 text-right">
                        {Number(row.sales_percentage).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${getBarWidth(Number(row.sales_percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalle por Horario</h3>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Horario
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
                        % del Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {hourlyData.map((row) => (
                      <tr
                        key={row.hour_of_day}
                        className={`hover:bg-gray-50 ${
                          row.hour_of_day === topHour?.hour_of_day ? 'bg-amber-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {formatHour(row.hour_of_day)}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-blue-600">
                          {Number(row.sales_percentage).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
