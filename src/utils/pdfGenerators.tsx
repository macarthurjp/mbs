import { pdf } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { formatArgentinaDateTime, formatArgentinaDate } from './dateHelpers';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #1e40af',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1f2937',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottom: '1 solid #e5e7eb',
  },
  col: {
    flex: 1,
  },
  colHeader: {
    flex: 1,
    fontWeight: 'bold',
    backgroundColor: '#f3f4f6',
    padding: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 5,
    border: '1 solid #e5e7eb',
  },
  statLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 3,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1 solid #e5e7eb',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 8,
    borderTop: '1 solid #e5e7eb',
    paddingTop: 10,
  },
});

export async function generateSalesPDF({ startDate, endDate, salesData, totals }: any) {
  const SalesDocument = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Reporte de Ventas por Período</Text>
          <Text style={styles.subtitle}>
            Período: {formatArgentinaDate(startDate)} - {formatArgentinaDate(endDate)}
          </Text>
          <Text style={styles.subtitle}>
            Generado: {formatArgentinaDateTime(new Date())}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen General</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Ventas Totales</Text>
              <Text style={styles.statValue}>
                ${totals.total_sales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Transacciones</Text>
              <Text style={styles.statValue}>{totals.total_transactions}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Ticket Promedio</Text>
              <Text style={styles.statValue}>
                ${totals.average_ticket.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Ganancia Total</Text>
              <Text style={styles.statValue}>
                ${totals.total_profit.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ventas por Método de Pago</Text>
          <View style={styles.row}>
            <Text style={styles.col}>Efectivo:</Text>
            <Text style={styles.col}>
              ${totals.cash_sales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.col}>Transferencia:</Text>
            <Text style={styles.col}>
              ${totals.transfer_sales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.col}>Cuenta Corriente:</Text>
            <Text style={styles.col}>
              ${totals.current_account_sales.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle Diario</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ flex: 2 }}>Fecha</Text>
              <Text style={{ flex: 2, textAlign: 'right' }}>Ventas</Text>
              <Text style={{ flex: 1, textAlign: 'right' }}>Trans.</Text>
              <Text style={{ flex: 2, textAlign: 'right' }}>Ganancia</Text>
            </View>
            {salesData.slice(0, 30).map((row: any, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={{ flex: 2 }}>
                  {formatArgentinaDate(row.sale_date)}
                </Text>
                <Text style={{ flex: 2, textAlign: 'right' }}>
                  ${Number(row.total_sales).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={{ flex: 1, textAlign: 'right' }}>{row.total_transactions}</Text>
                <Text style={{ flex: 2, textAlign: 'right' }}>
                  ${Number(row.total_profit).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>Sistema de Gestión - Boutique</Text>
      </Page>
    </Document>
  );

  const blob = await pdf(SalesDocument).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ventas-${startDate}-${endDate}.pdf`;
  link.click();
}

export async function generateTopProductsPDF({ startDate, endDate, products }: any) {
  const ProductsDocument = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Top Productos</Text>
          <Text style={styles.subtitle}>
            {startDate && endDate
              ? `Período: ${new Date(startDate).toLocaleDateString('es-AR')} - ${new Date(endDate).toLocaleDateString('es-AR')}`
              : 'Todos los períodos'}
          </Text>
          <Text style={styles.subtitle}>
            Generado: {formatArgentinaDateTime(new Date())}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Productos Más Vendidos</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ width: 30 }}>#</Text>
              <Text style={{ flex: 3 }}>Producto</Text>
              <Text style={{ flex: 2 }}>Categoría</Text>
              <Text style={{ flex: 1, textAlign: 'right' }}>Unidades</Text>
              <Text style={{ flex: 2, textAlign: 'right' }}>Ingresos</Text>
              <Text style={{ flex: 2, textAlign: 'right' }}>Ganancia</Text>
            </View>
            {products.map((product: any, idx: number) => (
              <View key={product.product_id} style={styles.tableRow}>
                <Text style={{ width: 30 }}>{idx + 1}</Text>
                <Text style={{ flex: 3, fontSize: 8 }}>{product.product_name}</Text>
                <Text style={{ flex: 2, fontSize: 8 }}>{product.category}</Text>
                <Text style={{ flex: 1, textAlign: 'right' }}>
                  {Number(product.units_sold).toLocaleString('es-AR')}
                </Text>
                <Text style={{ flex: 2, textAlign: 'right', fontSize: 8 }}>
                  ${Number(product.revenue).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                </Text>
                <Text style={{ flex: 2, textAlign: 'right', fontSize: 8 }}>
                  ${Number(product.profit).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>Sistema de Gestión - Boutique</Text>
      </Page>
    </Document>
  );

  const blob = await pdf(ProductsDocument).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `top-productos-${new Date().toISOString().split('T')[0]}.pdf`;
  link.click();
}

export async function generateInventoryPDF({ inventoryData, totals }: any) {
  const InventoryDocument = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Análisis de Inventario</Text>
          <Text style={styles.subtitle}>
            Generado: {formatArgentinaDateTime(new Date())}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen General</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Productos Totales</Text>
              <Text style={styles.statValue}>{totals.total_products}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Unidades Totales</Text>
              <Text style={styles.statValue}>{totals.total_units.toLocaleString('es-AR')}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Valor Total</Text>
              <Text style={styles.statValue}>
                ${totals.total_value.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Stock Bajo</Text>
              <Text style={styles.statValue}>{totals.low_stock_products}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inventario por Categoría</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ flex: 2 }}>Categoría</Text>
              <Text style={{ flex: 1, textAlign: 'right' }}>Productos</Text>
              <Text style={{ flex: 1, textAlign: 'right' }}>Unidades</Text>
              <Text style={{ flex: 2, textAlign: 'right' }}>Valor Total</Text>
            </View>
            {inventoryData.map((row: any) => (
              <View key={row.category} style={styles.tableRow}>
                <Text style={{ flex: 2 }}>{row.category}</Text>
                <Text style={{ flex: 1, textAlign: 'right' }}>{Number(row.total_products)}</Text>
                <Text style={{ flex: 1, textAlign: 'right' }}>
                  {Number(row.total_units).toLocaleString('es-AR')}
                </Text>
                <Text style={{ flex: 2, textAlign: 'right' }}>
                  ${Number(row.total_value).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>Sistema de Gestión - Boutique</Text>
      </Page>
    </Document>
  );

  const blob = await pdf(InventoryDocument).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `inventario-${new Date().toISOString().split('T')[0]}.pdf`;
  link.click();
}

export async function generateCurrentAccountsPDF({ accountsData, totals }: any) {
  const debtAgingTotals = accountsData.reduce(
    (acc: any, account: any) => ({
      current_debt: acc.current_debt + (account.debtAging?.current_debt || 0),
      debt_30_60: acc.debt_30_60 + (account.debtAging?.debt_30_60 || 0),
      debt_60_90: acc.debt_60_90 + (account.debtAging?.debt_60_90 || 0),
      debt_over_90: acc.debt_over_90 + (account.debtAging?.debt_over_90 || 0),
    }),
    { current_debt: 0, debt_30_60: 0, debt_60_90: 0, debt_over_90: 0 }
  );

  const AccountsDocument = (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Estado de Cuentas Corrientes</Text>
          <Text style={styles.subtitle}>
            Generado: {formatArgentinaDateTime(new Date())}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen General</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total por Cobrar</Text>
              <Text style={styles.statValue}>
                ${totals.total_debt.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Clientes con Deuda</Text>
              <Text style={styles.statValue}>{accountsData.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desglose por Antigüedad de Deuda Vencida</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>31-60 días</Text>
              <Text style={styles.statValue}>
                ${debtAgingTotals.debt_30_60.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>61-90 días</Text>
              <Text style={styles.statValue}>
                ${debtAgingTotals.debt_60_90.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Más de 90 días</Text>
              <Text style={styles.statValue}>
                ${debtAgingTotals.debt_over_90.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle de Clientes</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ flex: 2.5, fontSize: 8 }}>Cliente</Text>
              <Text style={{ flex: 1.5, textAlign: 'right', fontSize: 8 }}>Deuda Total</Text>
              <Text style={{ flex: 1.5, textAlign: 'right', fontSize: 8 }}>31-60 días</Text>
              <Text style={{ flex: 1.5, textAlign: 'right', fontSize: 8 }}>61-90 días</Text>
              <Text style={{ flex: 1.5, textAlign: 'right', fontSize: 8 }}>+90 días</Text>
              <Text style={{ flex: 1, textAlign: 'center', fontSize: 8 }}>Estado</Text>
            </View>
            {accountsData.map((account: any) => (
              <View key={account.client_id} style={styles.tableRow}>
                <Text style={{ flex: 2.5, fontSize: 7 }}>{account.client_name}</Text>
                <Text style={{ flex: 1.5, textAlign: 'right', fontSize: 7, fontWeight: 'bold' }}>
                  ${Number(account.total_debt).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={{ flex: 1.5, textAlign: 'right', fontSize: 7 }}>
                  ${(account.debtAging?.debt_30_60 || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={{ flex: 1.5, textAlign: 'right', fontSize: 7 }}>
                  ${(account.debtAging?.debt_60_90 || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={{ flex: 1.5, textAlign: 'right', fontSize: 7 }}>
                  ${(account.debtAging?.debt_over_90 || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={{ flex: 1, textAlign: 'center', fontSize: 6 }}>
                  {account.payment_behavior === 'late_90_plus' ? '90+d' :
                   account.payment_behavior === 'late_60' ? '60+d' :
                   account.payment_behavior === 'late_30' ? '30+d' :
                   account.payment_behavior === 'current' ? 'Corr' : 'Ok'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>Sistema de Gestión - Boutique</Text>
      </Page>
    </Document>
  );

  const blob = await pdf(AccountsDocument).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cuentas-corrientes-${new Date().toISOString().split('T')[0]}.pdf`;
  link.click();
}

export async function generateProfitabilityPDF({ startDate, endDate, data }: any) {
  const ProfitabilityDocument = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Reporte de Rentabilidad</Text>
          <Text style={styles.subtitle}>
            Período: {formatArgentinaDate(startDate)} - {formatArgentinaDate(endDate)}
          </Text>
          <Text style={styles.subtitle}>
            Generado: {formatArgentinaDateTime(new Date())}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resultados del Período</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Ingresos Totales</Text>
              <Text style={styles.statValue}>
                ${Number(data.total_revenue).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Costos Totales</Text>
              <Text style={styles.statValue}>
                ${Number(data.total_cost).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Ganancia Bruta</Text>
              <Text style={styles.statValue}>
                ${Number(data.gross_profit).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Margen Bruto</Text>
              <Text style={styles.statValue}>{Number(data.gross_margin).toFixed(2)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flujo de Caja</Text>
          <View style={styles.row}>
            <Text style={styles.col}>Entradas de Efectivo:</Text>
            <Text style={styles.col}>
              ${Number(data.total_cash_in).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.col}>Salidas de Efectivo:</Text>
            <Text style={styles.col}>
              ${Number(data.total_cash_out).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.col}>Flujo Neto:</Text>
            <Text style={styles.col}>
              ${Number(data.net_cash_flow).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Balance</Text>
          <View style={styles.row}>
            <Text style={styles.col}>Valor de Inventario:</Text>
            <Text style={styles.col}>
              ${Number(data.inventory_value).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.col}>Cuentas por Cobrar:</Text>
            <Text style={styles.col}>
              ${Number(data.accounts_receivable).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.col}>Total Activos:</Text>
            <Text style={styles.col}>
              ${(Number(data.inventory_value) + Number(data.accounts_receivable)).toLocaleString('es-AR', {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>Sistema de Gestión - Boutique</Text>
      </Page>
    </Document>
  );

  const blob = await pdf(ProfitabilityDocument).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rentabilidad-${startDate}-${endDate}.pdf`;
  link.click();
}

export async function generateClientAccountPDF({ client, movements, transactions }: any) {
  const ClientDocument = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Estado de Cuenta Corriente</Text>
          <Text style={styles.subtitle}>Cliente: {client.client_name}</Text>
          <Text style={styles.subtitle}>
            Generado: {formatArgentinaDateTime(new Date())}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen de Cuenta</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Saldo Deudor</Text>
              <Text style={[styles.statValue, { color: '#dc2626' }]}>
                ${Number(client.total_debt).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Días de Mora</Text>
              <Text style={styles.statValue}>
                {client.days_overdue > 0 ? `${client.days_overdue} días` : 'Al día'}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Último Pago</Text>
              <Text style={styles.statValue}>
                {client.last_payment_date
                  ? formatArgentinaDate(client.last_payment_date)
                  : 'Sin pagos'}
              </Text>
            </View>
          </View>
        </View>

        {transactions && transactions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historial de Compras</Text>
            {transactions.map((transaction: any) => (
              <View key={transaction.id} style={{ marginBottom: 12, padding: 8, backgroundColor: '#f9fafb', borderRadius: 4, border: '1 solid #e5e7eb' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, paddingBottom: 4, borderBottom: '1 solid #d1d5db' }}>
                  <View>
                    <Text style={{ fontSize: 8, color: '#6b7280' }}>
                      {formatArgentinaDateTime(transaction.created_at)}
                    </Text>
                    <Text style={{ fontSize: 9, color: '#374151', marginTop: 2 }}>
                      {transaction.payment_method} · {transaction.category}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ec4899' }}>
                    ${Number(transaction.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                {transaction.items && transaction.items.length > 0 && (
                  <View>
                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#374151', marginBottom: 4, textTransform: 'uppercase' }}>
                      Productos:
                    </Text>
                    {transaction.items.map((item: any) => (
                      <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fce7f3', padding: 4, marginBottom: 2, borderRadius: 2 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#1f2937' }}>{item.products.name}</Text>
                          <Text style={{ fontSize: 7, color: '#6b7280' }}>
                            {item.products.category} · {item.products.size} · Cant: {item.quantity} x ${Number(item.unit_price).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#ec4899' }}>
                          ${Number(item.subtotal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {transaction.description && (
                  <Text style={{ fontSize: 7, color: '#6b7280', marginTop: 4, paddingTop: 4, borderTop: '1 solid #e5e7eb' }}>
                    {transaction.description}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Movimientos de Cuenta Corriente</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ flex: 2 }}>Fecha</Text>
              <Text style={{ flex: 1.5 }}>Tipo</Text>
              <Text style={{ flex: 3 }}>Descripción</Text>
              <Text style={{ flex: 1.5, textAlign: 'right' }}>Monto</Text>
              <Text style={{ flex: 1.5, textAlign: 'right' }}>Saldo</Text>
            </View>
            {movements.map((movement: any) => (
              <View key={movement.id} style={styles.tableRow}>
                <Text style={{ flex: 2, fontSize: 8 }}>
                  {formatArgentinaDate(movement.date)}
                </Text>
                <Text style={{ flex: 1.5, fontSize: 8 }}>{movement.type}</Text>
                <Text style={{ flex: 3, fontSize: 7 }}>{movement.description}</Text>
                <Text
                  style={{
                    flex: 1.5,
                    textAlign: 'right',
                    fontSize: 8,
                    color: movement.type === 'Cargo' ? '#dc2626' : '#16a34a',
                  }}
                >
                  ${movement.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={{ flex: 1.5, textAlign: 'right', fontSize: 8, fontWeight: 'bold' }}>
                  ${movement.balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 20, padding: 12, backgroundColor: '#fef2f2', borderRadius: 4, border: '2 solid #dc2626' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1f2937' }}>SALDO TOTAL DEUDOR:</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#dc2626' }}>
              ${Number(client.total_debt).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>Sistema de Gestión - Boutique</Text>
      </Page>
    </Document>
  );

  const blob = await pdf(ClientDocument).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cuenta-corriente-${client.client_name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  link.click();
}

export async function generateDailySalesDetailPDF({ startDate, endDate, dailyData, totals }: any) {
  const DailySalesDocument = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Ventas Diarias Detalladas</Text>
          <Text style={styles.subtitle}>
            Período: {formatArgentinaDate(startDate)} - {formatArgentinaDate(endDate)}
          </Text>
          <Text style={styles.subtitle}>
            Generado: {formatArgentinaDateTime(new Date())}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen del Período</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total del Período</Text>
              <Text style={styles.statValue}>
                ${totals.grandTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total de Ventas</Text>
              <Text style={styles.statValue}>{totals.totalTransactions}</Text>
            </View>
          </View>
        </View>

        {dailyData.map((day: any, dayIdx: number) => (
          <View key={day.date} style={{ ...styles.section, marginTop: dayIdx > 0 ? 15 : 0 }}>
            <View style={{
              backgroundColor: '#fce7f3',
              padding: 8,
              borderRadius: 5,
              marginBottom: 10,
              borderLeft: '3 solid #ec4899'
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1f2937' }}>
                  {new Date(day.date + 'T12:00:00').toLocaleDateString('es-AR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'America/Argentina/Buenos_Aires'
                  })}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#ec4899' }}>
                  ${day.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>
                {day.count} ventas realizadas
              </Text>
            </View>

            {day.transactions.slice(0, 10).map((sale: any, saleIdx: number) => (
              <View key={sale.id} style={{
                marginBottom: 10,
                padding: 8,
                backgroundColor: '#f9fafb',
                borderRadius: 5,
                borderLeft: '2 solid #ec4899'
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <View>
                    <Text style={{ fontSize: 9, color: '#6b7280' }}>
                      {new Date(sale.created_at).toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                    {sale.client_name && (
                      <Text style={{ fontSize: 8, color: '#1f2937', marginTop: 2 }}>
                        Cliente: {sale.client_name}
                      </Text>
                    )}
                    <Text style={{ fontSize: 7, color: '#6b7280', marginTop: 1 }}>
                      Medio: {sale.payment_method}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#ec4899' }}>
                    ${sale.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                {sale.items.length > 0 && (
                  <View style={{ marginTop: 5, paddingTop: 5, borderTop: '1 solid #e5e7eb' }}>
                    <Text style={{ fontSize: 7, color: '#6b7280', marginBottom: 3, textTransform: 'uppercase' }}>
                      Productos:
                    </Text>
                    {sale.items.map((item: any, itemIdx: number) => (
                      <View key={itemIdx} style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingVertical: 3,
                        backgroundColor: '#ffffff',
                        paddingHorizontal: 5,
                        borderRadius: 3,
                        marginBottom: 2
                      }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 8, color: '#1f2937' }}>
                            {item.product_name}
                          </Text>
                          <Text style={{ fontSize: 6, color: '#6b7280' }}>
                            {item.category} · {item.size}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Text style={{ fontSize: 7, color: '#6b7280' }}>
                            {item.quantity} × ${item.unit_price.toFixed(2)}
                          </Text>
                          <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#ec4899', width: 50, textAlign: 'right' }}>
                            ${item.subtotal.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {day.transactions.length > 10 && (
              <Text style={{ fontSize: 8, color: '#6b7280', textAlign: 'center', marginTop: 5 }}>
                ... y {day.transactions.length - 10} ventas más
              </Text>
            )}
          </View>
        ))}

        <Text style={styles.footer}>Sistema de Gestión - Boutique</Text>
      </Page>
    </Document>
  );

  const blob = await pdf(DailySalesDocument).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ventas-detalladas-${startDate}-${endDate}.pdf`;
  link.click();
}

export async function generateMobileClientAccountPDF({
  client,
  movements,
}: {
  client: any;
  movements: any[];
}) {
  const mobileStyles = StyleSheet.create({
    page: {
      padding: 15,
      fontSize: 9,
      fontFamily: 'Helvetica',
      backgroundColor: '#ffffff',
    },
    header: {
      marginBottom: 12,
      backgroundColor: '#1e40af',
      padding: 12,
      borderRadius: 5,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: 3,
    },
    headerSubtitle: {
      fontSize: 8,
      color: '#e0e7ff',
    },
    summaryBox: {
      backgroundColor: '#f9fafb',
      padding: 10,
      borderRadius: 5,
      marginBottom: 10,
      border: '1 solid #e5e7eb',
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    summaryLabel: {
      fontSize: 8,
      color: '#6b7280',
      textTransform: 'uppercase',
    },
    summaryValue: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#1f2937',
    },
    debtValue: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#dc2626',
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: 'bold',
      marginTop: 10,
      marginBottom: 8,
      color: '#1f2937',
      backgroundColor: '#f3f4f6',
      padding: 6,
      borderRadius: 3,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: '#e5e7eb',
      padding: 6,
      fontSize: 7,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      color: '#4b5563',
    },
    tableRow: {
      flexDirection: 'row',
      padding: 6,
      borderBottom: '1 solid #f3f4f6',
      fontSize: 8,
    },
    tableRowAlt: {
      flexDirection: 'row',
      padding: 6,
      borderBottom: '1 solid #f3f4f6',
      backgroundColor: '#f9fafb',
      fontSize: 8,
    },
    col1: { width: '25%' },
    col2: { width: '20%' },
    col3: { width: '27%' },
    col4: { width: '28%', textAlign: 'right' },
    chargeText: {
      color: '#dc2626',
      fontWeight: 'bold',
    },
    paymentText: {
      color: '#059669',
      fontWeight: 'bold',
    },
    footer: {
      position: 'absolute',
      bottom: 15,
      left: 15,
      right: 15,
      textAlign: 'center',
      color: '#9ca3af',
      fontSize: 7,
      borderTop: '1 solid #e5e7eb',
      paddingTop: 8,
    },
  });

  const MobileAccountDocument = () => (
    <Document>
      <Page size="A4" style={mobileStyles.page}>
        <View style={mobileStyles.header}>
          <Text style={mobileStyles.headerTitle}>Estado de Cuenta Corriente</Text>
          <Text style={mobileStyles.headerSubtitle}>
            Generado el {formatArgentinaDateTime(new Date().toISOString())}
          </Text>
        </View>

        <View style={mobileStyles.summaryBox}>
          <View style={mobileStyles.summaryRow}>
            <Text style={mobileStyles.summaryLabel}>Cliente</Text>
            <Text style={mobileStyles.summaryValue}>{client.client_name}</Text>
          </View>
          <View style={mobileStyles.summaryRow}>
            <Text style={mobileStyles.summaryLabel}>Deuda Total</Text>
            <Text style={mobileStyles.debtValue}>
              ${Number(client.total_debt).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={mobileStyles.summaryRow}>
            <Text style={mobileStyles.summaryLabel}>Días Vencido</Text>
            <Text style={[mobileStyles.summaryValue, { color: '#ea580c' }]}>
              {client.days_overdue} días
            </Text>
          </View>
          {client.last_payment_date && (
            <View style={mobileStyles.summaryRow}>
              <Text style={mobileStyles.summaryLabel}>Último Pago</Text>
              <Text style={mobileStyles.summaryValue}>
                {formatArgentinaDate(client.last_payment_date)}
              </Text>
            </View>
          )}
        </View>

        <Text style={mobileStyles.sectionTitle}>
          Movimientos ({movements.length})
        </Text>

        <View style={mobileStyles.tableHeader}>
          <Text style={mobileStyles.col1}>Fecha</Text>
          <Text style={mobileStyles.col2}>Tipo</Text>
          <Text style={mobileStyles.col3}>Monto</Text>
          <Text style={mobileStyles.col4}>Saldo</Text>
        </View>

        {movements.map((movement, index) => (
          <View key={movement.id} style={index % 2 === 0 ? mobileStyles.tableRow : mobileStyles.tableRowAlt}>
            <Text style={mobileStyles.col1}>
              {formatArgentinaDate(movement.date)}
            </Text>
            <Text style={[
              mobileStyles.col2,
              movement.type === 'Cargo' ? mobileStyles.chargeText : mobileStyles.paymentText
            ]}>
              {movement.type}
            </Text>
            <Text style={[
              mobileStyles.col3,
              movement.type === 'Cargo' ? mobileStyles.chargeText : mobileStyles.paymentText
            ]}>
              ${movement.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={[mobileStyles.col4, { fontWeight: 'bold' }]}>
              ${movement.balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        ))}

        <Text style={mobileStyles.footer}>
          Sistema de Gestión - Optimizado para WhatsApp
        </Text>
      </Page>
    </Document>
  );

  const blob = await pdf(MobileAccountDocument()).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cuenta-corriente-${client.client_name.replace(/\s+/g, '-')}-mobile.pdf`;
  link.click();
}

const labelStyles = StyleSheet.create({
  page: {
    width: '50mm',
    height: '30mm',
    padding: 0,
    margin: 0,
  },
  labelContainer: {
    width: '50mm',
    height: '30mm',
    padding: '2mm',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    border: '1pt solid #000',
    backgroundColor: '#ffffff',
  },
  productName: {
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 1,
    color: '#000',
  },
  productInfo: {
    fontSize: 6,
    textAlign: 'center',
    color: '#333',
    marginBottom: 2,
  },
  barcodeContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  barcodeImage: {
    width: '42mm',
    height: '10mm',
    objectFit: 'contain',
  },
  barcodeText: {
    fontSize: 6,
    fontFamily: 'Courier',
    textAlign: 'center',
    marginTop: 1,
    color: '#000',
    letterSpacing: 1,
  },
  price: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
    marginTop: 1,
  },
});

function generateEAN13BarcodeImage(code: string): string {
  const L_CODES = [
    '0001101', '0011001', '0010011', '0111101', '0100011',
    '0110001', '0101111', '0111011', '0110111', '0001011'
  ];

  const G_CODES = [
    '0100111', '0110011', '0011011', '0100001', '0011101',
    '0111001', '0000101', '0010001', '0001001', '0010111'
  ];

  const R_CODES = [
    '1110010', '1100110', '1101100', '1000010', '1011100',
    '1001110', '1010000', '1000100', '1001000', '1110100'
  ];

  const FIRST_DIGIT_PATTERN = [
    'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
    'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'
  ];

  const digits = code.replace(/\D/g, '').padStart(13, '0').slice(0, 13);
  const firstDigit = parseInt(digits[0]);
  const pattern = FIRST_DIGIT_PATTERN[firstDigit];

  let barcode = '101';

  for (let i = 0; i < 6; i++) {
    const digit = parseInt(digits[i + 1]);
    barcode += pattern[i] === 'L' ? L_CODES[digit] : G_CODES[digit];
  }

  barcode += '01010';

  for (let i = 6; i < 12; i++) {
    const digit = parseInt(digits[i + 1]);
    barcode += R_CODES[digit];
  }

  barcode += '101';

  const canvas = document.createElement('canvas');
  const barWidth = 2;
  const height = 60;
  canvas.width = barcode.length * barWidth;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#000000';
  barcode.split('').forEach((bar, i) => {
    if (bar === '1') {
      ctx.fillRect(i * barWidth, 0, barWidth, height);
    }
  });

  return canvas.toDataURL('image/png');
}

export async function generateThermalLabelsPDF(
  products: Array<{
    name: string;
    category: string;
    size: string;
    price: number;
    barcode: string;
    quantity: number;
  }>,
  labelSize: '50x25' | '50x30' | '80x40' | '100x50' = '50x25'
) {
  const labels = products.flatMap(p =>
    Array(p.quantity).fill(null).map(() => p)
  );

  const labelSizes = {
    '50x25': { width: 141.73, height: 70.87 },
    '50x30': { width: 141.73, height: 85.04 },
    '80x40': { width: 226.77, height: 113.39 },
    '100x50': { width: 283.46, height: 141.73 }
  };

  const dimensions = labelSizes[labelSize];

  const dynamicStyles = StyleSheet.create({
    productName: {
      fontSize: labelSize === '50x25' ? 7 : labelSize === '50x30' ? 8 : 10,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 1,
      color: '#000',
    },
    productInfo: {
      fontSize: labelSize === '50x25' ? 5 : labelSize === '50x30' ? 6 : 7,
      textAlign: 'center',
      color: '#333',
      marginBottom: labelSize === '50x25' ? 1 : 2,
    },
    barcodeImage: {
      width: labelSize === '50x25' ? '40mm' : labelSize === '50x30' ? '42mm' : labelSize === '80x40' ? '70mm' : '90mm',
      height: labelSize === '50x25' ? '8mm' : labelSize === '50x30' ? '10mm' : labelSize === '80x40' ? '15mm' : '20mm',
      objectFit: 'contain',
    },
    barcodeText: {
      fontSize: labelSize === '50x25' ? 5 : labelSize === '50x30' ? 6 : 7,
      textAlign: 'center',
      fontFamily: 'Courier',
      color: '#000',
      marginTop: 1,
    },
    price: {
      fontSize: labelSize === '50x25' ? 10 : labelSize === '50x30' ? 11 : 14,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#000',
      marginTop: labelSize === '50x25' ? 1 : 2,
    }
  });

  const LabelsDocument = (
    <Document>
      {labels.map((product, index) => (
        <Page key={index} size={{ width: dimensions.width, height: dimensions.height }} style={labelStyles.page}>
          <View style={labelStyles.labelContainer}>
            <Text style={dynamicStyles.productName}>
              {product.name.length > (labelSize === '50x25' ? 22 : 25) ? product.name.substring(0, labelSize === '50x25' ? 22 : 25) + '...' : product.name}
            </Text>

            <Text style={dynamicStyles.productInfo}>
              {product.category} - Talle {product.size}
            </Text>

            <View style={labelStyles.barcodeContainer}>
              <Image
                src={generateEAN13BarcodeImage(product.barcode)}
                style={dynamicStyles.barcodeImage}
              />
              <Text style={dynamicStyles.barcodeText}>{product.barcode}</Text>
            </View>

            <Text style={dynamicStyles.price}>
              ${product.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );

  const blob = await pdf(LabelsDocument).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `etiquetas-termicas-${new Date().toISOString().split('T')[0]}.pdf`;
  link.click();
}
