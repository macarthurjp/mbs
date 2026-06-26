import React, { useCallback, useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../ui/Card';
import { getTodayArgentina } from '../../utils/dateHelpers';

interface CashboxData {
  total_income: number;
  cash_sales: number;
  transfer_sales: number;
  credit_card_sales: number;
  gift_card_sales: number;
  collections: number;
  credit_sales: number;
  total_expenses: number;
  net_balance: number;
  opening_balance: number;
  closing_balance: number;
  daily_average?: number;
  monthly_average?: number;
}

type ViewMode = 'day' | 'period' | 'month' | 'year';

export function CashboxSummaryReport() {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [cashboxData, setCashboxData] = useState<CashboxData | null>(null);
  const [loading, setLoading] = useState(false);

  const today = getTodayArgentina();
  const [selectedDate, setSelectedDate] = useState(today);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const nowArgentina = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
  const [selectedYear, setSelectedYear] = useState(nowArgentina.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(nowArgentina.getMonth() + 1);

  const loadCashboxData = useCallback(async () => {
    setLoading(true);
    try {
      let result;

      switch (viewMode) {
        case 'day':
          result = await supabase.rpc('get_cashbox_by_day', {
            target_date: selectedDate
          });
          break;

        case 'period':
          result = await supabase.rpc('get_cashbox_by_period', {
            start_date: startDate,
            end_date: endDate
          });
          break;

        case 'month':
          result = await supabase.rpc('get_cashbox_by_month', {
            target_year: selectedYear,
            target_month: selectedMonth
          });
          break;

        case 'year':
          result = await supabase.rpc('get_cashbox_by_year', {
            target_year: selectedYear
          });
          break;
      }

      if (result.error) throw result.error;

      const data = result.data?.[0] || null;
      setCashboxData(data);
    } catch (error) {
      console.error('Error loading cashbox data:', error);
    } finally {
      setLoading(false);
    }
  }, [endDate, selectedDate, selectedMonth, selectedYear, startDate, viewMode]);

  useEffect(() => {
    loadCashboxData();
  }, [loadCashboxData]);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={() => setViewMode('day')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'day'
              ? 'bg-pink-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Por Día
        </button>
        <button
          onClick={() => setViewMode('period')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'period'
              ? 'bg-pink-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Por Período
        </button>
        <button
          onClick={() => setViewMode('month')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'month'
              ? 'bg-pink-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Por Mes
        </button>
        <button
          onClick={() => setViewMode('year')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'year'
              ? 'bg-pink-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Por Año
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-4 bg-gray-50 p-4 rounded-lg">
        {viewMode === 'day' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        )}

        {viewMode === 'period' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </>
        )}

        {viewMode === 'month' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Año
              </label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mes
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {viewMode === 'year' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Año
            </label>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-pink-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Cargando datos...</p>
        </div>
      ) : cashboxData ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-green-700 uppercase tracking-wide mb-1 font-medium">
                      Ingresos Totales
                    </p>
                    <p className="text-2xl font-bold text-green-800">
                      {formatCurrency(cashboxData.total_income)}
                    </p>
                  </div>
                  <div className="p-2 bg-green-200 rounded-lg">
                    <TrendingUp size={20} className="text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-red-700 uppercase tracking-wide mb-1 font-medium">
                      Egresos Totales
                    </p>
                    <p className="text-2xl font-bold text-red-800">
                      {formatCurrency(cashboxData.total_expenses)}
                    </p>
                  </div>
                  <div className="p-2 bg-red-200 rounded-lg">
                    <TrendingDown size={20} className="text-red-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-pink-700 uppercase tracking-wide mb-1 font-medium">
                      Saldo Final
                    </p>
                    <p className="text-2xl font-bold text-pink-800">
                      {formatCurrency(cashboxData.closing_balance)}
                    </p>
                  </div>
                  <div className="p-2 bg-pink-200 rounded-lg">
                    <DollarSign size={20} className="text-pink-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="text-green-600" size={20} />
                  Desglose de Ingresos
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-gray-700">Ventas en Efectivo</span>
                    <span className="font-bold text-green-700">
                      {formatCurrency(cashboxData.cash_sales)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-gray-700">Ventas por Transferencia</span>
                    <span className="font-bold text-green-700">
                      {formatCurrency(cashboxData.transfer_sales)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-gray-700">Ventas Tarjeta de Crédito</span>
                    <span className="font-bold text-green-700">
                      {formatCurrency(cashboxData.credit_card_sales)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-gray-700">Ventas Gift Cards</span>
                    <span className="font-bold text-green-700">
                      {formatCurrency(cashboxData.gift_card_sales)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-gray-700">Cobranzas (Cta. Cte.)</span>
                    <span className="font-bold text-green-700">
                      {formatCurrency(cashboxData.collections)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-gray-700">Ventas en Cuenta Corriente</span>
                    <span className="font-bold text-orange-600">
                      {formatCurrency(cashboxData.credit_sales)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 bg-green-50 p-3 rounded-lg">
                    <span className="font-semibold text-gray-800">Total Ingresos</span>
                    <span className="font-bold text-green-800 text-lg">
                      {formatCurrency(cashboxData.total_income)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar className="text-pink-600" size={20} />
                  Resumen del Período
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b">
                    <span className="text-gray-700">Balance Neto</span>
                    <span className={`font-bold ${
                      cashboxData.net_balance >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {formatCurrency(cashboxData.net_balance)}
                    </span>
                  </div>
                  {cashboxData.daily_average !== undefined && (
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-gray-700">Promedio Diario</span>
                      <span className="font-bold text-gray-800">
                        {formatCurrency(cashboxData.daily_average)}
                      </span>
                    </div>
                  )}
                  {cashboxData.monthly_average !== undefined && (
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-gray-700">Promedio Mensual</span>
                      <span className="font-bold text-gray-800">
                        {formatCurrency(cashboxData.monthly_average)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 bg-pink-50 p-3 rounded-lg">
                    <span className="font-semibold text-gray-800">Saldo Final</span>
                    <span className="font-bold text-pink-800 text-lg">
                      {formatCurrency(cashboxData.closing_balance)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2 uppercase tracking-wide">
                  Balance del Período
                </p>
                <p className={`text-4xl font-bold ${
                  cashboxData.net_balance >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  {cashboxData.net_balance >= 0 ? '+' : ''}
                  {formatCurrency(cashboxData.net_balance)}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {cashboxData.net_balance >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No hay datos para el período seleccionado</p>
        </div>
      )}
    </div>
  );
}
