import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import {
  BarChart3,
  ChevronRight,
  DollarSign,
  Download,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Users,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getUserRoleFlags } from '../utils/roles';
import { formatPhone } from '../utils/formatContact';

type Venta = {
  id: number;
  negocio_id: string | null;
  cliente_id: number | null;
  vendedor_id?: string | null;
  fecha: string;
  subtotal?: number | null;
  descuento?: number | null;
  descuento_porcentaje?: number | null;
  descuento_monto?: number | null;
  total: number | null;
  tipo_pago: 'Contado' | 'Crédito' | null;
  saldo_pendiente: number | null;
  vendedor_nombre?: string | null;
  created_at?: string | null;
  estado?: string | null;
  anulada_at?: string | null;
  motivo_anulacion?: string | null;
  clientes?: { nombre: string } | null | Array<{ nombre: string }>;
};

type VentaItem = {
  id: number;
  venta_id: number | null;
  producto_id: number | null;
  cantidad: number;
  precio: number;
  total: number;
  productos?: { nombre: string } | null;
  ventas?: { negocio_id: string | null; fecha: string; estado?: string | null } | null;
};

type Producto = {
  id: number;
  nombre: string;
  precio: number | null;
  costo: number | null;
  stock: number | null;
  minimo: number | null;
};

type Cliente = {
  id: number;
  nombre: string;
  telefono: string | null;
  saldo: number | null;
  limite_credito: number | null;
};

type Pago = {
  id: number;
  cliente_id: number | null;
  venta_id: number | null;
  fecha: string;
  monto: number;
  clientes?: { nombre: string } | null | Array<{ nombre: string }>;
};

type SaleReturn = {
  id: number;
  sale_id: number;
  refund_total: number;
  return_date: string;
  sale_return_items?: Array<{
    product_id: number | null;
    quantity: number;
    refund_amount: number;
  }> | null;
};

type ReportType = 'sales' | 'products' | 'clients' | 'payments';
type DetailReport = 'orderSummary' | 'revenueSummary' | 'paymentDevice' | 'inventory' | 'salesFunnel' | 'clients' | null;

type CurrencySettings = {
  code: string;
  symbol: string;
};

const DEFAULT_CURRENCY: CurrencySettings = { code: 'USD', symbol: '$' };

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  HTG: 'HTG',
  DOP: 'RD$',
  CAD: 'CA$',
  MXN: 'MX$',
  BRL: 'R$',
  GBP: '£'
};

function getCurrencySymbol(code: string) {
  return CURRENCY_SYMBOLS[code] || code || DEFAULT_CURRENCY.symbol;
}

function getStringField(data: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!data) return '';
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function normalizeCurrencySettings(data: Record<string, unknown> | null | undefined): CurrencySettings {
  const rawCode = getStringField(data, ['moneda_codigo', 'monedaCode', 'currency_code', 'currencyCode', 'moneda', 'currency']);
  const code = String(rawCode || DEFAULT_CURRENCY.code).trim().toUpperCase();
  const rawSymbol = getStringField(data, [
    'moneda_simbolo',
    'monedaSimbolo',
    'currency_symbol',
    'currencySymbol',
    'simbolo_moneda',
    'simboloMoneda',
    'simbolo',
    'simboloMonedaNegocio',
    'currencySymbolBusiness'
  ]);
  const symbol = String(rawSymbol || getCurrencySymbol(code)).trim() || getCurrencySymbol(code);
  return { code, symbol };
}

function formatCurrency(value: number | null | undefined) {
  return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMoney(value: number | null | undefined, currency: CurrencySettings) {
  return `${currency.symbol} ${formatCurrency(value)}`;
}

function isCancelledSale(venta: Venta | null | undefined) {
  const estado = String(venta?.estado || '').toLowerCase().trim();
  return ['anulada', 'cancelada', 'cancelled', 'void'].includes(estado);
}

function isCancelledItem(item: VentaItem | null | undefined) {
  const estado = String(item?.ventas?.estado || '').toLowerCase().trim();
  return ['anulada', 'cancelada', 'cancelled', 'void'].includes(estado);
}

function getSaleDiscountAmount(venta: Venta | null | undefined) {
  return Number(venta?.descuento_monto ?? venta?.descuento ?? 0);
}


function getSaleSeller(venta: Venta | null | undefined) {
  return venta?.vendedor_nombre || 'Usuario';
}

function getClientName(clientes: { nombre: string } | null | Array<{ nombre: string }> | undefined, fallback: string) {
  if (Array.isArray(clientes)) {
    return clientes[0]?.nombre || fallback;
  }

  return clientes?.nombre || fallback;
}

function getPaymentClientName(pago: Pago | null | undefined, fallback: string) {
  return getClientName(pago?.clientes, fallback);
}

const reportsCopy = {
  es: {
    loading: 'Cargando reportes...',
    missingTitle: 'Usuario sin negocio asignado',
    missingText: 'El login funciona, pero este usuario no tiene un negocio asignado.',
    title: 'Reportes',
    subtitle: 'Panel ejecutivo de ventas, inventario, clientes y pagos',
    sellerSubtitle: 'Vista básica para vendedor: ventas del día y productos vendidos',
    sellerBasicView: 'Vista limitada: no incluye utilidades, inventario, cuentas por cobrar ni reportes financieros.',
    refresh: 'Actualizar',
    exportCsv: 'Exportar CSV',
    from: 'Desde',
    to: 'Hasta',
    paymentType: 'Tipo de pago',
    all: 'Todos',
    cash: 'Contado',
    credit: 'Crédito',
    totalSold: 'Ingresos totales',
    sellerSalesCount: 'Ventas del día',
    cancelledTotal: 'Total anulado',
    netTotal: 'Neto real',
    activeSales: 'Ventas activas',
    cancelledSales: 'Ventas anuladas',
    totalDiscounts: 'Descuentos otorgados',
    topSeller: 'Vendedor destacado',
    seller: 'Vendedor',
    discount: 'Descuento',
    status: 'Estado',
    active: 'Activa',
    cancelled: 'Anulada',
    estimatedProfit: 'Ganancia estimada',
    sales: 'Ventas',
    paymentsReceived: 'Pagos recibidos',
    lowStock: 'Bajo stock',
    clientsWithDebt: 'Clientes con deuda',
    products: 'Productos',
    clients: 'Clientes',
    payments: 'Pagos',
    periodSales: 'Ventas del período',
    id: 'ID',
    date: 'Fecha',
    client: 'Cliente',
    payment: 'Pago',
    total: 'Total',
    pending: 'Pendiente',
    generalClient: 'Cliente general',
    noSalesPeriod: 'No hay ventas en este período',
    topProducts: 'Productos más vendidos',
    quantitySold: 'Cantidad vendida',
    unnamedProduct: 'Producto sin nombre',
    noProductSales: 'No hay ventas de productos',
    lowStockInventory: 'Inventario bajo stock',
    minimum: 'Mínimo',
    stock: 'Stock',
    noLowStock: 'No hay productos con bajo stock',
    clientsWithPendingBalance: 'Clientes con saldo pendiente',
    phone: 'Teléfono',
    limit: 'Límite',
    balance: 'Saldo',
    noDebtClients: 'No hay clientes con deuda',
    sale: 'Venta',
    amount: 'Monto',
    transactionType: 'Tipo de transacción',
    paymentBySale: 'Pago recibido por venta',
    creditPayment: 'Pago aplicado a crédito',
    creditLabel: 'Crédito',
    noPaymentsPeriod: 'No hay pagos en este período',
    csvDate: 'Fecha',
    csvClient: 'Cliente',
    csvPaymentType: 'Tipo de Pago',
    csvPendingBalance: 'Saldo Pendiente',
    csvSeller: 'Vendedor',
    csvDiscount: 'Descuento',
    report: 'Ver reporte',
    close: 'Cerrar',
    orderSummary: 'Resumen de ventas',
    revenueSummary: 'Resumen de ingresos',
    paymentMix: 'Ventas por tipo de pago',
    inventoryBrowser: 'Inventario y productos',
    salesFunnel: 'Embudo comercial',
    clientSummary: 'Resumen de clientes',
    vsPeriod: 'vs período',
    totalVisits: 'Pagos recibidos',
    mobile: 'Contado',
    desktop: 'Crédito',
    impression: 'Ventas',
    addedToCart: 'Productos vendidos',
    reachedCheckout: 'Clientes con deuda',
    purchased: 'Pagos',
  },
  en: {
    loading: 'Loading reports...',
    missingTitle: 'User has no assigned business',
    missingText: 'Login works, but this user does not have an assigned business.',
    title: 'Reports',
    subtitle: 'Executive dashboard for sales, inventory, clients, and payments',
    sellerSubtitle: 'Basic seller view: today sales and sold products',
    sellerBasicView: 'Limited view: excludes profit, inventory, receivables, and financial reports.',
    refresh: 'Refresh',
    exportCsv: 'Export CSV',
    from: 'From',
    to: 'To',
    paymentType: 'Payment type',
    all: 'All',
    cash: 'Cash',
    credit: 'Credit',
    totalSold: 'Total Revenue',
    sellerSalesCount: 'Today Sales',
    cancelledTotal: 'Cancelled Total',
    netTotal: 'Real Net',
    activeSales: 'Active Sales',
    cancelledSales: 'Cancelled Sales',
    totalDiscounts: 'Discounts Given',
    topSeller: 'Top Seller',
    seller: 'Seller',
    discount: 'Discount',
    status: 'Status',
    active: 'Active',
    cancelled: 'Cancelled',
    estimatedProfit: 'Estimated Profit',
    sales: 'Sales',
    paymentsReceived: 'Payments Received',
    lowStock: 'Low Stock',
    clientsWithDebt: 'Clients with Debt',
    products: 'Products',
    clients: 'Clients',
    payments: 'Payments',
    periodSales: 'Period Sales',
    id: 'ID',
    date: 'Date',
    client: 'Client',
    payment: 'Payment',
    total: 'Total',
    pending: 'Pending',
    generalClient: 'General client',
    noSalesPeriod: 'No sales in this period',
    topProducts: 'Top Selling Products',
    quantitySold: 'Quantity sold',
    unnamedProduct: 'Unnamed product',
    noProductSales: 'No product sales',
    lowStockInventory: 'Low Stock Inventory',
    minimum: 'Minimum',
    stock: 'Stock',
    noLowStock: 'No low stock products',
    clientsWithPendingBalance: 'Clients with Pending Balance',
    phone: 'Phone',
    limit: 'Limit',
    balance: 'Balance',
    noDebtClients: 'No clients with debt',
    sale: 'Sale',
    amount: 'Amount',
    transactionType: 'Transaction type',
    paymentBySale: 'Payment received by sale',
    creditPayment: 'Payment applied to credit',
    creditLabel: 'Credit',
    noPaymentsPeriod: 'No payments in this period',
    csvDate: 'Date',
    csvClient: 'Client',
    csvPaymentType: 'Payment Type',
    csvPendingBalance: 'Pending Balance',
    csvSeller: 'Seller',
    csvDiscount: 'Discount',
    report: 'Report',
    close: 'Close',
    orderSummary: 'Order Summary',
    revenueSummary: 'Revenue Summary',
    paymentMix: 'Sales by Payment Type',
    inventoryBrowser: 'Inventory Browser',
    salesFunnel: 'Sales Funnel',
    clientSummary: 'Client Summary',
    vsPeriod: 'vs period',
    totalVisits: 'Payments Received',
    mobile: 'Cash',
    desktop: 'Credit',
    impression: 'Sales',
    addedToCart: 'Products Sold',
    reachedCheckout: 'Clients with Debt',
    purchased: 'Payments',
  },
} as const;

export default function ReportsPage() {
  const { user, userProfile } = useAuth();
  const { language } = useLanguage();
  const t = reportsCopy[language];
  const roleFlags = getUserRoleFlags(userProfile);
  const isSeller = roleFlags.isSeller;
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [ventaItems, setVentaItems] = useState<VentaItem[]>([]);
  const [saleReturns, setSaleReturns] = useState<SaleReturn[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [productCosts, setProductCosts] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [missingNegocio, setMissingNegocio] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportType>('sales');
  const [activeDetail, setActiveDetail] = useState<DetailReport>(null);
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY);

  const today = new Date().toISOString().slice(0, 10);
  const firstDayOfMonth = `${today.slice(0, 7)}-01`;

  const [filters, setFilters] = useState({
    from: isSeller ? today : firstDayOfMonth,
    to: today,
    paymentType: 'all'
  });
  const deferredPaymentType = useDeferredValue(filters.paymentType);

  const filteredVentas = useMemo(() => {
    return ventas.filter((venta) => deferredPaymentType === 'all' || venta.tipo_pago === deferredPaymentType);
  }, [ventas, deferredPaymentType]);

  const activeVentas = useMemo(() => filteredVentas.filter((venta) => !isCancelledSale(venta)), [filteredVentas]);
  const cancelledVentas = useMemo(() => filteredVentas.filter((venta) => isCancelledSale(venta)), [filteredVentas]);
  const activeVentaIds = useMemo(() => new Set(activeVentas.map((venta) => venta.id)), [activeVentas]);

  const summary = useMemo(() => {
    const saleById = new Map(activeVentas.map((venta) => [venta.id, venta]));
    const activeReturns = saleReturns.filter((returnRecord) => saleById.has(returnRecord.sale_id));
    const returnedTotal = activeReturns.reduce((sum, returnRecord) => sum + Number(returnRecord.refund_total || 0), 0);
    const returnedCash = activeReturns
      .filter((returnRecord) => saleById.get(returnRecord.sale_id)?.tipo_pago === 'Contado')
      .reduce((sum, returnRecord) => sum + Number(returnRecord.refund_total || 0), 0);
    const returnedCredit = activeReturns
      .filter((returnRecord) => saleById.get(returnRecord.sale_id)?.tipo_pago === 'Crédito')
      .reduce((sum, returnRecord) => sum + Number(returnRecord.refund_total || 0), 0);
    const totalVentas = activeVentas.reduce((sum, venta) => sum + Number(venta.total || 0), 0) - returnedTotal;
    const totalAnulado = cancelledVentas.reduce((sum, venta) => sum + Number(venta.total || 0), 0);
    const totalNeto = totalVentas;
    const totalContado = activeVentas.filter((venta) => venta.tipo_pago === 'Contado').reduce((sum, venta) => sum + Number(venta.total || 0), 0) - returnedCash;
    const totalCredito = activeVentas.filter((venta) => venta.tipo_pago === 'Crédito').reduce((sum, venta) => sum + Number(venta.total || 0), 0) - returnedCredit;
    const totalPendiente = activeVentas.reduce((sum, venta) => sum + Number(venta.saldo_pendiente || 0), 0);
    const totalPagos = pagos.reduce((sum, pago) => sum + Number(pago.monto || 0), 0);
    const totalDescuentos = activeVentas.reduce((sum, venta) => sum + getSaleDiscountAmount(venta), 0);

    const vendedorStats = activeVentas.reduce((map, venta) => {
      const seller = getSaleSeller(venta);
      const current = map.get(seller) || { nombre: seller, ventas: 0, total: 0 };
      current.ventas += 1;
      current.total += Number(venta.total || 0);
      map.set(seller, current);
      return map;
    }, new Map<string, { nombre: string; ventas: number; total: number }>());

    const vendedorDestacado = Array.from(vendedorStats.values()).sort((a, b) => b.total - a.total)[0] || null;

    const gananciaEstimada = ventaItems.filter((item) => !isCancelledItem(item)).reduce((sum, item) => {
      const costo = productCosts.get(item.producto_id || -1) ?? 0;
      const precio = Number(item.precio || 0);
      const cantidad = Number(item.cantidad || 0);
      return sum + (precio - costo) * cantidad;
    }, 0);

    return {
      totalVentas,
      totalAnulado,
      totalNeto,
      totalContado,
      totalCredito,
      totalPendiente,
      totalPagos,
      totalDescuentos,
      vendedorDestacado,
      gananciaEstimada,
      cantidadVentas: activeVentas.length,
      cantidadAnuladas: cancelledVentas.length,
      productosBajoStock: productos.filter((producto) => Number(producto.stock || 0) <= Number(producto.minimo || 0)).length,
      clientesConDeuda: clientes.filter((cliente) => Number(cliente.saldo || 0) > 0).length
    };
  }, [activeVentas, cancelledVentas, ventaItems, productos, clientes, pagos, productCosts, saleReturns]);

  const productosMasVendidos = useMemo(() => {
    const grouped = new Map<number, { nombre: string; cantidad: number; total: number }>();
    ventaItems.forEach((item) => {
      if (!item.producto_id || !item.venta_id || !activeVentaIds.has(item.venta_id) || isCancelledItem(item)) return;
      const current = grouped.get(item.producto_id) || { nombre: item.productos?.nombre || t.unnamedProduct, cantidad: 0, total: 0 };
      current.cantidad += Number(item.cantidad || 0);
      current.total += Number(item.total || 0);
      grouped.set(item.producto_id, current);
    });
    saleReturns.forEach((returnRecord) => {
      if (!activeVentaIds.has(returnRecord.sale_id)) return;
      (returnRecord.sale_return_items || []).forEach((item) => {
        if (!item.product_id) return;
        const current = grouped.get(item.product_id);
        if (!current) return;
        current.cantidad = Math.max(0, current.cantidad - Number(item.quantity || 0));
        current.total = Math.max(0, current.total - Number(item.refund_amount || 0));
      });
    });
    return Array.from(grouped.values()).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);
  }, [ventaItems, activeVentaIds, saleReturns, t.unnamedProduct]);

  const clientesConDeuda = useMemo(() => clientes.filter((cliente) => Number(cliente.saldo || 0) > 0).sort((a, b) => Number(b.saldo || 0) - Number(a.saldo || 0)), [clientes]);
  const productosBajoStock = useMemo(() => productos.filter((producto) => Number(producto.stock || 0) <= Number(producto.minimo || 0)).sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0)), [productos]);

  const weeklySales = useMemo(() => {
    const labels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const values = new Array(7).fill(0);
    const saleDayById = new Map<number, number>();
    activeVentas.forEach((venta) => {
      const day = new Date(`${venta.fecha}T00:00:00`).getDay();
      const index = day === 0 ? 6 : day - 1;
      values[index] += Number(venta.total || 0);
      saleDayById.set(venta.id, index);
    });
    saleReturns.forEach((returnRecord) => {
      const index = saleDayById.get(returnRecord.sale_id);
      if (index === undefined) return;
      values[index] -= Number(returnRecord.refund_total || 0);
    });
    const max = Math.max(...values, 1);
    return labels.map((label, index) => ({ label, value: values[index], height: Math.max(12, (values[index] / max) * 100) }));
  }, [activeVentas, saleReturns]);

  const paymentCashPercent = summary.totalVentas > 0 ? Math.round((summary.totalContado / summary.totalVentas) * 100) : 0;
  const paymentCreditPercent = Math.max(0, 100 - paymentCashPercent);
  const avgSale = summary.cantidadVentas > 0 ? summary.totalVentas / summary.cantidadVentas : 0;
  const returnedUnits = saleReturns
    .filter((returnRecord) => activeVentaIds.has(returnRecord.sale_id))
    .reduce((sum, returnRecord) => sum + (returnRecord.sale_return_items || []).reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0), 0);
  const soldUnits = Math.max(0, ventaItems.filter((item) => !isCancelledItem(item)).reduce((sum, item) => sum + Number(item.cantidad || 0), 0) - returnedUnits);

  const loadReportsData = useCallback(async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        setVentas([]);
        setVentaItems([]);
        setSaleReturns([]);
        setProductos([]);
        setClientes([]);
        setPagos([]);
        setProductCosts(new Map());
        setCurrencySettings(DEFAULT_CURRENCY);
        setMissingNegocio(false);
        return;
      }

      const currentNegocioId = userProfile?.negocio_id || null;
      if (!currentNegocioId) {
        setVentas([]);
        setVentaItems([]);
        setSaleReturns([]);
        setProductos([]);
        setClientes([]);
        setPagos([]);
        setProductCosts(new Map());
        setCurrencySettings(DEFAULT_CURRENCY);
        setMissingNegocio(true);
        return;
      }

      let ventasQuery = supabase
        .from('ventas')
        .select('id, negocio_id, cliente_id, vendedor_id, fecha, subtotal, descuento, descuento_porcentaje, descuento_monto, total, tipo_pago, saldo_pendiente, vendedor_nombre, created_at, estado, anulada_at, motivo_anulacion, clientes(nombre)')
        .eq('negocio_id', currentNegocioId)
        .gte('fecha', isSeller ? today : filters.from)
        .lte('fecha', isSeller ? today : filters.to)
        .order('fecha', { ascending: false });

      if (isSeller && user?.id) {
        ventasQuery = ventasQuery.eq('vendedor_id', user.id);
      }

      const [ventasResult, productosResult, clientesResult, businessResult, costMapResult] = await Promise.all([
        ventasQuery,
        supabase.from('productos').select('id, nombre, precio, stock, minimo').eq('negocio_id', currentNegocioId).order('nombre', { ascending: true }),
        supabase.from('clientes').select('id, nombre, telefono, saldo, limite_credito').eq('negocio_id', currentNegocioId).order('nombre', { ascending: true }),
        supabase.from('negocios').select('*').eq('id', currentNegocioId).maybeSingle(),
        roleFlags.isOwner
          ? supabase.rpc('get_productos_for_business', { p_negocio_id: currentNegocioId })
          : Promise.resolve({ data: [], error: null })
      ]);

      if (ventasResult.error) throw ventasResult.error;
      if (productosResult.error) throw productosResult.error;
      if (clientesResult.error) throw clientesResult.error;
      if (businessResult.error) throw businessResult.error;
      if (costMapResult.error) throw costMapResult.error;

      const productCostMap = new Map<number, number>(
        ((costMapResult.data || []) as { id: number; costo: number | null }[]).map((row) => [row.id, Number(row.costo || 0)])
      );
      setProductCosts(productCostMap);

      const loadedVentasData = (ventasResult.data || []) as unknown as Venta[];
      const ventaIds = loadedVentasData.map((venta) => venta.id);

      let pagosQuery = supabase
        .from('pagos')
        .select('id, cliente_id, venta_id, fecha, monto, clientes(nombre)')
        .eq('negocio_id', currentNegocioId)
        .gte('fecha', isSeller ? today : filters.from)
        .lte('fecha', isSeller ? today : filters.to)
        .order('fecha', { ascending: false });

      if (isSeller) {
        if (ventaIds.length === 0) {
          setVentas([]);
          setVentaItems([]);
          setSaleReturns([]);
          setProductos((productosResult.data || []) as unknown as Producto[]);
          setClientes((clientesResult.data || []) as unknown as Cliente[]);
          setPagos([]);
          setCurrencySettings(normalizeCurrencySettings(businessResult.data as Record<string, unknown> | null));
          setMissingNegocio(false);
          return;
        }

        pagosQuery = pagosQuery.in('venta_id', ventaIds);
      }

      const pagosResult = await pagosQuery;

      if (pagosResult.error) throw pagosResult.error;
      let returnsQuery = supabase
        .from('sale_returns')
        .select('id, sale_id, refund_total, return_date, sale_return_items(product_id, quantity, refund_amount)')
        .eq('negocio_id', currentNegocioId)
        .gte('return_date', isSeller ? today : filters.from)
        .lte('return_date', isSeller ? today : filters.to)
        .order('return_date', { ascending: false });

      if (isSeller && ventaIds.length > 0) {
        returnsQuery = returnsQuery.in('sale_id', ventaIds);
      }

      const returnsResult = await returnsQuery;
      if (returnsResult.error) throw returnsResult.error;

      let itemsData: VentaItem[] = [];
      if (ventaIds.length > 0) {
        const itemsResult = await supabase
          .from('venta_items')
          .select('id, venta_id, producto_id, cantidad, precio, total, productos(nombre), ventas(negocio_id, fecha, estado)')
          .in('venta_id', ventaIds);
        if (itemsResult.error) throw itemsResult.error;
        itemsData = (itemsResult.data || []) as unknown as VentaItem[];
      }

      setVentas(loadedVentasData);
      setVentaItems(itemsData);
      setSaleReturns((returnsResult.data || []) as unknown as SaleReturn[]);
      setProductos((productosResult.data || []) as unknown as Producto[]);
      setClientes((clientesResult.data || []) as unknown as Cliente[]);
      setPagos((pagosResult.data || []) as unknown as Pago[]);
      setCurrencySettings(normalizeCurrencySettings(businessResult.data as Record<string, unknown> | null));
      setMissingNegocio(false);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  }, [filters.from, filters.to, isSeller, roleFlags.isOwner, today, user?.id, userProfile?.negocio_id]);

  useEffect(() => {
    if (isSeller && (filters.from !== today || filters.to !== today || filters.paymentType !== 'all')) {
      setFilters({ from: today, to: today, paymentType: 'all' });
      return;
    }

    loadReportsData();
    if (isSeller) {
      setSelectedReport('sales');
      setActiveDetail(null);
    }
  }, [filters.from, filters.to, filters.paymentType, isSeller, loadReportsData, roleFlags.role, today]);

  function exportCSV() {
    const rows = filteredVentas.map((venta) => {
      const cancelled = isCancelledSale(venta);
      return {
        id: venta.id,
        fecha: venta.fecha,
        cliente: getClientName(venta.clientes, t.generalClient),
        vendedor: getSaleSeller(venta),
        tipo_pago: venta.tipo_pago || '',
        estado: cancelled ? t.cancelled : t.active,
        descuento: formatMoney(getSaleDiscountAmount(venta), currencySettings),
        total: `${cancelled ? '-' : ''}${formatMoney(venta.total, currencySettings)}`,
        saldo_pendiente: formatMoney(venta.saldo_pendiente, currencySettings)
      };
    });

    const headers = isSeller
      ? ['ID', t.csvDate, t.csvClient, t.csvPaymentType, t.status]
      : ['ID', t.csvDate, t.csvClient, t.csvSeller, t.csvPaymentType, t.status, t.csvDiscount, t.total, t.csvPendingBalance];
    const csv = [
      headers.join(','),
      ...rows.map((row) => isSeller
        ? [row.id, row.fecha, `"${row.cliente}"`, row.tipo_pago, row.estado].join(',')
        : [row.id, row.fecha, `"${row.cliente}"`, `"${row.vendedor}"`, row.tipo_pago, row.estado, `"${row.descuento}"`, `"${row.total}"`, `"${row.saldo_pendiente}"`].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reporte-ventas-${filters.from}-${filters.to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center px-4">
        <div className="rounded-2xl border border-[#e9e2d3] bg-white/80 px-5 py-4 text-sm font-bold text-[#71717a] shadow-matmax-soft sm:px-6">
          {t.loading}
        </div>
      </div>
    );
  }

  if (missingNegocio) {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#fbfaf7] p-4 sm:p-6">
        <div className="w-full max-w-xl rounded-[2rem] border border-red-200 bg-white/90 p-5 text-center shadow-matmax-soft sm:p-8">
          <h1 className="mb-3 text-xl font-serif font-bold text-red-700 sm:text-2xl">{t.missingTitle}</h1>
          <p className="mb-4 text-sm text-[#71717a] sm:text-base">{t.missingText}</p>
          <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4 text-left text-sm text-[#3f3f46]">
            <p className="mb-2 font-black">User ID:</p>
            <code className="break-all">{user?.id}</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden text-[#08080b] sm:space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#e5dfd2] bg-white/85 p-5 shadow-[0_22px_70px_rgba(15,15,15,0.08)] backdrop-blur-2xl sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,197,66,0.18),transparent_34%)]" />
        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#eadfca] bg-white/75 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6a16] shadow-sm backdrop-blur-xl">
              <BarChart3 size={14} />
              MatMax Business Suite
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#050505] sm:text-5xl">{t.title}</h1>
            <p className="mt-3 max-w-3xl text-sm font-bold uppercase tracking-[0.18em] text-[#71717a]">
              {isSeller ? t.sellerSubtitle : t.subtitle}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button type="button" variant="secondary" className="w-full gap-2 rounded-2xl bg-white/90 shadow-sm sm:w-auto" onClick={loadReportsData}>
              <RefreshCw size={17} />
              {t.refresh}
            </Button>
            <Button type="button" className="w-full gap-2 rounded-2xl shadow-[0_18px_45px_rgba(0,0,0,0.18)] sm:w-auto" onClick={exportCSV} disabled={filteredVentas.length === 0}>
              <Download size={17} />
              {t.exportCsv}
            </Button>
          </div>
        </div>
      </section>

      {!isSeller && (
        <section className="rounded-[2rem] border border-[#e5dfd2] bg-white/80 p-4 shadow-[0_16px_44px_rgba(15,15,15,0.05)] backdrop-blur-2xl sm:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input label={t.from} type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            <Input label={t.to} type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            <Select
              label={t.paymentType}
              value={filters.paymentType}
              onChange={(e) => setFilters({ ...filters, paymentType: e.target.value })}
              options={[{ value: 'all', label: t.all }, { value: 'Contado', label: t.cash }, { value: 'Crédito', label: t.credit }]}
            />
          </div>
        </section>
      )}

      {isSeller && (
        <section className="rounded-[1.5rem] border border-[#e9e2d3] bg-[#fbfaf7] px-4 py-3 text-sm font-bold text-[#71717a] shadow-sm">
          {t.sellerBasicView}
        </section>
      )}

      <section className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${isSeller ? '2xl:grid-cols-3' : '2xl:grid-cols-4'}`}>
        <MetricTile
          title={isSeller ? t.sellerSalesCount : t.totalSold}
          value={isSeller ? summary.cantidadVentas.toLocaleString('en-US') : formatMoney(summary.totalVentas, currencySettings)}
          subtitle={isSeller ? t.quantitySold : t.netTotal}
          helperValue={isSeller ? soldUnits.toLocaleString('en-US') : formatMoney(summary.totalNeto, currencySettings)}
          icon={isSeller ? ShoppingCart : DollarSign}
        />
        <MetricTile
          title={t.activeSales}
          value={summary.cantidadVentas.toLocaleString('en-US')}
          subtitle={isSeller ? t.products : t.cancelledSales}
          helperValue={isSeller ? productosMasVendidos.length.toLocaleString('en-US') : summary.cantidadAnuladas.toLocaleString('en-US')}
          icon={ShoppingCart}
        />
        {!isSeller && (
          <MetricTile title={t.clientsWithDebt} value={summary.clientesConDeuda.toLocaleString('en-US')} subtitle={t.lowStock} helperValue={summary.productosBajoStock.toLocaleString('en-US')} icon={Users} />
        )}
        {!isSeller && (
          <MetricTile
            title={language === 'es' ? 'Venta promedio' : 'Avg Sale'}
            value={formatMoney(avgSale, currencySettings)}
            subtitle={roleFlags.isOwner ? t.estimatedProfit : t.quantitySold}
            helperValue={roleFlags.isOwner ? formatMoney(summary.gananciaEstimada, currencySettings) : soldUnits.toLocaleString('en-US')}
            icon={TrendingUp}
          />
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ReportPanel title={t.orderSummary} onOpen={() => setActiveDetail('orderSummary')} className="xl:col-span-1" reportLabel={t.report}>
          <LineSummaryChart data={weeklySales} currencySettings={currencySettings} />
        </ReportPanel>
        {!isSeller && (
        <ReportPanel title={t.revenueSummary} onOpen={() => setActiveDetail('revenueSummary')} className="xl:col-span-1" reportLabel={t.report}>
          <BarSummaryChart data={weeklySales} currencySettings={currencySettings} />
        </ReportPanel>
        )}
        {!isSeller && (
        <ReportPanel title={t.paymentMix} onOpen={() => setActiveDetail('paymentDevice')} className="xl:col-span-1" reportLabel={t.report}>
          <PaymentMixCard
            title={t.totalVisits}
            value={formatMoney(summary.totalPagos, currencySettings)}
            cashLabel={t.mobile}
            creditLabel={t.desktop}
            cashPercent={paymentCashPercent}
            creditPercent={paymentCreditPercent}
          />
        </ReportPanel>
        )}
      </section>

      {!isSeller && (
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ReportPanel title={t.inventoryBrowser} onOpen={() => setActiveDetail('inventory')} reportLabel={t.report}>
          <InventoryArc lowStock={summary.productosBajoStock} products={productos.length} productsLabel={t.products} lowStockLabel={t.lowStock} alertsLabel={language === 'es' ? 'Alertas' : 'Alerts'} />
        </ReportPanel>

        <ReportPanel title={t.salesFunnel} onOpen={() => setActiveDetail('salesFunnel')} className="xl:col-span-2" reportLabel={t.report}>
          <FunnelChart
            labels={[t.impression, t.addedToCart, t.reachedCheckout, t.purchased]}
            values={[summary.cantidadVentas, soldUnits, summary.clientesConDeuda, pagos.length]}
          />
        </ReportPanel>
      </section>
      )}

      {!isSeller && (
      <section className="flex min-w-0 flex-wrap gap-2 rounded-[2rem] border border-[#e5dfd2] bg-white/78 p-2.5 shadow-[0_14px_40px_rgba(15,15,15,0.045)] backdrop-blur-2xl sm:gap-3 sm:p-3">
        <TabButton active={selectedReport === 'sales'} onClick={() => setSelectedReport('sales')}>{t.sales}</TabButton>
        <TabButton active={selectedReport === 'products'} onClick={() => setSelectedReport('products')}>{t.products}</TabButton>
        <TabButton active={selectedReport === 'clients'} onClick={() => setSelectedReport('clients')}>{t.clients}</TabButton>
        <TabButton active={selectedReport === 'payments'} onClick={() => setSelectedReport('payments')}>{t.payments}</TabButton>
      </section>
      )}

      {selectedReport === 'sales' && (
        <SalesTable ventas={filteredVentas} t={t} currencySettings={currencySettings} isSeller={isSeller} />
      )}
      {!isSeller && selectedReport === 'products' && (
        <ProductsReport productosMasVendidos={productosMasVendidos} productosBajoStock={productosBajoStock} t={t} currencySettings={currencySettings} />
      )}
      {!isSeller && selectedReport === 'clients' && (
        <ClientsTable clientesConDeuda={clientesConDeuda} t={t} currencySettings={currencySettings} />
      )}
      {!isSeller && selectedReport === 'payments' && (
        <PaymentsTable pagos={pagos} t={t} currencySettings={currencySettings} />
      )}

      {activeDetail && (!isSeller || activeDetail === 'orderSummary') && (
        <FullScreenReport title={getDetailTitle(activeDetail, t)} onClose={() => setActiveDetail(null)} closeLabel={t.close}>
          {activeDetail === 'orderSummary' && (
            <div className="space-y-5">
              <div className="rounded-[1.75rem] border border-[#e5dfd2] bg-white p-5 shadow-[0_18px_45px_rgba(15,15,15,0.08)]">
                <LineSummaryChart data={weeklySales} currencySettings={currencySettings} />
              </div>
              <SalesTable ventas={filteredVentas} t={t} currencySettings={currencySettings} isSeller={isSeller} />
            </div>
          )}
          {activeDetail === 'revenueSummary' && (
            <div className="space-y-5">
              <div className="rounded-[1.75rem] border border-[#e5dfd2] bg-white p-5 shadow-[0_18px_45px_rgba(15,15,15,0.08)]">
                <BarSummaryChart data={weeklySales} currencySettings={currencySettings} />
              </div>
              <SalesTable ventas={filteredVentas} t={t} currencySettings={currencySettings} isSeller={isSeller} />
            </div>
          )}
          {activeDetail === 'paymentDevice' && (
            <div className="space-y-5">
              <div className="rounded-[1.75rem] border border-[#e5dfd2] bg-white p-5 shadow-[0_18px_45px_rgba(15,15,15,0.08)]">
                <PaymentMixCard title={t.totalVisits} value={formatMoney(summary.totalPagos, currencySettings)} cashLabel={t.mobile} creditLabel={t.desktop} cashPercent={paymentCashPercent} creditPercent={paymentCreditPercent} />
              </div>
              <PaymentsTable pagos={pagos} t={t} currencySettings={currencySettings} />
            </div>
          )}
          {activeDetail === 'inventory' && (
            <div className="space-y-5">
              <div className="rounded-[1.75rem] border border-[#e5dfd2] bg-white p-5 shadow-[0_18px_45px_rgba(15,15,15,0.08)]">
                <InventoryArc lowStock={summary.productosBajoStock} products={productos.length} productsLabel={t.products} lowStockLabel={t.lowStock} alertsLabel={language === 'es' ? 'Alertas' : 'Alerts'} />
              </div>
              <ProductsReport productosMasVendidos={productosMasVendidos} productosBajoStock={productosBajoStock} t={t} currencySettings={currencySettings} />
            </div>
          )}
          {activeDetail === 'salesFunnel' && (
            <div className="space-y-5">
              <div className="rounded-[1.75rem] border border-[#e5dfd2] bg-white p-5 shadow-[0_18px_45px_rgba(15,15,15,0.08)]">
                <FunnelChart labels={[t.impression, t.addedToCart, t.reachedCheckout, t.purchased]} values={[summary.cantidadVentas, soldUnits, summary.clientesConDeuda, pagos.length]} />
              </div>
              <SalesTable ventas={filteredVentas} t={t} currencySettings={currencySettings} isSeller={isSeller} />
            </div>
          )}
          {activeDetail === 'clients' && <ClientsTable clientesConDeuda={clientesConDeuda} t={t} currencySettings={currencySettings} />}
        </FullScreenReport>
      )}
    </div>
  );
}

function getDetailTitle(detail: Exclude<DetailReport, null>, t: typeof reportsCopy.es | typeof reportsCopy.en) {
  const titles = {
    orderSummary: t.orderSummary,
    revenueSummary: t.revenueSummary,
    paymentDevice: t.paymentMix,
    inventory: t.inventoryBrowser,
    salesFunnel: t.salesFunnel,
    clients: t.clientSummary,
  };
  return titles[detail];
}

function MetricTile({
  title,
  value,
  subtitle,
  helperValue,
  icon: Icon
}: {
  title: string;
  value: string;
  subtitle: string;
  helperValue: string;
  icon: ElementType;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[1.75rem] border border-[#e9e2d3]/85 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,15,15,0.055)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#f4c542]/35 hover:bg-white hover:shadow-[0_28px_70px_rgba(15,15,15,0.09)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.09),transparent_38%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 overflow-hidden">
          <h3 className="mb-3 truncate text-[10px] font-black uppercase tracking-[0.2em] text-[#8a6a16] sm:text-[11px]">{title}</h3>
          <p className="max-w-full whitespace-nowrap text-[1.9rem] font-black leading-none tracking-tight tabular-nums text-[#050505] sm:text-[2.15rem] xl:text-[2rem] 2xl:text-[2.25rem]">
            {value}
          </p>
          <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2 text-sm font-black text-[#71717a]">
            <span>{subtitle}</span>
            <span className="rounded-full border border-[#e9e2d3] bg-[#fbfaf7] px-2.5 py-1 text-[#050505]">{helperValue}</span>
          </div>
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] bg-[#050505] text-[#f4c542] shadow-[0_18px_40px_rgba(15,15,15,0.12)] transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 sm:h-14 sm:w-14">
          <Icon size={22} />
        </span>
      </div>
    </div>
  );
}

function ReportPanel({ title, children, onOpen, className = '', reportLabel = 'Report' }: { title: string; children: ReactNode; onOpen: () => void; className?: string; reportLabel?: string }) {
  return (
    <div className={`rounded-[1.35rem] border border-[#e5dfd2] bg-white p-5 shadow-[0_18px_45px_rgba(15,15,15,0.08)] ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="text-lg font-black text-[#161616]">{title}</h3>
        <button type="button" onClick={onOpen} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[#3f3f46] transition hover:bg-[#f7f3e9] hover:text-[#050505]">
          {reportLabel}
          <ChevronRight size={20} />
        </button>
      </div>
      {children}
    </div>
  );
}

function LineSummaryChart({ data, currencySettings }: { data: { label: string; value: number; height: number }[]; currencySettings: CurrencySettings }) {
  const points = data.map((item, index) => `${index * 16.6},${100 - item.height}`).join(' ');
  const highest = data.reduce((max, item) => (item.value > max.value ? item : max), data[0] || { label: '-', value: 0, height: 0 });
  return (
    <div className="relative h-64 overflow-hidden">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={`0,100 ${points} 100,100`} fill="url(#lineFill)" stroke="none" />
        <polyline points={points} fill="none" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-xl bg-[#1d1d1f] px-4 py-2 text-center text-sm font-semibold text-white shadow-xl">
        {formatMoney(highest.value, currencySettings)}
        <div className="text-xs font-medium text-white/65">{highest.label}</div>
      </div>
      <div className="absolute inset-x-0 bottom-0 grid grid-cols-7 text-center text-sm font-medium text-[#71717a]">
        {data.map((item) => <span key={item.label}>{item.label}</span>)}
      </div>
    </div>
  );
}

function BarSummaryChart({ data, currencySettings }: { data: { label: string; value: number; height: number }[]; currencySettings: CurrencySettings }) {
  return (
    <div className="flex h-64 items-end gap-3 border-b border-dashed border-[#ded6c8] px-2 pb-8">
      {data.map((item) => (
        <div key={item.label} className="flex flex-1 flex-col items-center gap-3">
          <div className="w-full rounded-xl bg-[#0f7f86] shadow-[0_12px_24px_rgba(15,127,134,0.22)]" style={{ height: `${Math.max(22, item.height * 1.55)}px` }} title={formatMoney(item.value, currencySettings)} />
          <span className="text-sm font-medium text-[#71717a]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function PaymentMixCard({ title, value, cashLabel, creditLabel, cashPercent, creditPercent }: { title: string; value: string; cashLabel: string; creditLabel: string; cashPercent: number; creditPercent: number }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-base font-semibold text-[#71717a]">{title}</p>
        <p className="text-4xl font-medium tracking-tight text-[#050505]">{value}</p>
      </div>
      <div className="border-t border-[#ebe5d9] pt-5">
        <div className="mb-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div><p className="font-semibold text-[#161616]">{cashLabel}</p><p className="mt-1 text-4xl font-medium">{cashPercent}%</p></div>
          <div className="rounded-full border border-[#e5dfd2] bg-white px-3 py-2 text-sm font-medium text-[#71717a] shadow-sm">VS</div>
          <div className="text-right"><p className="font-semibold text-[#161616]">{creditLabel}</p><p className="mt-1 text-4xl font-medium">{creditPercent}%</p></div>
        </div>
        <div className="grid grid-cols-[1fr_0.4fr] gap-3">
          <div className="h-4 rounded-full bg-[#7c3aed]" style={{ width: `${Math.max(cashPercent, 8)}%` }} />
          <div className="h-4 rounded-full bg-[#db2777]" style={{ width: `${Math.max(creditPercent, 8)}%` }} />
        </div>
      </div>
    </div>
  );
}

function InventoryArc({
  lowStock,
  products,
  productsLabel,
  lowStockLabel,
  alertsLabel
}: {
  lowStock: number;
  products: number;
  productsLabel: string;
  lowStockLabel: string;
  alertsLabel: string;
}) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-5">
      <div className="relative h-44 w-72 overflow-hidden">
        <div className="absolute left-8 top-8 h-40 w-56 rounded-t-full border-[34px] border-b-0 border-[#0f7f86]" />
        <div className="absolute right-11 top-14 h-28 w-28 rounded-full border-[28px] border-transparent border-r-[#db2777] rotate-[-28deg]" />
        <div className="absolute right-8 top-[86px] h-20 w-20 rounded-full border-[24px] border-transparent border-r-[#7c3aed] rotate-[-10deg]" />
        <div className="absolute right-11 bottom-4 h-12 w-12 rounded-full bg-[#facc15]" />
      </div>
      <div className="flex flex-wrap justify-center gap-4 text-sm font-semibold text-[#3f3f46]">
        <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-[#0f7f86]" /> {productsLabel} {products}</span>
        <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-[#db2777]" /> {lowStockLabel} {lowStock}</span>
        <span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-[#facc15]" /> {alertsLabel}</span>
      </div>
    </div>
  );
}

function FunnelChart({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="h-64 pt-5">
      <div className="grid grid-cols-4 border-b border-l border-[#e5dfd2]">
        {labels.map((label, index) => (
          <div key={label} className="min-w-0 border-r border-[#e5dfd2] px-5">
            <p className="truncate text-base font-medium text-[#3f3f46]">{label}</p>
            <p className="mt-1 text-2xl font-medium text-[#050505]">{values[index].toLocaleString('en-US')}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid h-28 grid-cols-4 items-end overflow-hidden rounded-b-2xl bg-[#eef0ff]">
        {values.map((value, index) => (
          <div key={index} className="border-r border-[#c9d0ff] bg-[#4f46e5]/20" style={{ height: `${Math.max(18, (value / max) * 100)}%` }}>
            <div className="h-1 rounded-full bg-[#4338ca]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FullScreenReport({ title, closeLabel, onClose, children }: { title: string; closeLabel: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#f4f1ea]/96 p-3 backdrop-blur-2xl sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="sticky top-3 z-10 flex flex-col gap-3 rounded-[1.5rem] border border-[#e5dfd2] bg-white/92 p-4 shadow-[0_18px_50px_rgba(15,15,15,0.08)] backdrop-blur-2xl sm:top-4 sm:flex-row sm:items-center sm:justify-between sm:rounded-[2rem]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#8a6a16]">MatMax Report</p>
            <h2 className="mt-1 text-2xl font-black text-[#050505] sm:text-3xl">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#050505] px-4 py-3 text-sm font-black text-white transition hover:bg-[#1f1f1f] sm:w-auto">
            <X size={18} />
            {closeLabel}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SalesTable({ ventas, t, currencySettings, isSeller = false }: { ventas: Venta[]; t: typeof reportsCopy.es | typeof reportsCopy.en; currencySettings: CurrencySettings; isSeller?: boolean }) {
  return (
    <Card className="overflow-hidden border-[#e5dfd2] bg-white/92 shadow-[0_22px_65px_rgba(15,15,15,0.06)] backdrop-blur-2xl">
      <CardHeader><h2 className="text-xl font-black text-[#050505] sm:text-2xl">{t.periodSales}</h2></CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-[1.5rem] border border-[#f1ebdf] bg-[#fffdf8]/90 shadow-inner">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-[#e9e2d3] bg-[#fbfaf7]/95 backdrop-blur-xl">
              <tr>
                {(isSeller
                  ? [t.sale, t.date, t.client, t.payment, t.status]
                  : [t.sale, t.date, t.client, t.payment, t.status, t.discount, t.total, t.pending]
                ).map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1ebdf]">
              {ventas.map((venta) => (
                <tr key={venta.id} className="transition-all duration-300 hover:bg-[#fff9e8]/80">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full border border-[#e9e2d3] bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#8a6a16] shadow-sm">
                      V-{String(venta.id).padStart(4, '0')}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#71717a]">{venta.fecha}</td>
                  <td className="max-w-[240px] truncate px-4 py-3 font-semibold text-[#71717a]">{getClientName(venta.clientes, t.generalClient)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${venta.tipo_pago === 'Contado' ? 'bg-[#050505] text-[#f4c542]' : 'bg-[#fff4c7] text-[#8a6a16]'}`}>{venta.tipo_pago === 'Contado' ? t.cash : t.credit}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${isCancelledSale(venta) ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{isCancelledSale(venta) ? t.cancelled : t.active}</span></td>
                  {!isSeller && (
                    <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-red-600">-{formatMoney(getSaleDiscountAmount(venta), currencySettings)}</td>
                  )}
                  {!isSeller && (
                    <td className={`whitespace-nowrap px-4 py-3 font-black tabular-nums ${isCancelledSale(venta) ? 'text-red-600 line-through' : 'text-[#8a6a16]'}`}>{isCancelledSale(venta) ? `-${formatMoney(venta.total, currencySettings)}` : formatMoney(venta.total, currencySettings)}</td>
                  )}
                  {!isSeller && (
                    <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-red-600">{formatMoney(venta.saldo_pendiente, currencySettings)}</td>
                  )}
                  {isSeller && (
                    // For seller, don't show discount, only show total in correct place.
                    <></>
                  )}
                  {isSeller && (
                    <td className={`whitespace-nowrap px-4 py-3 font-black tabular-nums ${isCancelledSale(venta) ? 'text-red-600 line-through' : 'text-[#8a6a16]'}`}>{isCancelledSale(venta) ? `-${formatMoney(venta.total, currencySettings)}` : formatMoney(venta.total, currencySettings)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {ventas.length === 0 && <div className="border-t border-[#f1ebdf] bg-[#fbfaf7] py-12 text-center font-semibold text-[#71717a]">{t.noSalesPeriod}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductsReport({ productosMasVendidos, productosBajoStock, t, currencySettings }: { productosMasVendidos: { nombre: string; cantidad: number; total: number }[]; productosBajoStock: Producto[]; t: typeof reportsCopy.es | typeof reportsCopy.en; currencySettings: CurrencySettings }) {
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card className="overflow-hidden border-[#e5dfd2] bg-white/92 shadow-[0_22px_65px_rgba(15,15,15,0.06)] backdrop-blur-2xl"><CardHeader><h2 className="text-xl font-black text-[#050505] sm:text-2xl">{t.topProducts}</h2></CardHeader><CardContent><div className="space-y-3">{productosMasVendidos.map((producto, index) => <div key={producto.nombre} className="flex items-center justify-between rounded-2xl border border-[#f1ebdf] bg-[#fffdf8] p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_34px_rgba(15,15,15,0.06)]"><div className="min-w-0 flex-1"><p className="truncate font-black text-[#050505]">#{index + 1} {producto.nombre}</p><p className="text-sm font-medium text-[#71717a]">{t.quantitySold}: {producto.cantidad.toLocaleString('en-US')}</p></div><p className="max-w-[45%] shrink-0 break-words text-right font-black tabular-nums text-[#8a6a16]">{formatMoney(producto.total, currencySettings)}</p></div>)}{productosMasVendidos.length === 0 && <div className="rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] py-8 text-center font-semibold text-[#71717a]">{t.noProductSales}</div>}</div></CardContent></Card>
      <Card className="overflow-hidden border-[#e5dfd2] bg-white/92 shadow-[0_22px_65px_rgba(15,15,15,0.06)] backdrop-blur-2xl"><CardHeader><h2 className="text-xl font-black text-[#050505] sm:text-2xl">{t.lowStockInventory}</h2></CardHeader><CardContent><div className="space-y-3">{productosBajoStock.map((producto) => <div key={producto.id} className="flex items-center justify-between rounded-2xl border border-[#f1ebdf] bg-[#fffdf8] p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_34px_rgba(15,15,15,0.06)]"><div className="min-w-0 flex-1"><p className="truncate font-black text-[#050505]">{producto.nombre}</p><p className="text-sm font-medium text-[#71717a]">{t.minimum}: {Number(producto.minimo || 0).toLocaleString('en-US')}</p></div><p className="rounded-full bg-red-100 px-3 py-1 text-sm font-black text-red-700">{t.stock}: {Number(producto.stock || 0).toLocaleString('en-US')}</p></div>)}{productosBajoStock.length === 0 && <div className="rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] py-8 text-center font-semibold text-[#71717a]">{t.noLowStock}</div>}</div></CardContent></Card>
    </div>
  );
}

function ClientsTable({ clientesConDeuda, t, currencySettings }: { clientesConDeuda: Cliente[]; t: typeof reportsCopy.es | typeof reportsCopy.en; currencySettings: CurrencySettings }) {
  return (
    <Card className="overflow-hidden border-[#e5dfd2] bg-white/92 shadow-[0_22px_65px_rgba(15,15,15,0.06)] backdrop-blur-2xl"><CardHeader><h2 className="text-xl font-black text-[#050505] sm:text-2xl">{t.clientsWithPendingBalance}</h2></CardHeader><CardContent><div className="overflow-x-auto rounded-[1.5rem] border border-[#f1ebdf] bg-[#fffdf8]/90 shadow-inner"><table className="w-full min-w-[860px]"><thead className="border-b border-[#e9e2d3] bg-[#fbfaf7]/95 backdrop-blur-xl"><tr>{[t.client, t.phone, t.limit, t.balance].map((header) => <th key={header} className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{header}</th>)}</tr></thead><tbody className="divide-y divide-[#f1ebdf]">{clientesConDeuda.map((cliente) => <tr key={cliente.id} className="transition hover:bg-[#fff9e8]/80"><td className="max-w-[260px] truncate px-4 py-3 font-black text-[#050505]">{cliente.nombre}</td><td className="px-4 py-3 font-semibold text-[#71717a]">{formatPhone(cliente.telefono)}</td><td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-[#71717a]">{formatMoney(cliente.limite_credito, currencySettings)}</td><td className="whitespace-nowrap px-4 py-3 font-bold tabular-nums text-red-600">{formatMoney(cliente.saldo, currencySettings)}</td></tr>)}</tbody></table>{clientesConDeuda.length === 0 && <div className="border-t border-[#f1ebdf] bg-[#fbfaf7] py-12 text-center font-semibold text-[#71717a]">{t.noDebtClients}</div>}</div></CardContent></Card>
  );
}

function PaymentsTable({ pagos, t, currencySettings }: { pagos: Pago[]; t: typeof reportsCopy.es | typeof reportsCopy.en; currencySettings: CurrencySettings }) {
  return (
    <Card className="overflow-hidden border-[#e5dfd2] bg-white/92 shadow-[0_22px_65px_rgba(15,15,15,0.06)] backdrop-blur-2xl">
      <CardHeader>
        <h2 className="text-xl font-black text-[#050505] sm:text-2xl">{t.paymentsReceived}</h2>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-[1.5rem] border border-[#f1ebdf] bg-[#fffdf8]/90 shadow-inner">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-[#e9e2d3] bg-[#fbfaf7]/95 backdrop-blur-xl">
              <tr>
                {[t.sale, t.date, t.client, t.transactionType, t.amount].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1ebdf]">
              {pagos.map((pago) => {
                const hasLinkedSale = Boolean(pago.venta_id);

                return (
                  <tr key={pago.id} className="transition hover:bg-[#fff9e8]/80">
                    <td className="px-4 py-3">
                      {hasLinkedSale ? (
                        <span className="inline-flex items-center rounded-full border border-[#e9e2d3] bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#8a6a16] shadow-sm">
                          V-{String(pago.venta_id).padStart(4, '0')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-[#e9e2d3] bg-[#fbfaf7] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#71717a] shadow-sm">
                          {t.creditLabel}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#71717a]">{pago.fecha}</td>
                    <td className="max-w-[260px] truncate px-4 py-3 font-black text-[#050505]">{getPaymentClientName(pago, t.generalClient)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${hasLinkedSale ? 'bg-emerald-50 text-emerald-700' : 'bg-[#fff4c7] text-[#8a6a16]'}`}>
                        {hasLinkedSale ? t.paymentBySale : t.creditPayment}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-black tabular-nums text-[#8a6a16]">{formatMoney(pago.monto, currencySettings)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pagos.length === 0 && (
            <div className="border-t border-[#f1ebdf] bg-[#fbfaf7] py-12 text-center font-semibold text-[#71717a]">
              {t.noPaymentsPeriod}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`min-w-[120px] flex-1 rounded-[1.25rem] px-4 py-2.5 text-sm font-black transition-all duration-300 sm:flex-none sm:px-5 ${active ? 'bg-[#050505] text-[#f4c542] shadow-[0_14px_34px_rgba(0,0,0,0.22)]' : 'border border-[#e9e2d3]/80 bg-white/80 text-[#71717a] hover:-translate-y-0.5 hover:border-[#f4c542]/40 hover:bg-[#fff9e8] hover:text-[#050505]'}`}>{children}</button>
  );
}
