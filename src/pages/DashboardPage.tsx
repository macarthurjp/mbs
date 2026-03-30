import React, { useEffect, useState } from 'react';
import { DollarSign, Wallet, CreditCard, TrendingUp } from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { supabase } from '../lib/supabase';
import { getTodayArgentina, getArgentinaDateString, getLastNDaysArgentina } from '../utils/dateHelpers';

interface DashboardStats {
  cashSalesToday: number;
  creditSalesToday: number;
  creditPaymentsToday: number;
  totalCashToday: number;
  lowStock: number;
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    cashSalesToday: 0,
    creditSalesToday: 0,
    creditPaymentsToday: 0,
    totalCashToday: 0,
    lowStock: 0
  });
  const [weeklySales, setWeeklySales] = useState<{
    day: string;
    efectivo: number;
    tarjeta: number;
    transferencia: number;
    cuentaCorriente: number;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const todayStr = getTodayArgentina();

      const [allTransactionsResult, productsResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount, type, payment_method, category, created_at')
          .eq('type', 'income'),

        supabase
          .from('products')
          .select('stock, min_stock')
      ]);

      const transactions = allTransactionsResult.data || [];

      // Filtrar solo transacciones de hoy
      const todayTransactions = transactions.filter(t =>
        getArgentinaDateString(t.created_at) === todayStr
      );

      // 1. Ventas de contado HOY (efectivo, transferencia, tarjeta - excluyendo cobros de CC)
      const cashSalesToday = todayTransactions
        .filter(t =>
          t.payment_method !== 'Cuenta Corriente' &&
          t.category !== 'Cobranza (Cta. Cte.)'
        )
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // 2. Ventas a cuenta corriente HOY
      const creditSalesToday = todayTransactions
        .filter(t => t.payment_method === 'Cuenta Corriente')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // 3. Cobros de cuenta corriente HOY
      const creditPaymentsToday = todayTransactions
        .filter(t => t.category === 'Cobranza (Cta. Cte.)')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // 4. Total ingresos de caja HOY (ventas contado + cobros CC)
      const totalCashToday = cashSalesToday + creditPaymentsToday;

      const lowStockProducts = productsResult.data?.filter(p => p.stock <= p.min_stock).length || 0;

      setStats({
        cashSalesToday,
        creditSalesToday,
        creditPaymentsToday,
        totalCashToday,
        lowStock: lowStockProducts
      });

      const last7Days = getLastNDaysArgentina(7);
      const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

      const weeklyData = last7Days.map(date => {
        const dateStr = getArgentinaDateString(date);
        const argDate = new Date(dateStr + 'T12:00:00');
        const dayName = daysOfWeek[argDate.getDay()];
        const dayTransactions = transactions.filter(t =>
          getArgentinaDateString(t.created_at) === dateStr
        );

        const efectivo = dayTransactions
          .filter(t => t.payment_method === 'Efectivo' && t.category !== 'Cobranza (Cta. Cte.)')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const tarjeta = dayTransactions
          .filter(t => t.payment_method === 'Tarjeta')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const transferencia = dayTransactions
          .filter(t => t.payment_method === 'Transferencia' && t.category !== 'Cobranza (Cta. Cte.)')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const cuentaCorriente = dayTransactions
          .filter(t => t.payment_method === 'Cuenta Corriente')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        return { day: dayName, efectivo, tarjeta, transferencia, cuentaCorriente };
      });

      setWeeklySales(weeklyData);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  const maxSales = Math.max(
    ...weeklySales.flatMap(s => [s.efectivo, s.tarjeta, s.transferencia, s.cuentaCorriente]),
    1
  );

  const paymentMethods = [
    { key: 'efectivo', label: 'Efectivo', color: 'from-green-600 to-green-500' },
    { key: 'tarjeta', label: 'Tarjeta', color: 'from-blue-600 to-blue-500' },
    { key: 'transferencia', label: 'Transferencia', color: 'from-orange-600 to-orange-500' },
    { key: 'cuentaCorriente', label: 'Cta. Cte.', color: 'from-gray-600 to-gray-500' },
  ];

  return (
    <div className="space-y-8">
      <div className="mb-10">
        <h1 className="text-5xl font-serif font-bold bg-gradient-to-r from-pink-600 via-pink-500 to-pink-400 bg-clip-text text-transparent mb-3">
          Panel Principal
        </h1>
        <p className="text-gray-600 uppercase tracking-widest text-sm font-medium">Resumen de tu boutique</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatCard
          title="Ventas Contado HOY"
          value={`$${stats.cashSalesToday.toFixed(2)}`}
          subtitle="Efectivo + Transferencias + Tarjetas"
          icon={Wallet}
          iconColor="bg-gradient-to-br from-green-500 to-emerald-600"
        />
        <StatCard
          title="Ventas Cuenta Corriente HOY"
          value={`$${stats.creditSalesToday.toFixed(2)}`}
          subtitle="Ventas a crédito del día"
          icon={CreditCard}
          iconColor="bg-gradient-to-br from-blue-500 to-cyan-600"
        />
        <StatCard
          title="Cobros Cuenta Corriente HOY"
          value={`$${stats.creditPaymentsToday.toFixed(2)}`}
          subtitle="Pagos recibidos de clientes"
          icon={DollarSign}
          iconColor="bg-gradient-to-br from-orange-500 to-amber-600"
        />
        <StatCard
          title="Total Caja HOY"
          value={`$${stats.totalCashToday.toFixed(2)}`}
          subtitle="Ventas contado + Cobros CC"
          icon={TrendingUp}
          iconColor="bg-gradient-to-br from-pink-500 to-rose-600"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-serif font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Ventas por Método de Pago
            </h2>
            <div className="flex gap-4 flex-wrap">
              {paymentMethods.map(method => (
                <div key={method.key} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded bg-gradient-to-r ${method.color}`} />
                  <span className="text-sm text-gray-600">{method.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-end justify-between gap-6">
            {weeklySales.map((day, dayIndex) => (
              <div key={dayIndex} className="flex-1 flex flex-col items-center gap-3">
                <div className="w-full h-72 flex items-end justify-center gap-1">
                  {paymentMethods.map(method => {
                    const amount = day[method.key as keyof typeof day] as number;
                    const heightPercent = maxSales > 0 ? (amount / maxSales) * 100 : 0;
                    return (
                      <div key={method.key} className="flex-1 flex flex-col items-center group">
                        <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '280px' }}>
                          <div
                            className={`absolute bottom-0 w-full bg-gradient-to-t ${method.color} rounded-t-lg transition-all duration-500 ease-out`}
                            style={{ height: `${heightPercent}%` }}
                          >
                            {amount > 0 && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs font-bold text-white bg-black bg-opacity-50 px-1 rounded">
                                  ${amount.toFixed(0)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <span className="text-sm text-gray-700 font-semibold">{day.day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
