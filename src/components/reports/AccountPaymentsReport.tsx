import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { Button } from '../ui/Button';
import { Calendar, Download, DollarSign, User, CreditCard } from 'lucide-react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { formatArgentinaDateTime, formatArgentinaDate } from '../../utils/dateHelpers';

interface AccountPayment {
  movement_id: string;
  payment_date: string;
  client_id: string;
  client_name: string;
  amount: number;
  payment_method: string;
  previous_balance: number;
  new_balance: number;
  user_id: string;
  username: string;
  notes: string;
}

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10 },
  title: { fontSize: 16, marginBottom: 10, textAlign: 'center', fontWeight: 'bold' },
  subtitle: { fontSize: 11, marginBottom: 15, textAlign: 'center' },
  table: { marginTop: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 5, fontWeight: 'bold', borderBottom: '1pt solid #000' },
  tableRow: { flexDirection: 'row', padding: 5, borderBottom: '1pt solid #e5e7eb' },
  col1: { width: '12%' },
  col2: { width: '20%' },
  col3: { width: '12%' },
  col4: { width: '15%' },
  col5: { width: '12%' },
  col6: { width: '12%' },
  col7: { width: '17%' },
  summary: { marginTop: 15, padding: 10, backgroundColor: '#f9fafb', fontSize: 11 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
});

const paymentMethodLabels: { [key: string]: string } = {
  cash: 'Efectivo',
  debit_card: 'Tarjeta de Débito',
  credit_card: 'Tarjeta de Crédito',
  bank_transfer: 'Transferencia',
  current_account: 'Cuenta Corriente',
  other: 'Otro',
};

const AccountPaymentsPDF = ({ payments, startDate, endDate }: { payments: AccountPayment[]; startDate: string; endDate: string }) => {
  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const paymentsByMethod = payments.reduce((acc, p) => {
    const method = paymentMethodLabels[p.payment_method] || p.payment_method;
    acc[method] = (acc[method] || 0) + Number(p.amount);
    return acc;
  }, {} as { [key: string]: number });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Reporte de Pagos de Cuenta Corriente</Text>
        <Text style={styles.subtitle}>
          Período: {formatArgentinaDate(startDate)} - {formatArgentinaDate(endDate)}
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Fecha</Text>
            <Text style={styles.col2}>Cliente</Text>
            <Text style={styles.col3}>Monto</Text>
            <Text style={styles.col4}>Método de Pago</Text>
            <Text style={styles.col5}>Saldo Anterior</Text>
            <Text style={styles.col6}>Saldo Nuevo</Text>
            <Text style={styles.col7}>Usuario</Text>
          </View>

          {payments.map((payment) => (
            <View key={payment.movement_id} style={styles.tableRow}>
              <Text style={styles.col1}>{formatArgentinaDate(payment.payment_date)}</Text>
              <Text style={styles.col2}>{payment.client_name}</Text>
              <Text style={styles.col3}>${Number(payment.amount).toFixed(2)}</Text>
              <Text style={styles.col4}>{paymentMethodLabels[payment.payment_method] || payment.payment_method}</Text>
              <Text style={styles.col5}>${Number(payment.previous_balance).toFixed(2)}</Text>
              <Text style={styles.col6}>${Number(payment.new_balance).toFixed(2)}</Text>
              <Text style={styles.col7}>{payment.username}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summary}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>Resumen</Text>
          <View style={styles.summaryRow}>
            <Text>Total de Pagos:</Text>
            <Text style={{ fontWeight: 'bold' }}>{payments.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Monto Total Cobrado:</Text>
            <Text style={{ fontWeight: 'bold' }}>${totalAmount.toFixed(2)}</Text>
          </View>
          <Text style={{ marginTop: 10, marginBottom: 5, fontWeight: 'bold' }}>Por Método de Pago:</Text>
          {Object.entries(paymentsByMethod).map(([method, amount]) => (
            <View key={method} style={styles.summaryRow}>
              <Text>  {method}:</Text>
              <Text>${amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

export default function AccountPaymentsReport() {
  const { showNotification } = useNotification();
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [payments, setPayments] = useState<AccountPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);

    try {
      const startDateTime = new Date(startDate + 'T00:00:00-03:00').toISOString();
      const endDateTime = new Date(endDate + 'T23:59:59-03:00').toISOString();

      const { data, error } = await supabase.rpc('get_account_payments_report', {
        fecha_desde: startDateTime,
        fecha_hasta: endDateTime,
      });

      if (error) throw error;

      setPayments(data || []);
      if (!data || data.length === 0) {
        showNotification('No se encontraron pagos en el período seleccionado', 'info');
      }
    } catch (error) {
      console.error('Error al cargar pagos:', error);
      showNotification('Error al cargar el reporte de pagos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const paymentsByMethod = payments.reduce((acc, p) => {
    const method = p.payment_method;
    acc[method] = (acc[method] || 0) + Number(p.amount);
    return acc;
  }, {} as { [key: string]: number });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <DollarSign className="w-6 h-6" />
          Reporte de Pagos de Cuenta Corriente
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Desde
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Hasta
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={handleSearch} disabled={loading} className="flex-1">
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
            {payments.length > 0 && (
              <PDFDownloadLink
                document={<AccountPaymentsPDF payments={payments} startDate={startDate} endDate={endDate} />}
                fileName={`pagos-cuenta-corriente-${startDate}-${endDate}.pdf`}
              >
                {({ loading: pdfLoading }) => (
                  <Button variant="secondary" disabled={pdfLoading}>
                    <Download className="w-4 h-4" />
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </div>
        </div>

        {hasSearched && payments.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No se encontraron pagos en el período seleccionado
          </div>
        )}

        {payments.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 font-medium">Total de Pagos</div>
                <div className="text-2xl font-bold text-blue-900">{payments.length}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-600 font-medium">Monto Total Cobrado</div>
                <div className="text-2xl font-bold text-green-900">${totalAmount.toFixed(2)}</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-sm text-orange-600 font-medium">Promedio por Pago</div>
                <div className="text-2xl font-bold text-orange-900">
                  ${(totalAmount / payments.length).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Resumen por Método de Pago</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(paymentsByMethod).map(([method, amount]) => (
                  <div key={method} className="bg-white rounded p-3 border border-gray-200">
                    <div className="text-xs text-gray-600 mb-1">
                      {paymentMethodLabels[method] || method}
                    </div>
                    <div className="text-lg font-bold text-gray-900">${amount.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Método de Pago
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo Anterior
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo Nuevo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.movement_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatArgentinaDateTime(payment.payment_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.client_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 text-right">
                        ${Number(payment.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                        ${Number(payment.previous_balance).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        ${Number(payment.new_balance).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          {payment.username}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
