import { useState } from 'react';
import { TrendingUp, Users, Wallet, Box, ClipboardList, Trash2, Clock, DollarSign, Smartphone, Gift } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import SalesByPeriodReport from '../components/reports/SalesByPeriodReport';
import CurrentAccountsReport from '../components/reports/CurrentAccountsReport';
import MobileCurrentAccountsReport from '../components/reports/MobileCurrentAccountsReport';
import { CashboxSummaryReport } from '../components/reports/CashboxSummaryReport';
import StockReport from '../components/reports/StockReport';
import DailySalesDetailReport from '../components/reports/DailySalesDetailReport';
import SalesManagementReport from '../components/reports/SalesManagementReport';
import SalesByHourReport from '../components/reports/SalesByHourReport';
import AccountPaymentsReport from '../components/reports/AccountPaymentsReport';
import { GiftCardsReport } from '../components/reports/GiftCardsReport';

type ReportType = 'sales' | 'accounts' | 'mobileAccounts' | 'cashbox' | 'stock' | 'dailyDetail' | 'salesManagement' | 'hourly' | 'accountPayments' | 'giftCards' | null;

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>(null);

  const reports = [
    {
      id: 'cashbox' as ReportType,
      name: 'Resumen de Caja',
      description: 'Control de caja por día, período, mes y año con ingresos y egresos',
      icon: Wallet,
      color: 'bg-pink-500',
    },
    {
      id: 'dailyDetail' as ReportType,
      name: 'Ventas Diarias Detalladas',
      description: 'Detalle completo de productos vendidos en cada venta por día',
      icon: ClipboardList,
      color: 'bg-rose-500',
    },
    {
      id: 'salesManagement' as ReportType,
      name: 'Gestión de Ventas',
      description: 'Administra y elimina ventas pasadas restaurando stock automáticamente',
      icon: Trash2,
      color: 'bg-red-500',
    },
    {
      id: 'stock' as ReportType,
      name: 'Reporte de Stock',
      description: 'Estado actual del inventario con alertas de stock bajo',
      icon: Box,
      color: 'bg-slate-500',
    },
    {
      id: 'sales' as ReportType,
      name: 'Ventas por Período',
      description: 'Análisis detallado de ventas diarias, semanales y mensuales',
      icon: TrendingUp,
      color: 'bg-blue-500',
    },
    {
      id: 'hourly' as ReportType,
      name: 'Ventas por Horario',
      description: 'Identifica los horarios de mayor actividad comercial',
      icon: Clock,
      color: 'bg-cyan-500',
    },
    {
      id: 'accounts' as ReportType,
      name: 'Cuentas Corrientes',
      description: 'Estado de cuentas por cobrar y comportamiento de pagos',
      icon: Users,
      color: 'bg-orange-500',
    },
    {
      id: 'mobileAccounts' as ReportType,
      name: 'Cuentas Corrientes Móvil',
      description: 'Reporte simplificado optimizado para compartir por WhatsApp',
      icon: Smartphone,
      color: 'bg-blue-600',
    },
    {
      id: 'accountPayments' as ReportType,
      name: 'Pagos de Cuenta Corriente',
      description: 'Historial completo de todos los pagos recibidos',
      icon: DollarSign,
      color: 'bg-emerald-500',
    },
    {
      id: 'giftCards' as ReportType,
      name: 'Gift Cards',
      description: 'Análisis completo de gift cards: resumen, transacciones, ventas y vencimientos',
      icon: Gift,
      color: 'bg-violet-500',
    },
  ];

  const renderReport = () => {
    switch (selectedReport) {
      case 'cashbox':
        return (
          <div>
            <div className="mb-6">
              <Button onClick={() => setSelectedReport(null)} variant="secondary">
                Volver a Reportes
              </Button>
            </div>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Resumen de Caja</h1>
              <p className="text-gray-600 mt-2">Control detallado de movimientos de caja</p>
            </div>
            <CashboxSummaryReport />
          </div>
        );
      case 'dailyDetail':
        return <DailySalesDetailReport onClose={() => setSelectedReport(null)} />;
      case 'salesManagement':
        return <SalesManagementReport onClose={() => setSelectedReport(null)} />;
      case 'stock':
        return <StockReport onClose={() => setSelectedReport(null)} />;
      case 'sales':
        return <SalesByPeriodReport onClose={() => setSelectedReport(null)} />;
      case 'hourly':
        return <SalesByHourReport onClose={() => setSelectedReport(null)} />;
      case 'accounts':
        return <CurrentAccountsReport onClose={() => setSelectedReport(null)} />;
      case 'mobileAccounts':
        return <MobileCurrentAccountsReport onClose={() => setSelectedReport(null)} />;
      case 'accountPayments':
        return (
          <div>
            <div className="mb-6">
              <Button onClick={() => setSelectedReport(null)} variant="secondary">
                Volver a Reportes
              </Button>
            </div>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Pagos de Cuenta Corriente</h1>
              <p className="text-gray-600 mt-2">Historial completo de pagos recibidos de clientes</p>
            </div>
            <AccountPaymentsReport />
          </div>
        );
      case 'giftCards':
        return (
          <div>
            <div className="mb-6">
              <Button onClick={() => setSelectedReport(null)} variant="secondary">
                Volver a Reportes
              </Button>
            </div>
            <GiftCardsReport />
          </div>
        );
      default:
        return null;
    }
  };

  if (selectedReport) {
    return renderReport();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-600 mt-2">Selecciona un reporte para visualizar y exportar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`${report.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {report.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                    <Button
                      onClick={() => setSelectedReport(report.id)}
                      variant="primary"
                      size="sm"
                    >
                      Ver Reporte
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
