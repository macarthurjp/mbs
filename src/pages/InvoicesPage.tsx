import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ElementType } from 'react';
import { Ban, BarChart3, Calendar, CreditCard, Download, Eye, FileText, Printer, Search, ShoppingCart, TrendingUp, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getUserRoleFlags } from '../utils/roles';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { formatPhone, normalizePhoneForLink } from '../utils/formatContact';
import { printCompactReceipt } from '../utils/receiptPrinter';

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
  created_at?: string | null;
  estado?: string | null;
  anulada_at?: string | null;
  anulada_por?: string | null;
  motivo_anulacion?: string | null;
  vendedor_nombre?: string | null;
  vendedor?: string | null;
  cliente_nombre?: string | null;
  recibo_datos?: ReceiptSnapshot | null;
  clientes?: {
    nombre: string;
    telefono: string | null;
    direccion: string | null;
    email?: string | null;
  } | null;
  venta_items?: Array<{
    id?: number | null;
    venta_id?: number | null;
    producto_id?: number | null;
    cantidad: number | null;
    precio: number | null;
    total: number | null;
    productos?: {
      nombre?: string | null;
      unidad?: string | null;
      costo: number | null;
      stock?: number | null;
    } | null;
  }> | null;
};

type ReceiptSnapshotItem = {
  name?: string | null;
  nombre?: string | null;
  quantity?: number | string | null;
  cantidad?: number | string | null;
  unit_price?: number | string | null;
  precio?: number | string | null;
};

type ReceiptSnapshot = Record<string, unknown> & {
  items?: ReceiptSnapshotItem[];
  productos?: ReceiptSnapshotItem[];
};

type VentaItem = {
  id: number;
  venta_id: number | null;
  producto_id: number | null;
  cantidad: number;
  precio: number;
  total: number;
  productos?: {
    nombre: string;
    unidad: string | null;
    stock?: number | null;
  } | null;
};

type Negocio = {
  id: string;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  moneda: string | null;
  moneda_codigo?: string | null;
  moneda_simbolo?: string | null;
  currency_code?: string | null;
  currency_symbol?: string | null;
  simbolo?: string | null;
  logo_url: string | null;
};


const DEV_FALLBACK_NEGOCIO_ID = '131b6051-b240-4591-87c4-c12ce2c3f794';

const invoicesCopy = {
  es: {
    loading: 'Cargando facturas...',
    missingTitle: 'Usuario sin negocio asignado',
    missingText: 'El login funciona, pero este usuario todavía no existe en la tabla usuarios o no tiene un negocio_id asignado.',
    title: 'Facturas',
    subtitle: 'Consulta, envía y descarga facturas; imprime recibos compactos',
    sellerSubtitle: 'Consulta solo tus facturas y ventas propias',
    refresh: 'Actualizar',
    invoices: 'Facturas',
    totalBilled: 'Total Facturado',
    business: 'Negocio',
    activeInvoices: 'Facturas activas',
    cancelledInvoices: 'Facturas anuladas',
    cashTotal: 'Total contado',
    creditTotal: 'Total crédito',
    averageInvoice: 'Promedio factura',
    pendingCredit: 'Crédito pendiente',
    grossProfit: 'Ganancia bruta',
    monthlySummary: 'Resumen mensual',
    monthlySummaryText: 'Ingresos activos por mes seleccionado',
    exportCsv: 'Exportar CSV',
    printList: 'Imprimir listado',
    sortBy: 'Ordenar por',
    sortNewest: 'Fecha reciente',
    sortOldest: 'Fecha antigua',
    sortHighest: 'Mayor monto',
    sortLowest: 'Menor monto',
    sellerFilter: 'Vendedor',
    allSellers: 'Todos los vendedores',
    quickFilters: 'Filtros rápidos',
    today: 'Hoy',
    thisWeek: 'Esta semana',
    thisMonth: 'Este mes',
    allInvoices: 'Todas',
    previous: 'Anterior',
    next: 'Siguiente',
    page: 'Página',
    searchPlaceholder: 'Buscar por número, cliente, fecha o tipo de pago...',
    history: 'Historial de facturas',
    availableSales: 'ventas disponibles para facturar',
    invoice: 'Factura',
    date: 'Fecha',
    time: 'Hora',
    seller: 'Vendedor',
    subtotal: 'Subtotal',
    discount: 'Descuento',
    client: 'Cliente',
    clientFallback: 'Cliente',
    payment: 'Pago',
    total: 'Total',
    actions: 'Acciones',
    status: 'Estado',
    cancel: 'Cancelar',
    generalClient: 'Cliente general',
    cash: 'Contado',
    credit: 'Crédito',
    view: 'Ver',
    noInvoices: 'No se encontraron facturas',
    printReceipt: 'Imprimir recibo',
    sendEmail: 'Enviar Email',
    whatsapp: 'WhatsApp',
    downloadPdf: 'Descargar PDF',
    salesInvoice: 'Factura de venta',
    phone: 'Tel',
    pendingBalance: 'Saldo pendiente',
    loadingDetail: 'Cargando detalle...',
    product: 'Producto',
    deletedProduct: 'Producto eliminado',
    quantity: 'Cantidad',
    price: 'Precio',
    thanks: 'Gracias por su compra.',
    loadError: 'Error al cargar las facturas',
    detailError: 'Error al cargar el detalle de factura',
    printBlocked: 'El navegador bloqueó la ventana de impresión',
    noSelectedInvoice: 'No hay factura seleccionada',
    pdfPrepareError: 'No se pudo preparar la factura para PDF',
    renderError: 'No se pudo renderizar la factura',
    noClientEmail: 'Este cliente no tiene email registrado',
    functionError: 'Error ejecutando Edge Function',
    sendInvoiceError: 'No se pudo enviar la factura',
    emailSuccess: 'Factura enviada por email correctamente',
    sendingEmailError: 'Error enviando factura por email',
    prepareInvoiceError: 'No se pudo preparar la factura',
    whatsappSuccess: 'Factura preparada para WhatsApp',
    whatsappError: 'Error preparando factura para WhatsApp',
    whatsappHello: 'Hola',
    whatsappIntro: 'Te compartimos la factura',
    whatsappFrom: 'de',
    downloadInvoice: 'Descargar factura',
    downloadError: 'No se pudo descargar la factura en PDF',
    amountReceived: 'Monto recibido',
    paymentCurrency: 'Moneda recibida',
    exchangeRate: 'Tasa',
    creditUsed: 'Crédito usado',
    appliedToDebt: 'Aplicado a la cuenta',
    remainingDebt: 'Deuda restante',
    creditBalance: 'Crédito a favor',
    change: 'Cambio',
    systemPos: 'Sistema POS',
    active: 'Activa',
    cancelled: 'Anulada',
    cancelInvoice: 'Anular factura',
    cancelTitle: 'Anular factura',
    cancelReasonLabel: 'Motivo de anulación',
    cancelReasonPlaceholder: 'Ej. Error en la venta, cliente equivocado, monto incorrecto...',
    cancelConfirm: 'Confirmar anulación',
    canceling: 'Anulando...',
    cancelWarning: 'Esta acción marcará la factura como anulada. No se podrá imprimir ni enviar como factura válida.',
    cancelReasonRequired: 'El motivo de anulación es obligatorio',
    cancelSuccess: 'Factura anulada correctamente',
    cancelError: 'Error al anular la factura',
    cancelledAt: 'Anulada el',
    cancelledReason: 'Motivo',
  },
  en: {
    loading: 'Loading invoices...',
    missingTitle: 'User has no assigned business',
    missingText: 'Login works, but this user does not exist in the usuarios table yet or does not have an assigned negocio_id.',
    title: 'Invoices',
    subtitle: 'View, send, and download invoices; print compact receipts',
    sellerSubtitle: 'View only your own invoices and sales',
    refresh: 'Refresh',
    invoices: 'Invoices',
    totalBilled: 'Total Billed',
    business: 'Business',
    activeInvoices: 'Active invoices',
    cancelledInvoices: 'Cancelled invoices',
    cashTotal: 'Cash total',
    creditTotal: 'Credit total',
    averageInvoice: 'Average invoice',
    pendingCredit: 'Pending credit',
    grossProfit: 'Gross profit',
    monthlySummary: 'Monthly summary',
    monthlySummaryText: 'Active revenue for selected month',
    exportCsv: 'Export CSV',
    printList: 'Print list',
    sortBy: 'Sort by',
    sortNewest: 'Newest date',
    sortOldest: 'Oldest date',
    sortHighest: 'Highest amount',
    sortLowest: 'Lowest amount',
    sellerFilter: 'Seller',
    allSellers: 'All sellers',
    quickFilters: 'Quick filters',
    today: 'Today',
    thisWeek: 'This week',
    thisMonth: 'This month',
    allInvoices: 'All',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    searchPlaceholder: 'Search by number, client, date, or payment type...',
    history: 'Invoice history',
    availableSales: 'sales available for invoicing',
    invoice: 'Invoice',
    date: 'Date',
    time: 'Time',
    seller: 'Seller',
    subtotal: 'Subtotal',
    discount: 'Discount',
    client: 'Client',
    clientFallback: 'Client',
    payment: 'Payment',
    total: 'Total',
    actions: 'Actions',
    status: 'Status',
    cancel: 'Cancel',
    generalClient: 'General client',
    cash: 'Cash',
    credit: 'Credit',
    view: 'View',
    noInvoices: 'No invoices found',
    printReceipt: 'Print receipt',
    sendEmail: 'Send Email',
    whatsapp: 'WhatsApp',
    downloadPdf: 'Download PDF',
    salesInvoice: 'Sales invoice',
    phone: 'Phone',
    pendingBalance: 'Pending balance',
    loadingDetail: 'Loading detail...',
    product: 'Product',
    deletedProduct: 'Deleted product',
    quantity: 'Quantity',
    price: 'Price',
    thanks: 'Thank you for your purchase.',
    loadError: 'Error loading invoices',
    detailError: 'Error loading invoice details',
    printBlocked: 'The browser blocked the print window',
    noSelectedInvoice: 'No invoice selected',
    pdfPrepareError: 'Could not prepare the invoice for PDF',
    renderError: 'Could not render the invoice',
    noClientEmail: 'This client has no registered email',
    functionError: 'Error executing Edge Function',
    sendInvoiceError: 'Could not send the invoice',
    emailSuccess: 'Invoice sent by email successfully',
    sendingEmailError: 'Error sending invoice by email',
    prepareInvoiceError: 'Could not prepare the invoice',
    whatsappSuccess: 'Invoice prepared for WhatsApp',
    whatsappError: 'Error preparing invoice for WhatsApp',
    whatsappHello: 'Hello',
    whatsappIntro: 'We are sharing invoice',
    whatsappFrom: 'from',
    downloadInvoice: 'Download invoice',
    downloadError: 'Could not download the invoice as PDF',
    amountReceived: 'Amount received',
    paymentCurrency: 'Payment currency',
    exchangeRate: 'Rate',
    creditUsed: 'Credit used',
    appliedToDebt: 'Applied to account',
    remainingDebt: 'Remaining debt',
    creditBalance: 'Credit balance',
    change: 'Change',
    systemPos: 'POS System',
    active: 'Active',
    cancelled: 'Cancelled',
    cancelInvoice: 'Cancel invoice',
    cancelTitle: 'Cancel invoice',
    cancelReasonLabel: 'Cancellation reason',
    cancelReasonPlaceholder: 'Ex. Wrong sale, wrong customer, incorrect amount...',
    cancelConfirm: 'Confirm cancellation',
    canceling: 'Cancelling...',
    cancelWarning: 'This action will mark the invoice as cancelled. It cannot be printed or sent as a valid invoice.',
    cancelReasonRequired: 'Cancellation reason is required',
    cancelSuccess: 'Invoice cancelled successfully',
    cancelError: 'Error cancelling invoice',
    cancelledAt: 'Cancelled at',
    cancelledReason: 'Reason',
  },
} as const;

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
  return CURRENCY_SYMBOLS[code] || code || '$';
}

function getCurrencyFromBusiness(negocio: Negocio | null) {
  const rawCode =
    negocio?.moneda_codigo ||
    negocio?.currency_code ||
    negocio?.moneda ||
    'USD';

  const code = String(rawCode || 'USD').trim().toUpperCase();
  const rawSymbol =
    negocio?.moneda_simbolo ||
    negocio?.currency_symbol ||
    negocio?.simbolo;

  return String(rawSymbol || getCurrencySymbol(code)).trim() || getCurrencySymbol(code);
}

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getVentaSubtotal(items: VentaItem[], venta?: Venta | null) {
  const itemsSubtotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  return itemsSubtotal > 0 ? itemsSubtotal : Number(venta?.total || 0);
}

function getVentaDiscount(items: VentaItem[], venta?: Venta | null) {
  const subtotal = getVentaSubtotal(items, venta);
  const total = Number(venta?.total || 0);
  const amount = Math.max(0, subtotal - total);
  const percent = subtotal > 0 ? (amount / subtotal) * 100 : 0;

  return { subtotal, amount, percent };
}

function getSnapshotString(snapshot: ReceiptSnapshot | null | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = snapshot?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function getSnapshotNumber(snapshot: ReceiptSnapshot | null | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = snapshot?.[key];
    if (value === null || value === undefined || value === '') continue;
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }
  return null;
}

function getSnapshotItems(snapshot: ReceiptSnapshot | null | undefined) {
  const rawItems = Array.isArray(snapshot?.items)
    ? snapshot.items
    : Array.isArray(snapshot?.productos)
      ? snapshot.productos
      : [];

  return rawItems
    .map((item) => ({
      name: String(item.name || item.nombre || '').trim(),
      quantity: Number(item.quantity ?? item.cantidad ?? 0),
      unitPrice: Number(item.unit_price ?? item.precio ?? 0),
    }))
    .filter((item) => item.name && Number.isFinite(item.quantity) && item.quantity > 0 && Number.isFinite(item.unitPrice));
}

function getVentaClientName(venta: Venta | null | undefined, fallback: string) {
  return (
    venta?.cliente_nombre?.trim() ||
    getSnapshotString(venta?.recibo_datos, 'client_name', 'cliente_nombre') ||
    venta?.clientes?.nombre ||
    fallback
  );
}

function getVentaTime(venta: Venta | null | undefined, locale: string) {
  const source = venta?.created_at || venta?.fecha;
  if (!source) return '-';

  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getVentaSeller(venta: Venta | null | undefined, fallback: string) {
  return (
    venta?.vendedor_nombre ||
    venta?.vendedor ||
    fallback
  );
}

function getVentaDiscountAmount(venta: Venta | null | undefined) {
  return Number(venta?.descuento_monto ?? venta?.descuento ?? 0);
}

function getLocalDateString(date: Date) {
  return date.toLocaleDateString('en-CA');
}


function getStartOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return getLocalDateString(copy);
}

function getPendingInvoiceIdFromNavigation() {
  const params = new URLSearchParams(window.location.search);
  const urlInvoiceId = params.get('invoiceId');
  const urlSaleId = params.get('sale') || params.get('id') || params.get('venta');
  const storedInvoiceId = sessionStorage.getItem('matmax_pending_invoice_id');
  const storedSaleId = sessionStorage.getItem('matmax_open_invoice_sale');

  return urlInvoiceId || urlSaleId || storedInvoiceId || storedSaleId;
}

function formatInvoiceCode(id: number) {
  return `FAC-${id.toString().padStart(6, '0')}`;
}

function getInvoiceGrossProfit(venta: Venta | null | undefined, costMap: Map<number, number>) {
  return (venta?.venta_items || []).reduce((sum, item) => {
    const total = Number(item.total ?? Number(item.cantidad || 0) * Number(item.precio || 0));
    const cost = (costMap.get(item.producto_id || -1) ?? 0) * Number(item.cantidad || 0);
    return sum + (total - cost);
  }, 0);
}

export default function InvoicesPage() {
  const { user, userProfile } = useAuth();
  const { showToast } = useNotification();

  const { language } = useLanguage();
  const t = invoicesCopy[language];

  const loggedUserName =
    userProfile?.nombre ||
    userProfile?.name ||
    userProfile?.full_name ||
    userProfile?.fullName ||
    user?.email ||
    'Usuario';
  const roleFlags = getUserRoleFlags(userProfile);
  const isSeller = roleFlags.isSeller;
  const canManageFinancials = roleFlags.canManageFinancials;
  const canManageInvoices = roleFlags.isOwner || roleFlags.isAdmin || roleFlags.isSuperAdmin;
  const canViewProfit = roleFlags.isOwner;

  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [filteredVentas, setFilteredVentas] = useState<Venta[]>([]);
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [ventaItems, setVentaItems] = useState<VentaItem[]>([]);
  const [productCosts, setProductCosts] = useState<Map<number, number>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'Contado' | 'Crédito'>('all');
  const [sellerFilter, setSellerFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedMonth, setSelectedMonth] = useState(getLocalDateString(new Date()).slice(0, 7));
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInvoiceModalVisible, setIsInvoiceModalVisible] = useState(false);
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelingInvoice, setCancelingInvoice] = useState(false);
  const [missingNegocio, setMissingNegocio] = useState(false);
  const rowsPerPage = 12;
  const autoOpenInvoiceRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      sessionStorage.removeItem('matmax_pending_invoice_id');
      sessionStorage.removeItem('matmax_open_invoice_sale');

      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('invoiceId');
      currentUrl.searchParams.delete('sale');
      currentUrl.searchParams.delete('id');
      currentUrl.searchParams.delete('venta');
      window.history.replaceState({}, '', currentUrl.toString());
    };
  }, []);

  useEffect(() => {
    const readInvoiceId = () => {
      setPendingInvoiceId(getPendingInvoiceIdFromNavigation());
    };

    const handleOpenInvoiceEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ invoiceId?: number | string }>;
      const invoiceId = customEvent.detail?.invoiceId;

      if (invoiceId) {
        setPendingInvoiceId(String(invoiceId));
        return;
      }

      readInvoiceId();
    };

    readInvoiceId();
    window.addEventListener('popstate', readInvoiceId);
    window.addEventListener('matmax:open-invoice', handleOpenInvoiceEvent);

    return () => {
      window.removeEventListener('popstate', readInvoiceId);
      window.removeEventListener('matmax:open-invoice', handleOpenInvoiceEvent);
    };
  }, []);

  useEffect(() => {
    const search = searchTerm.toLowerCase().trim();
    const today = getLocalDateString(new Date());
    const startOfWeek = getStartOfWeek(new Date());
    const activeMonth = selectedMonth;

    const filtered = ventas.filter((venta) => {
      const matchesSearch =
        venta.id.toString().includes(search) ||
        venta.fecha.includes(search) ||
        (venta.tipo_pago || '').toLowerCase().includes(search) ||
        getVentaClientName(venta, t.generalClient).toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !isCancelledInvoice(venta)) ||
        (statusFilter === 'cancelled' && isCancelledInvoice(venta));

      const matchesPayment = paymentFilter === 'all' || venta.tipo_pago === paymentFilter;
      const sellerName = getVentaSeller(venta, loggedUserName);
      const matchesSeller = sellerFilter === 'all' || sellerName === sellerFilter;

      const matchesDate =
        dateFilter === 'all' ||
        (dateFilter === 'today' && venta.fecha === today) ||
        (dateFilter === 'week' && venta.fecha >= startOfWeek && venta.fecha <= today) ||
        (dateFilter === 'month' && venta.fecha.startsWith(activeMonth));

      return matchesSearch && matchesStatus && matchesPayment && matchesSeller && matchesDate;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'oldest') {
        return String(a.created_at || a.fecha).localeCompare(String(b.created_at || b.fecha));
      }

      if (sortBy === 'highest') {
        return Number(b.total || 0) - Number(a.total || 0);
      }

      if (sortBy === 'lowest') {
        return Number(a.total || 0) - Number(b.total || 0);
      }

      return String(b.created_at || b.fecha).localeCompare(String(a.created_at || a.fecha));
    });

    setFilteredVentas(sorted);
    setCurrentPage(1);
  }, [searchTerm, ventas, t.generalClient, statusFilter, paymentFilter, sellerFilter, sortBy, dateFilter, selectedMonth, loggedUserName]);

  function isCancelledInvoice(venta: Venta | null | undefined) {
    return venta?.estado === 'anulada' || venta?.estado === 'cancelled';
  }

  const totalFacturado = useMemo(() => {
    return ventas
      .filter((venta) => !isCancelledInvoice(venta))
      .reduce((sum, venta) => sum + Number(venta.total || 0), 0);
  }, [ventas]);

  const invoiceMetrics = useMemo(() => {
    const activeVentas = ventas.filter((venta) => !isCancelledInvoice(venta));
    const cancelledVentas = ventas.filter((venta) => isCancelledInvoice(venta));
    const cashTotal = activeVentas
      .filter((venta) => venta.tipo_pago === 'Contado')
      .reduce((sum, venta) => sum + Number(venta.total || 0), 0);
    const creditTotal = activeVentas
      .filter((venta) => venta.tipo_pago === 'Crédito')
      .reduce((sum, venta) => sum + Number(venta.total || 0), 0);
    const averageInvoice = activeVentas.length > 0 ? totalFacturado / activeVentas.length : 0;
    const pendingCredit = activeVentas
      .filter((venta) => venta.tipo_pago === 'Crédito')
      .reduce((sum, venta) => sum + Number(venta.saldo_pendiente || 0), 0);
    const grossProfit = activeVentas.reduce((sum, venta) => sum + getInvoiceGrossProfit(venta, productCosts), 0);

    return {
      activeCount: activeVentas.length,
      cancelledCount: cancelledVentas.length,
      cashTotal,
      creditTotal,
      averageInvoice,
      pendingCredit,
      grossProfit
    };
  }, [ventas, totalFacturado, productCosts]);

  const sellers = useMemo(() => {
    return Array.from(new Set(ventas.map((venta) => getVentaSeller(venta, loggedUserName)).filter(Boolean))).sort();
  }, [ventas, loggedUserName]);

  const monthlySummary = useMemo(() => {
    const monthVentas = ventas.filter((venta) => !isCancelledInvoice(venta) && venta.fecha.startsWith(selectedMonth));
    const total = monthVentas.reduce((sum, venta) => sum + Number(venta.total || 0), 0);
    const cash = monthVentas
      .filter((venta) => venta.tipo_pago === 'Contado')
      .reduce((sum, venta) => sum + Number(venta.total || 0), 0);
    const credit = monthVentas
      .filter((venta) => venta.tipo_pago === 'Crédito')
      .reduce((sum, venta) => sum + Number(venta.total || 0), 0);
    const pending = monthVentas.reduce((sum, venta) => sum + Number(venta.saldo_pendiente || 0), 0);
    const max = Math.max(total, cash, credit, pending, 1);

    return {
      total,
      items: [
        {
          label: t.totalBilled,
          value: total,
          height: Math.max(8, (total / max) * 100),
          barClass: 'bg-[#fff4c7] border border-[#f4c542]/30',
          labelClass: 'text-[#8a6a16]',
          valueClass: 'text-[#8a6a16]'
        },
        {
          label: t.cashTotal,
          value: cash,
          height: Math.max(8, (cash / max) * 100),
          barClass: 'bg-green-50 border border-green-200',
          labelClass: 'text-green-700',
          valueClass: 'text-green-700'
        },
        {
          label: t.creditTotal,
          value: credit,
          height: Math.max(8, (credit / max) * 100),
          barClass: 'bg-blue-50 border border-blue-200',
          labelClass: 'text-blue-700',
          valueClass: 'text-blue-700'
        },
        {
          label: t.pendingCredit,
          value: pending,
          height: Math.max(8, (pending / max) * 100),
          barClass: 'bg-red-50 border border-red-200',
          labelClass: 'text-red-700',
          valueClass: 'text-red-700'
        }
      ]
    };
  }, [ventas, selectedMonth, t.totalBilled, t.cashTotal, t.creditTotal, t.pendingCredit]);

  const totalPages = Math.max(1, Math.ceil(filteredVentas.length / rowsPerPage));
  const visibleVentas = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredVentas.slice(start, start + rowsPerPage);
  }, [filteredVentas, currentPage]);

  const money = useCallback((value: number | null | undefined) => {
    return `${getCurrencyFromBusiness(negocio)} ${formatNumber(value)}`;
  }, [negocio]);

  const selectedInvoiceTotal = useMemo(() => {
    return money(selectedVenta?.total || 0);
  }, [selectedVenta, money]);

  const selectedInvoiceDiscount = useMemo(() => {
    return getVentaDiscount(ventaItems, selectedVenta);
  }, [ventaItems, selectedVenta]);

  const resolveNegocioId = useCallback(async () => {
    if (userProfile?.negocio_id) return userProfile.negocio_id;
    if (negocioId) return negocioId;
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('usuarios')
      .select('negocio_id')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('Could not read negocio_id from usuarios:', error);
    }

    if (data?.negocio_id) return data.negocio_id;

    if (user.id === 'b8b43117-96c4-4820-877a-74acc5619c2b') {
      return DEV_FALLBACK_NEGOCIO_ID;
    }

    return null;
  }, [negocioId, user?.id, userProfile?.negocio_id]);

  const loadInvoicesData = useCallback(async () => {
    try {
      setLoading(true);

      if (!user) {
        setVentas([]);
        setFilteredVentas([]);
        setMissingNegocio(false);
        return;
      }

      const currentNegocioId = await resolveNegocioId();
      setNegocioId(currentNegocioId);

      if (!currentNegocioId) {
        setVentas([]);
        setFilteredVentas([]);
        setMissingNegocio(true);
        return;
      }

      let ventasQuery = supabase
        .from('ventas')
        .select('*, clientes(nombre, telefono, direccion, email), venta_items(id, venta_id, producto_id, cantidad, precio, total, productos(nombre, unidad, stock))')
        .eq('negocio_id', currentNegocioId);

      if (isSeller && user.id) {
        ventasQuery = ventasQuery.eq('vendedor_id', user.id);
      }

      const [ventasResult, negocioResult, costMapResult] = await Promise.all([
        ventasQuery.order('created_at', { ascending: false }),
        supabase
          .from('negocios')
          .select('*')
          .eq('id', currentNegocioId)
          .maybeSingle(),
        roleFlags.isOwner
          ? supabase.rpc('get_productos_for_business', { p_negocio_id: currentNegocioId })
          : Promise.resolve({ data: [], error: null })
      ]);

      if (ventasResult.error) throw ventasResult.error;
      if (negocioResult.error) throw negocioResult.error;
      if (costMapResult.error) throw costMapResult.error;

      setVentas((ventasResult.data || []) as unknown as Venta[]);
      setFilteredVentas((ventasResult.data || []) as unknown as Venta[]);
      setNegocio((negocioResult.data || null) as unknown as Negocio | null);
      setProductCosts(new Map(
        ((costMapResult.data || []) as { id: number; costo: number | null }[]).map((row) => [row.id, Number(row.costo || 0)])
      ));
      setMissingNegocio(false);

      const invoiceId = getPendingInvoiceIdFromNavigation();
      if (invoiceId && autoOpenInvoiceRef.current !== String(invoiceId)) {
        autoOpenInvoiceRef.current = String(invoiceId);
        setPendingInvoiceId(String(invoiceId));
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      showToast(t.loadError, 'error');
    } finally {
      setLoading(false);
    }
  }, [isSeller, resolveNegocioId, roleFlags.isOwner, showToast, t.loadError, user]);

  const openInvoice = useCallback(async (venta: Venta) => {
    try {
      setSelectedVenta(venta);
      setVentaItems([]);
      setIsInvoiceModalVisible(false);
      setIsModalOpen(true);
      setLoadingItems(true);

      window.requestAnimationFrame(() => {
        setIsInvoiceModalVisible(true);
      });

      setPendingInvoiceId(null);
      autoOpenInvoiceRef.current = String(venta.id);
      sessionStorage.removeItem('matmax_pending_invoice_id');
      sessionStorage.removeItem('matmax_open_invoice_sale');

      // Remove invoiceId and related params from URL so invoice doesn't reopen by default on return
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('invoiceId');
      currentUrl.searchParams.delete('sale');
      currentUrl.searchParams.delete('id');
      currentUrl.searchParams.delete('venta');
      window.history.replaceState({}, '', currentUrl.toString());

      const { data, error } = await supabase
        .from('venta_items')
        .select('id, venta_id, producto_id, cantidad, precio, total, productos(nombre, unidad, stock)')
        .eq('venta_id', venta.id);

      if (error) throw error;

      setVentaItems((data || []) as unknown as VentaItem[]);
    } catch (error) {
      console.error('Error loading invoice items:', error);
      showToast(t.detailError, 'error');
    } finally {
      setLoadingItems(false);
    }
  }, [showToast, t.detailError]);

  const openInvoiceById = useCallback(async (invoiceId: string) => {
    const matchedVenta = ventas.find((venta) => String(venta.id) === String(invoiceId));

    if (matchedVenta) {
      await openInvoice(matchedVenta);
      return;
    }

    const currentNegocioId = negocioId || userProfile?.negocio_id || await resolveNegocioId();
    if (!currentNegocioId) return;

    try {
      let invoiceQuery = supabase
        .from('ventas')
        .select('*, clientes(nombre, telefono, direccion, email), venta_items(id, venta_id, producto_id, cantidad, precio, total, productos(nombre, unidad, stock))')
        .eq('negocio_id', currentNegocioId)
        .eq('id', Number(invoiceId));

      if (isSeller && user?.id) {
        invoiceQuery = invoiceQuery.eq('vendedor_id', user.id);
      }

      const { data, error } = await invoiceQuery.maybeSingle();

      if (error) throw error;

      if (!data) {
        setPendingInvoiceId(null);
        sessionStorage.removeItem('matmax_pending_invoice_id');
        sessionStorage.removeItem('matmax_open_invoice_sale');
        return;
      }

      const directVenta = data as unknown as Venta;

      setVentas((current) => current.some((venta) => venta.id === directVenta.id) ? current : [directVenta, ...current]);
      setFilteredVentas((current) => current.some((venta) => venta.id === directVenta.id) ? current : [directVenta, ...current]);

      await openInvoice(directVenta);
    } catch (error) {
      console.error('Error opening invoice by id:', error);
      showToast(t.detailError, 'error');
      setPendingInvoiceId(null);
      sessionStorage.removeItem('matmax_pending_invoice_id');
      sessionStorage.removeItem('matmax_open_invoice_sale');
    }
  }, [isSeller, negocioId, openInvoice, resolveNegocioId, showToast, t.detailError, user?.id, userProfile?.negocio_id, ventas]);

  useEffect(() => {
    loadInvoicesData();
  }, [loadInvoicesData, roleFlags.role]);

  useEffect(() => {
    if (!pendingInvoiceId || isModalOpen || loading) return;

    openInvoiceById(pendingInvoiceId);
  }, [isModalOpen, loading, openInvoiceById, pendingInvoiceId]);

  function printReceipt() {
    if (!selectedVenta) return;
    if (isCancelledInvoice(selectedVenta)) {
      showToast(t.cancelled, 'error');
      return;
    }

    const snapshot = selectedVenta.recibo_datos;
    const discount = getVentaDiscount(ventaItems, selectedVenta);
    const snapshotItems = getSnapshotItems(snapshot);
    const currencySymbol = getSnapshotString(snapshot, 'currency_symbol', 'moneda_simbolo') || getCurrencyFromBusiness(negocio);
    const currencyCode = getSnapshotString(snapshot, 'currency_code', 'moneda_codigo') || String(negocio?.moneda_codigo || negocio?.currency_code || negocio?.moneda || '');
    const formatReceiptMoney = (value: number) => `${currencySymbol} ${formatNumber(value)}`;
    const amountReceived = getSnapshotNumber(snapshot, 'amount_received', 'monto_recibido');
    const originalAmountReceived = getSnapshotNumber(snapshot, 'amount_received_original', 'monto_recibido_original');
    const paymentCurrency = getSnapshotString(snapshot, 'payment_currency', 'moneda_pago');
    const exchangeRate = getSnapshotNumber(snapshot, 'exchange_rate', 'tasa_cambio');
    const creditUsed = getSnapshotNumber(snapshot, 'credit_used', 'credito_usado');
    const appliedToDebt = getSnapshotNumber(snapshot, 'applied_to_debt', 'aplicado_a_deuda');
    const remainingDebt = getSnapshotNumber(snapshot, 'remaining_debt', 'deuda_restante');
    const remainingCredit = getSnapshotNumber(snapshot, 'remaining_credit', 'credito_restante');
    const change = getSnapshotNumber(snapshot, 'change', 'cambio');
    const receiptDetails: Array<{ label: string; value: string }> = [
      ...(amountReceived !== null ? [{ label: t.amountReceived, value: formatReceiptMoney(amountReceived) }] : []),
      ...(paymentCurrency && originalAmountReceived !== null && paymentCurrency !== currencyCode
        ? [{ label: t.paymentCurrency, value: `${paymentCurrency} ${formatNumber(originalAmountReceived)}` }]
        : []),
      ...(exchangeRate !== null && exchangeRate > 0 ? [{ label: t.exchangeRate, value: formatNumber(exchangeRate) }] : []),
      ...(creditUsed !== null && creditUsed > 0 ? [{ label: t.creditUsed, value: formatReceiptMoney(creditUsed) }] : []),
      ...(appliedToDebt !== null && appliedToDebt > 0 ? [{ label: t.appliedToDebt, value: formatReceiptMoney(appliedToDebt) }] : []),
      ...(remainingCredit !== null && remainingCredit > 0
        ? [{ label: t.creditBalance, value: formatReceiptMoney(remainingCredit) }]
        : remainingDebt !== null && appliedToDebt !== null && appliedToDebt > 0
          ? [{ label: t.remainingDebt, value: formatReceiptMoney(remainingDebt) }]
          : []),
      ...(change !== null ? [{ label: t.change, value: formatReceiptMoney(change) }] : []),
    ];

    if (receiptDetails.length === 0 && selectedVenta.tipo_pago === 'Crédito') {
      receiptDetails.push({ label: t.pendingBalance, value: money(selectedVenta.saldo_pendiente) });
    }

    const opened = printCompactReceipt({
      saleId: selectedVenta.id,
      businessName: getSnapshotString(snapshot, 'business_name', 'negocio_nombre') || negocio?.nombre || t.systemPos,
      date: selectedVenta.fecha,
      time: getSnapshotString(snapshot, 'sale_time', 'hora') || getVentaTime(selectedVenta, language === 'es' ? 'es-ES' : 'en-US'),
      seller: getSnapshotString(snapshot, 'seller_name', 'vendedor_nombre') || getVentaSeller(selectedVenta, loggedUserName),
      client: getVentaClientName(selectedVenta, t.generalClient),
      paymentType: selectedVenta.tipo_pago === 'Crédito' ? 'Crédito' : 'Contado',
      subtotal: getSnapshotNumber(snapshot, 'subtotal') ?? discount.subtotal,
      discountPercent: getSnapshotNumber(snapshot, 'discount_percent', 'descuento_porcentaje') ?? discount.percent,
      discountAmount: getSnapshotNumber(snapshot, 'discount_amount', 'descuento_monto') ?? discount.amount,
      total: getSnapshotNumber(snapshot, 'total') ?? Number(selectedVenta.total || 0),
      currencySymbol,
      items: snapshotItems.length > 0
        ? snapshotItems
        : ventaItems.map((item) => ({
          name: item.productos?.nombre || t.deletedProduct,
          quantity: Number(item.cantidad || 0),
          unitPrice: Number(item.precio || 0),
        })),
      details: receiptDetails,
      status: selectedVenta.estado,
    }, language);

    if (!opened) showToast(t.printBlocked, 'error');
  }

  async function downloadInvoicePdf() {
    if (!selectedVenta) return;
    if (isCancelledInvoice(selectedVenta)) {
      showToast(t.cancelled, 'error');
      return;
    }

    try {
      const pdfBase64 = await generateInvoicePdfBase64();
      const binary = window.atob(pdfBase64);
      const bytes = new Uint8Array(binary.length);

      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }

      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${formatInvoiceCode(selectedVenta.id)}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice PDF:', error);
      showToast(t.downloadError, 'error');
    }
  }

  function exportInvoicesCsv() {
    if (!canManageInvoices) {
      showToast(language === 'es' ? 'No tienes permiso para exportar facturas' : 'You do not have permission to export invoices', 'error');
      return;
    }

    const headers = [t.invoice, t.date, t.time, t.client, t.seller, t.payment, t.status, t.discount, t.total, t.pendingBalance];
    const rows = filteredVentas.map((venta) => [
      formatInvoiceCode(venta.id),
      venta.fecha,
      getVentaTime(venta, language === 'es' ? 'es-ES' : 'en-US'),
      `"${getVentaClientName(venta, t.generalClient)}"`,
      `"${getVentaSeller(venta, loggedUserName)}"`,
      venta.tipo_pago === 'Contado' ? t.cash : t.credit,
      isCancelledInvoice(venta) ? t.cancelled : t.active,
      `"${money(getVentaDiscountAmount(venta))}"`,
      `"${isCancelledInvoice(venta) ? '-' : ''}${money(venta.total)}"`,
      `"${money(venta.saldo_pendiente)}"`
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `facturas-${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function printInvoicesList() {
    if (!canManageInvoices) {
      showToast(language === 'es' ? 'No tienes permiso para imprimir el listado de facturas' : 'You do not have permission to print the invoice list', 'error');
      return;
    }

    const rows = filteredVentas.map((venta) => `
      <tr>
        <td>${formatInvoiceCode(venta.id)}</td>
        <td>${venta.fecha}</td>
        <td>${escapeHtml(getVentaClientName(venta, t.generalClient))}</td>
        <td>${escapeHtml(getVentaSeller(venta, loggedUserName))}</td>
        <td>${venta.tipo_pago === 'Contado' ? t.cash : t.credit}</td>
        <td>${isCancelledInvoice(venta) ? t.cancelled : t.active}</td>
        <td class="right">${isCancelledInvoice(venta) ? '-' : ''}${money(venta.total)}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank', 'width=1100,height=900');

    if (!printWindow) {
      showToast(t.printBlocked, 'error');
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${t.history}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111; padding: 28px; }
            h1 { margin: 0 0 8px; font-size: 28px; }
            p { margin: 0 0 22px; color: #666; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { text-align: left; background: #fbfaf7; color: #8a6a16; font-size: 10px; text-transform: uppercase; letter-spacing: .12em; }
            th, td { padding: 10px; border-bottom: 1px solid #eee; }
            .right { text-align: right; font-weight: 800; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${t.history}</h1>
          <p>${filteredVentas.length.toLocaleString('en-US')} ${t.availableSales}</p>
          <table>
            <thead>
              <tr>
                <th>${t.invoice}</th>
                <th>${t.date}</th>
                <th>${t.client}</th>
                <th>${t.seller}</th>
                <th>${t.payment}</th>
                <th>${t.status}</th>
                <th class="right">${t.total}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  async function generateInvoicePdfBase64() {
    if (!selectedVenta) {
      throw new Error(t.noSelectedInvoice);
    }
    if (isCancelledInvoice(selectedVenta)) {
      throw new Error(t.cancelled);
    }

    const html = buildInvoiceHtml(selectedVenta, ventaItems, negocio, t, loggedUserName, language);
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const styleContent = parsed.querySelector('style')?.textContent || '';
    const invoiceElement = parsed.querySelector('.invoice');

    if (!invoiceElement) {
      throw new Error(t.pdfPrepareError);
    }

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-10000px';
    wrapper.style.top = '0';
    wrapper.style.width = '900px';
    wrapper.style.background = '#f7f4ec';
    wrapper.style.padding = '32px';
    wrapper.style.zIndex = '-1';

    const style = document.createElement('style');
    style.textContent = styleContent;
    wrapper.appendChild(style);
    wrapper.appendChild(invoiceElement.cloneNode(true));
    document.body.appendChild(wrapper);

    try {
      const target = wrapper.querySelector('.invoice') as HTMLElement | null;

      if (!target) {
        throw new Error(t.renderError);
      }

      const html2canvasModule = await import('html2canvas');
      const jsPDFModule = await import('jspdf');
      const html2canvas = html2canvasModule.default;
      const jsPDF = jsPDFModule.default;

      const canvas = await html2canvas(target, {
        scale: window.devicePixelRatio > 1 ? 1.2 : 1,
        backgroundColor: '#ffffff',
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      return pdf.output('datauristring').split(',')[1];
    } finally {
      document.body.removeChild(wrapper);
    }
  }

  function openCancelInvoiceModal() {
    if (!selectedVenta) return;

    if (isCancelledInvoice(selectedVenta)) {
      showToast(t.cancelled, 'error');
      return;
    }

    setCancelReason('');
    setIsCancelModalOpen(true);
  }

  async function handleCancelInvoice() {
    if (!selectedVenta) return;

    if (!canManageInvoices) {
      showToast(t.cancelError, 'error');
      return;
    }

    if (!cancelReason.trim()) {
      showToast(t.cancelReasonRequired, 'error');
      return;
    }

    try {
      setCancelingInvoice(true);

      const { data, error } = await supabase
        .from('ventas')
        .update({
          estado: 'anulada',
          anulada_at: new Date().toISOString(),
          anulada_por: user?.id || null,
          motivo_anulacion: cancelReason.trim()
        })
        .eq('id', selectedVenta.id)
        .eq('negocio_id', negocioId)
        .select('*, clientes(nombre, telefono, direccion, email), venta_items(id, venta_id, producto_id, cantidad, precio, total, productos(nombre, unidad, stock))')
        .maybeSingle();

      if (error) throw error;

      const updatedVenta = data as unknown as Venta;

      const { data: itemsToReverse, error: itemsError } = await supabase
        .from('venta_items')
        .select('id, venta_id, producto_id, cantidad, precio, total, productos(nombre, unidad, stock)')
        .eq('venta_id', selectedVenta.id);

      if (itemsError) throw itemsError;

      const reverseItems = (itemsToReverse || []) as unknown as VentaItem[];

      const stockRestoreResults = await Promise.all(
        reverseItems
          .filter((item) => item.producto_id)
          .map((item) => {
            const currentStock = Number(item.productos?.stock || 0);
            const quantityToRestore = Number(item.cantidad || 0);

            return supabase
              .from('productos')
              .update({ stock: currentStock + quantityToRestore })
              .eq('id', item.producto_id)
              .eq('negocio_id', negocioId);
          })
      );

      const stockRestoreError = stockRestoreResults.find((result) => result.error)?.error;
      if (stockRestoreError) throw stockRestoreError;

      if (selectedVenta.tipo_pago === 'Crédito' && selectedVenta.cliente_id) {
        const { data: clienteData, error: clienteError } = await supabase
          .from('clientes')
          .select('id, saldo')
          .eq('id', selectedVenta.cliente_id)
          .eq('negocio_id', negocioId)
          .maybeSingle();

        if (clienteError) throw clienteError;

        const currentSaldo = Number(clienteData?.saldo || 0);
        const saldoToReverse = Number(selectedVenta.saldo_pendiente || 0);
        const newSaldo = Math.max(0, currentSaldo - saldoToReverse);

        const { error: updateClienteError } = await supabase
          .from('clientes')
          .update({ saldo: newSaldo })
          .eq('id', selectedVenta.cliente_id)
          .eq('negocio_id', negocioId);

        if (updateClienteError) throw updateClienteError;
      }

      setSelectedVenta(updatedVenta);
      setVentas((current) => current.map((venta) => venta.id === updatedVenta.id ? updatedVenta : venta));
      setFilteredVentas((current) => current.map((venta) => venta.id === updatedVenta.id ? updatedVenta : venta));
      setIsCancelModalOpen(false);
      setCancelReason('');
      showToast(t.cancelSuccess, 'success');
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      showToast(t.cancelError, 'error');
    } finally {
      setCancelingInvoice(false);
    }
  }

  async function sendInvoiceByEmail() {
    if (!selectedVenta) return;

    try {
      const clientEmail = selectedVenta.clientes?.email?.trim();

      if (!clientEmail) {
        showToast(t.noClientEmail, 'error');
        return;
      }

      const pdfBase64 = await generateInvoicePdfBase64();

      const { data, error } = await supabase.functions.invoke('send-invoice', {
        body: {
          venta: selectedVenta,
          items: ventaItems,
          negocio,
          clienteEmail: clientEmail,
          pdfBase64
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || t.functionError);
      }

      if (data?.success === false) {
        console.error('Edge Function response:', data);
        throw new Error(data?.error || t.sendInvoiceError);
      }

      showToast(t.emailSuccess, 'success');
    } catch (error) {
      console.error('Error sending invoice by email:', JSON.stringify(error, null, 2));
      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'object'
          ? JSON.stringify(error)
          : t.sendingEmailError;
      showToast(errorMessage, 'error');
    }
  }

  async function sendInvoiceByWhatsApp() {
    if (!selectedVenta) return;

    try {
      const invoiceNumber = formatInvoiceCode(selectedVenta.id);
      const pdfBase64 = await generateInvoicePdfBase64();

      const { data, error } = await supabase.functions.invoke('send-invoice', {
        body: {
          venta: selectedVenta,
          items: ventaItems,
          negocio,
          clienteEmail: selectedVenta.clientes?.email || '',
          pdfBase64
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || t.functionError);
      }

      if (data?.success === false) {
        console.error('Edge Function response:', data);
        throw new Error(data?.error || t.prepareInvoiceError);
      }

      const phone = normalizePhoneForLink(selectedVenta.clientes?.telefono);
      const invoiceUrl = data?.invoiceUrl || data?.invoice_url || '';
      const message = encodeURIComponent(
        `${t.whatsappHello} ${getVentaClientName(selectedVenta, t.clientFallback)},\n\n` +
        `${t.whatsappIntro} ${invoiceNumber} ${t.whatsappFrom} ${negocio?.nombre || t.systemPos}.\n` +
        `${t.total}: ${money(selectedVenta.total)}\n\n` +
        `${invoiceUrl ? `${t.downloadInvoice}:\n${invoiceUrl}\n\n` : ''}` +
        t.thanks
      );

      const whatsappUrl = phone
        ? `https://wa.me/${phone}?text=${message}`
        : `https://wa.me/?text=${message}`;

      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      showToast(t.whatsappSuccess, 'success');
    } catch (error) {
      console.error('Error preparing invoice for WhatsApp:', JSON.stringify(error, null, 2));
      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'object'
          ? JSON.stringify(error)
          : t.whatsappError;
      showToast(errorMessage, 'error');
    }
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
          <h1 className="mb-3 text-xl font-serif font-bold text-red-700 sm:text-2xl">
            {t.missingTitle}
          </h1>
          <p className="mb-4 text-sm text-[#71717a] sm:text-base">
            {t.missingText}
          </p>
          <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4 text-left text-sm text-[#3f3f46]">
            <p className="mb-2 font-black">User ID:</p>
            <code className="break-all">{user?.id}</code>
          </div>
        </div>
      </div>
    );
  }

  function closeInvoiceModal() {
    setIsInvoiceModalVisible(false);

    window.setTimeout(() => {
      setIsModalOpen(false);
      setSelectedVenta(null);
      setVentaItems([]);
      setPendingInvoiceId(null);
      autoOpenInvoiceRef.current = null;
      sessionStorage.removeItem('matmax_pending_invoice_id');
      sessionStorage.removeItem('matmax_open_invoice_sale');

      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('invoiceId');
      currentUrl.searchParams.delete('sale');
      currentUrl.searchParams.delete('id');
      currentUrl.searchParams.delete('venta');
      window.history.replaceState({}, '', currentUrl.toString());
    }, 220);
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden text-[#08080b] sm:space-y-8">
      <div className="relative min-w-0 overflow-hidden rounded-[1.6rem] border border-[#e9e2d3] bg-white/75 p-4 shadow-matmax-soft backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.12),transparent_38%)]" />
        <div className="relative z-10 flex min-w-0 flex-col justify-between gap-5 xl:flex-row xl:items-start">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              className="mb-3 inline-flex cursor-pointer items-center rounded-full border border-[#f4c542]/30 bg-[#fff9e8] px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-[#8a6a16] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f4c542] hover:bg-[#fef3c7]"
            >
              MatMax Business Suite
            </button>
            <h1 className="mb-3 block overflow-visible pb-2 pt-2 text-4xl font-black leading-[1.05] tracking-tight text-[#050505] sm:text-5xl xl:text-6xl">
              {t.title}
            </h1>
            <p className="text-sm font-bold uppercase tracking-widest text-[#71717a]">
              {isSeller ? t.sellerSubtitle : t.subtitle}
            </p>
          </div>

          <div className="w-full sm:w-auto">
            <div className="relative min-w-0 overflow-hidden rounded-[1.65rem] border border-[#e9e2d3] bg-gradient-to-br from-white via-[#fffdf8] to-[#fff4c7]/50 px-5 py-4 shadow-[0_18px_44px_rgba(15,15,15,0.08)] backdrop-blur-xl sm:min-w-[320px]">
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#f4c542]/20 blur-2xl" />
              <div className="relative flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542] shadow-[0_16px_36px_rgba(0,0,0,0.2)]">
                  <FileText className="h-5 w-5 shrink-0" />
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#8a6a16]">
                    {t.business}
                  </p>
                  <p className="truncate text-xl font-black leading-tight text-[#050505] sm:text-2xl">
                    {negocio?.nombre || 'POS'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          className="w-full border border-[#e9e2d3] bg-white/90 shadow-[0_14px_34px_rgba(15,15,15,0.05)] hover:-translate-y-0.5 sm:w-auto"
          onClick={loadInvoicesData}
        >
          {t.refresh}
        </Button>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {canManageInvoices && (
          <MetricCard
            title={t.invoices}
            value={ventas.length.toLocaleString('en-US')}
            icon={FileText}
            iconClass="bg-[#050505] text-[#f4c542]"
          />
        )}
        <MetricCard
          title={t.activeInvoices}
          value={invoiceMetrics.activeCount.toLocaleString('en-US')}
          icon={FileText}
          iconClass="bg-emerald-50 text-emerald-700"
        />
        {!isSeller && (
          <MetricCard
            title={t.cancelledInvoices}
            value={invoiceMetrics.cancelledCount.toLocaleString('en-US')}
            icon={Ban}
            iconClass="bg-red-100 text-red-700"
          />
        )}
        {canManageFinancials && (
          <MetricCard
            title={t.totalBilled}
            value={money(totalFacturado)}
            icon={TrendingUp}
            iconClass="bg-[#fff4c7] text-[#8a6a16] border border-[#f4c542]/30"
          />
        )}
        {canManageFinancials && (
          <MetricCard
            title={t.cashTotal}
            value={money(invoiceMetrics.cashTotal)}
            icon={Wallet}
            iconClass="bg-green-50 text-green-700 border border-green-200"
          />
        )}
        {canManageFinancials && (
          <MetricCard
            title={t.creditTotal}
            value={money(invoiceMetrics.creditTotal)}
            icon={CreditCard}
            iconClass="bg-blue-50 text-blue-700 border border-blue-200"
          />
        )}
        {!isSeller && (
          <MetricCard
            title={t.pendingCredit}
            value={money(invoiceMetrics.pendingCredit)}
            icon={Wallet}
            iconClass="bg-red-50 text-red-700 border border-red-200"
          />
        )}
        {canManageFinancials && (
          <MetricCard
            title={t.averageInvoice}
            value={money(invoiceMetrics.averageInvoice)}
            icon={ShoppingCart}
            iconClass="bg-[#f6f4ee] text-[#050505]"
          />
        )}
        {canViewProfit && (
          <MetricCard
            title={t.grossProfit}
            value={money(invoiceMetrics.grossProfit)}
            icon={TrendingUp}
            iconClass="bg-emerald-50 text-emerald-700"
          />
        )}
      </div>

      {!isSeller && (
        <div className="relative overflow-hidden rounded-[1.6rem] border border-[#e9e2d3] bg-white/92 p-4 shadow-[0_18px_50px_rgba(15,15,15,0.06)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.1),transparent_36%)]" />
          <div className="relative z-10 flex min-w-0 flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#f4c542]/30 bg-[#fff9e8] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#8a6a16]">
                <BarChart3 className="h-4 w-4 shrink-0" />
                {t.monthlySummary}
              </div>
              <h2 className="text-2xl font-black tracking-tight text-[#050505] sm:text-3xl">
                {money(monthlySummary.total)}
              </h2>
              <p className="mt-1 text-sm font-bold uppercase tracking-[0.14em] text-[#71717a]">
                {t.monthlySummaryText}
              </p>
            </div>

            <div className="flex h-44 w-full items-end gap-3 xl:max-w-2xl">
              {monthlySummary.items.map((item) => (
                <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-3">
                  <div className="flex h-28 w-full items-end overflow-hidden rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] shadow-inner">
                    <div
                      className={`w-full rounded-t-2xl shadow-[0_12px_28px_rgba(0,0,0,0.08)] ${item.barClass}`}
                      style={{ height: `${item.height}%` }}
                      title={`${item.label}: ${money(item.value)}`}
                    />
                  </div>
                  <div className="min-w-0 text-center">
                    <p className={`truncate text-[10px] font-black uppercase tracking-[0.12em] ${item.labelClass}`}>{item.label}</p>
                    <p className={`truncate text-xs font-black tabular-nums ${item.valueClass}`}>{money(item.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[1.6rem] border border-[#e9e2d3] bg-white/92 p-4 shadow-[0_18px_50px_rgba(15,15,15,0.06)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto] xl:items-end">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 shrink-0 -translate-y-1/2 transform text-[#a1a1aa]" size={20} />
            <Input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {!isSeller && (
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">
                {t.sellerFilter}
              </label>
              <select
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="h-11 w-full rounded-2xl border border-[#e9e2d3] bg-white px-4 text-sm font-black text-[#050505] outline-none transition focus:border-[#f4c542] focus:ring-4 focus:ring-[#f4c542]/10"
              >
                <option value="all">{t.allSellers}</option>
                {sellers.map((seller) => (
                  <option key={seller} value={seller}>{seller}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">
              {t.sortBy}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="h-11 w-full rounded-2xl border border-[#e9e2d3] bg-white px-4 text-sm font-black text-[#050505] outline-none transition focus:border-[#f4c542] focus:ring-4 focus:ring-[#f4c542]/10"
            >
              <option value="newest">{t.sortNewest}</option>
              <option value="oldest">{t.sortOldest}</option>
              <option value="highest">{t.sortHighest}</option>
              <option value="lowest">{t.sortLowest}</option>
            </select>
          </div>

          {canManageInvoices && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:w-[260px]">
              <Button type="button" variant="secondary" className="w-full gap-2" onClick={exportInvoicesCsv} disabled={filteredVentas.length === 0}>
                <Download className="shrink-0" size={17} />
                {t.exportCsv}
              </Button>
              <Button type="button" variant="secondary" className="w-full gap-2" onClick={printInvoicesList} disabled={filteredVentas.length === 0}>
                <Printer className="shrink-0" size={17} />
                {t.printList}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[1.6rem] border border-[#e9e2d3] bg-white/92 p-4 shadow-[0_18px_50px_rgba(15,15,15,0.06)] backdrop-blur-xl sm:rounded-[2rem] sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">
            {t.quickFilters}
          </p>
          {(dateFilter !== 'all' || statusFilter !== 'all' || paymentFilter !== 'all' || sellerFilter !== 'all' || sortBy !== 'newest') && (
            <button
              type="button"
              onClick={() => {
                setDateFilter('all');
                setSelectedMonth(getLocalDateString(new Date()).slice(0, 7));
                setStatusFilter('all');
                setPaymentFilter('all');
                if (!isSeller) {
                  setSellerFilter('all');
                }
                setSortBy('newest');
              }}
              className="rounded-full border border-[#e9e2d3] bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#71717a] transition-all hover:bg-[#fff9e8] hover:text-[#050505]"
            >
              Reset
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={dateFilter === 'all'}
            onClick={() => {
              setDateFilter('all');
              setSelectedMonth(getLocalDateString(new Date()).slice(0, 7));
            }}
          >
            {t.allInvoices}
          </FilterButton>
          <FilterButton
            active={dateFilter === 'today'}
            onClick={() => {
              setDateFilter('today');
              setSelectedMonth(getLocalDateString(new Date()).slice(0, 7));
            }}
          >
            {t.today}
          </FilterButton>
          <FilterButton
            active={dateFilter === 'week'}
            onClick={() => {
              setDateFilter('week');
              setSelectedMonth(getLocalDateString(new Date()).slice(0, 7));
            }}
          >
            {t.thisWeek}
          </FilterButton>

          <div
            role="button"
            tabIndex={0}
            onClick={() => setDateFilter('month')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setDateFilter('month');
              }
            }}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 transition-all ${
              dateFilter === 'month'
                ? 'border-[#050505] bg-[#050505] text-[#f4c542] shadow-[0_12px_28px_rgba(0,0,0,0.18)]'
                : 'border-[#e9e2d3] bg-white text-[#71717a] hover:border-[#f4c542]/40 hover:bg-[#fff9e8] hover:text-[#050505]'
            }`}
          >
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-[0.12em]">
              {t.thisMonth}
            </span>
            <input
              type="month"
              value={selectedMonth}
              onClick={(e) => {
                e.stopPropagation();
                setDateFilter('month');
              }}
              onFocus={() => setDateFilter('month')}
              onChange={(e) => {
                setSelectedMonth(e.target.value || getLocalDateString(new Date()).slice(0, 7));
                setDateFilter('month');
              }}
              className={`w-[126px] cursor-pointer rounded-full border-0 bg-transparent text-xs font-black outline-none [color-scheme:light] ${
                dateFilter === 'month' ? 'text-[#f4c542]' : 'text-[#71717a]'
              }`}
            />
          </div>

          <FilterButton active={statusFilter === 'active'} onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}>{t.active}</FilterButton>
          <FilterButton active={statusFilter === 'cancelled'} onClick={() => setStatusFilter(statusFilter === 'cancelled' ? 'all' : 'cancelled')}>{t.cancelled}</FilterButton>
          <FilterButton active={paymentFilter === 'Contado'} onClick={() => setPaymentFilter(paymentFilter === 'Contado' ? 'all' : 'Contado')}>{t.cash}</FilterButton>
          <FilterButton active={paymentFilter === 'Crédito'} onClick={() => setPaymentFilter(paymentFilter === 'Crédito' ? 'all' : 'Crédito')}>{t.credit}</FilterButton>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <h2 className="text-xl font-serif font-bold text-[#050505] sm:text-2xl">{t.history}</h2>
            <p className="mt-1 text-sm font-semibold text-[#71717a]">{filteredVentas.length.toLocaleString('en-US')} {t.availableSales}</p>
          </div>
        </CardHeader>

        <CardContent>
          <div className="hidden overflow-hidden rounded-2xl border border-[#f1ebdf] bg-[#fffdf8] pr-1 lg:block">
            <table className="w-full table-fixed text-sm">
              <thead className="sticky top-0 z-10 border-b border-[#e9e2d3] bg-[#fbfaf7]">
                <tr>
                  <th className="w-[13%] px-2 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a16]">{t.invoice}</th>
                  <th className="w-[10%] px-2 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a16]">{t.date}</th>
                  <th className="w-[8%] px-2 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a16]">{t.time}</th>
                  <th className="w-[17%] px-2 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a16]">{t.client}</th>
                  <th className="w-[12%] px-2 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a16]">{t.seller}</th>
                  <th className="w-[9%] px-2 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a16]">{t.payment}</th>
                  <th className="w-[9%] px-2 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a16]">{t.status}</th>
{canManageInvoices && (
                    <th className="w-[11%] px-2 py-3 text-right text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a16]">{t.discount}</th>
                  )}
                  <th className="w-[16%] px-2 py-3 text-right text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a16]">{t.total}</th>
                  <th className="w-[8%] px-2 py-3 text-right text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a16]">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1ebdf]">
                {visibleVentas.map((venta) => (
                  <tr key={venta.id} className="odd:bg-white even:bg-[#fffdf8] transition-all duration-300 hover:bg-[#fff9e8] hover:shadow-inner">
                    <td className="whitespace-nowrap px-2 py-3 text-sm font-black text-[#050505]">{formatInvoiceCode(venta.id)}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-sm font-semibold text-[#71717a]">{venta.fecha}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-sm font-semibold text-[#71717a]">{getVentaTime(venta, language === 'es' ? 'es-ES' : 'en-US')}</td>
                    <td className="truncate px-2 py-3 text-sm font-semibold text-[#71717a]">{getVentaClientName(venta, t.generalClient)}</td>
                    <td className="truncate px-2 py-3 text-sm font-semibold text-[#71717a]">{getVentaSeller(venta, loggedUserName)}</td>
                    <td className="px-2 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${venta.tipo_pago === 'Contado' ? 'bg-[#050505] text-[#f4c542]' : 'bg-[#fff4c7] text-[#8a6a16]'}`}>
                        {venta.tipo_pago === 'Contado' ? t.cash : t.credit}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${isCancelledInvoice(venta) ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {isCancelledInvoice(venta) ? t.cancelled : t.active}
                      </span>
                    </td>
        {canManageInvoices && (
                      <td className="whitespace-nowrap px-2 py-3 text-right font-semibold tabular-nums text-red-600">
                        -{money(getVentaDiscountAmount(venta))}
                      </td>
                    )}
                    {canManageFinancials && (
                      <td
                        className={`whitespace-nowrap px-2 py-3 text-right font-black tabular-nums ${
                          isCancelledInvoice(venta)
                            ? 'text-red-600 line-through'
                            : 'text-[#8a6a16]'
                        }`}
                      >
                        {isCancelledInvoice(venta) ? `-${money(venta.total)}` : money(venta.total)}
                      </td>
                    )}
                    <td className="px-2 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openInvoice(venta)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542] shadow-[0_12px_24px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#111111]"
                        aria-label={t.view}
                      >
                        <Eye className="shrink-0" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          </div>

          <div className="space-y-3 lg:hidden">
            {visibleVentas.map((venta) => (
              <div
                key={venta.id}
                className="relative overflow-hidden rounded-[1.5rem] border border-[#e9e2d3] bg-white p-4 shadow-[0_14px_34px_rgba(15,15,15,0.06)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.10),transparent_38%)]" />
                <div className="relative z-10 space-y-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">
                        {t.invoice}
                      </p>
                      <p className="mt-1 truncate text-lg font-black text-[#050505]">
                        {formatInvoiceCode(venta.id)}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#71717a]">
                        {venta.fecha} · {getVentaTime(venta, language === 'es' ? 'es-ES' : 'en-US')}
                      </p>
                    </div>

                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${isCancelledInvoice(venta) ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {isCancelledInvoice(venta) ? t.cancelled : t.active}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#f1ebdf] bg-[#fffdf8] p-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6a16]">{t.client}</p>
                      <p className="mt-1 truncate text-sm font-black text-[#050505]">{getVentaClientName(venta, t.generalClient)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6a16]">{t.seller}</p>
                        <p className="mt-1 truncate text-sm font-semibold text-[#71717a]">{getVentaSeller(venta, loggedUserName)}</p>
                      </div>
                      <div className="min-w-0 text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6a16]">{t.payment}</p>
                        <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-black ${venta.tipo_pago === 'Contado' ? 'bg-[#050505] text-[#f4c542]' : 'bg-[#fff4c7] text-[#8a6a16]'}`}>
                          {venta.tipo_pago === 'Contado' ? t.cash : t.credit}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {!isSeller && (
                      <div className="min-w-0 rounded-2xl border border-red-100 bg-red-50 px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-700">{t.discount}</p>
                        <p className="mt-1 truncate text-sm font-black tabular-nums text-red-700">-{money(getVentaDiscountAmount(venta))}</p>
                      </div>
                    )}
                    {canManageFinancials && (
                      <div className="min-w-0 rounded-2xl border border-[#f4c542]/30 bg-[#fff4c7] px-3 py-2 text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6a16]">{t.total}</p>
                        <p className={`mt-1 truncate text-base font-black tabular-nums ${isCancelledInvoice(venta) ? 'text-red-600 line-through' : 'text-[#8a6a16]'}`}>
                          {isCancelledInvoice(venta) ? `-${money(venta.total)}` : money(venta.total)}
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => openInvoice(venta)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#050505] px-4 py-3 text-sm font-black text-[#f4c542] shadow-[0_14px_34px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#111111]"
                  >
                    <Eye className="shrink-0" size={16} />
                    {t.view}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredVentas.length === 0 && (
            <div className="border-t border-[#f1ebdf] bg-[#fbfaf7] py-12 text-center font-semibold text-[#71717a]">
              {t.noInvoices}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 border-t border-[#f1ebdf] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-black text-[#71717a]">
              {filteredVentas.length === 0 ? t.noInvoices : `${t.page} ${currentPage.toLocaleString('en-US')} / ${totalPages.toLocaleString('en-US')}`}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                {t.previous}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                {t.next}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeInvoiceModal}
        title={t.invoice}
      >
        {selectedVenta && (
          <div
            className={`min-w-0 space-y-5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:space-y-6 ${
              isInvoiceModalVisible
                ? 'translate-y-0 scale-100 opacity-100 blur-0'
                : 'translate-y-5 scale-[0.985] opacity-0 blur-[1px] sm:translate-y-7 sm:scale-[0.975]'
            }`}
          >
            <div className="flex flex-col-reverse justify-end gap-3 print:hidden sm:flex-row sm:flex-wrap">
              {!isCancelledInvoice(selectedVenta) && (
                <>
                  <Button type="button" variant="secondary" onClick={printReceipt} disabled={loadingItems || ventaItems.length === 0}>
                    <Printer className="shrink-0" size={18} />
                    {t.printReceipt}
                  </Button>

                  <Button type="button" variant="secondary" onClick={sendInvoiceByEmail}>
                    {t.sendEmail}
                  </Button>

                  <Button type="button" variant="secondary" onClick={sendInvoiceByWhatsApp}>
                    WhatsApp
                  </Button>

                  <Button type="button" onClick={downloadInvoicePdf}>
                    <Download className="shrink-0" size={18} />
                    {t.downloadPdf}
                  </Button>

                  {canManageInvoices && (
                    <Button type="button" variant="secondary" onClick={openCancelInvoiceModal} className="border border-red-200 bg-red-50 text-red-700 hover:bg-red-100">
                      <Ban className="shrink-0" size={18} />
                      {t.cancelInvoice}
                    </Button>
                  )}
                </>
              )}

              {isCancelledInvoice(selectedVenta) && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
                  {t.cancelled}
                </div>
              )}
            </div>

            <div id="invoice-print-area" className="relative transform-gpu overflow-hidden rounded-[2rem] border border-[#e9e2d3] bg-white p-4 text-[#050505] shadow-[0_18px_50px_rgba(15,15,15,0.06)] will-change-transform print:border-0 print:p-0 print:shadow-none sm:p-6">
              {isCancelledInvoice(selectedVenta) && (
                <div className="pointer-events-none absolute inset-0 z-0 flex rotate-[-22deg] items-center justify-center text-6xl font-black uppercase tracking-[0.2em] text-red-500/10 sm:text-8xl">
                  {t.cancelled}
                </div>
              )}

              <div className="relative z-10">
                <div className="mb-6 flex min-w-0 flex-col items-start justify-between gap-6 border-b border-[#e9e2d3] pb-6 sm:flex-row">
                <div className="flex items-start gap-4">
                  {negocio?.logo_url && (
                    <img
                      src={negocio.logo_url}
                      alt={negocio.nombre || 'Logo'}
                      className="h-16 w-16 rounded-2xl border border-[#e9e2d3] bg-white object-contain"
                    />
                  )}

                  <div>
                    <h2 className="text-2xl font-black text-[#8a6a16] sm:text-3xl">{negocio?.nombre || t.systemPos}</h2>
                    <p className="mt-1 text-sm text-[#71717a]">{t.salesInvoice}</p>
                    {negocio?.telefono && <p className="mt-2 text-sm text-[#71717a]">{t.phone}: {formatPhone(negocio.telefono)}</p>}
                    {negocio?.direccion && <p className="text-sm text-[#71717a]">{negocio.direccion}</p>}
                  </div>
                </div>

                <div className="w-full text-left sm:w-auto sm:text-right">
                  <p className="text-sm text-[#71717a]">{t.invoice}</p>
                  <p className="break-words text-xl font-black text-[#050505]">{formatInvoiceCode(selectedVenta.id)}</p>
                  <p className="mt-2 text-sm text-[#71717a]">{t.date}: {selectedVenta.fecha}</p>
                  <p className="text-sm text-[#71717a]">{t.time}: {getVentaTime(selectedVenta, language === 'es' ? 'es-ES' : 'en-US')}</p>
                  <p className="text-sm text-[#71717a]">{t.seller}: {getVentaSeller(selectedVenta, loggedUserName)}</p>
                  <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${isCancelledInvoice(selectedVenta) ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {isCancelledInvoice(selectedVenta) ? t.cancelled : t.active}
                  </span>
                </div>
              </div>

              {isCancelledInvoice(selectedVenta) && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p className="font-black">{t.cancelled}</p>
                  {selectedVenta.anulada_at && (
                    <p className="mt-1 font-semibold">{t.cancelledAt}: {new Date(selectedVenta.anulada_at).toLocaleString()}</p>
                  )}
                  {selectedVenta.motivo_anulacion && (
                    <p className="mt-1 font-semibold">{t.cancelledReason}: {selectedVenta.motivo_anulacion}</p>
                  )}
                </div>
              )}

              <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4">
                  <p className="mb-2 text-xs font-black uppercase tracking-widest text-[#8a6a16]">{t.client}</p>
                  <p className="font-black text-[#050505]">{getVentaClientName(selectedVenta, t.generalClient)}</p>
                  <p className="text-sm text-[#71717a]">{formatPhone(selectedVenta.clientes?.telefono, '')}</p>
                  <p className="text-sm text-[#71717a]">{selectedVenta.clientes?.direccion || ''}</p>
                </div>
                <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4">
                  <p className="mb-2 text-xs font-black uppercase tracking-widest text-[#8a6a16]">{t.payment}</p>
                  <p className="font-black text-[#050505]">{selectedVenta.tipo_pago === 'Contado' ? t.cash : t.credit}</p>
                  <p className="text-sm text-[#71717a]">{t.pendingBalance}: {money(selectedVenta.saldo_pendiente)}</p>
                </div>
              </div>

              {loadingItems ? (
                <div className="py-10 text-center font-medium text-[#71717a]">{t.loadingDetail}</div>
              ) : (
                <div className="mb-6 overflow-x-auto rounded-2xl border border-[#f1ebdf] bg-[#fffdf8]">
                <table className="w-full min-w-[640px]">
                  <thead className="border-b border-[#e9e2d3] bg-[#fbfaf7]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.product}</th>
                      <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.quantity}</th>
                      <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.price}</th>
                      <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.total}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1ebdf]">
                    {ventaItems.map((item) => (
                      <tr key={item.id}>
                        <td className="max-w-[280px] truncate px-4 py-3 font-black text-[#050505]">{item.productos?.nombre || t.deletedProduct}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#71717a]">{Number(item.cantidad || 0)} {item.productos?.unidad || ''}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-[#71717a]">
                          {money(item.precio)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-black tabular-nums text-[#050505]">
                          {money(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}

              <div className="flex justify-end">
                <div className="w-full rounded-2xl border border-[#f4c542]/30 bg-[#fff4c7] p-4 shadow-sm sm:w-72">
                  <div className="space-y-2 text-sm font-black text-[#8a6a16]">
                    <div className="flex justify-between gap-4">
                      <span>{t.subtotal}</span>
                      <span className="tabular-nums">{money(selectedInvoiceDiscount.subtotal)}</span>
                    </div>
                    {canManageInvoices && (
                      <div className="flex justify-between gap-4 text-red-700">
                        <span>{t.discount} ({formatNumber(selectedInvoiceDiscount.percent)}%)</span>
                        <span className="tabular-nums">-{money(selectedInvoiceDiscount.amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-4 border-t border-[#f4c542]/40 pt-2 text-lg">
                      <span>{t.total}</span>
                      <span
                        className={`break-words tabular-nums sm:whitespace-nowrap ${
                          isCancelledInvoice(selectedVenta) ? 'text-red-600 line-through' : ''
                        }`}
                      >
                        {isCancelledInvoice(selectedVenta) ? `-${selectedInvoiceTotal}` : selectedInvoiceTotal}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-8 text-center text-sm text-[#71717a]">
                {t.thanks}
              </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => {
          if (!cancelingInvoice) {
            setIsCancelModalOpen(false);
            setCancelReason('');
          }
        }}
        title={t.cancelTitle}
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {t.cancelWarning}
          </div>

          <Input
            label={t.cancelReasonLabel}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder={t.cancelReasonPlaceholder}
            disabled={cancelingInvoice}
          />

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={cancelingInvoice}
              onClick={() => {
                setIsCancelModalOpen(false);
                setCancelReason('');
              }}
            >
              {t.cancel}
            </Button>

            <Button
              type="button"
              disabled={cancelingInvoice}
              onClick={handleCancelInvoice}
              className="border border-red-700 bg-red-700 text-white hover:bg-red-800"
            >
              <Ban className="shrink-0" size={18} />
              {cancelingInvoice ? t.canceling : t.cancelConfirm}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-300 ${
        active
          ? 'border-[#050505] bg-[#050505] text-[#f4c542] shadow-[0_12px_28px_rgba(0,0,0,0.18)]'
          : 'border-[#e9e2d3] bg-white text-[#71717a] hover:-translate-y-0.5 hover:border-[#f4c542]/40 hover:bg-[#fff9e8] hover:text-[#050505]'
      }`}
    >
      {children}
    </button>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  iconClass
}: {
  title: string;
  value: string;
  icon: ElementType;
  iconClass: string;
}) {
  return (
    <div className="group flex min-w-0 items-center justify-between gap-3 rounded-[1.6rem] border border-[#e9e2d3] bg-white/95 p-4 shadow-[0_18px_50px_rgba(15,15,15,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,15,15,0.1)] sm:gap-4 sm:rounded-[2rem] sm:p-6 xl:gap-3 2xl:gap-4">
      <div className="min-w-0 flex-1 pr-2 sm:pr-3">
        <p className="mb-3 text-[11px] font-black uppercase leading-snug tracking-[0.18em] text-[#8a6a16] sm:tracking-[0.22em]">
          {title}
        </p>
        <p className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(1.4rem,2vw,2.3rem)] font-black leading-[1.08] tracking-tight tabular-nums text-[#050505] sm:text-[clamp(1.7rem,2.2vw,2.6rem)] xl:text-[clamp(1.6rem,1.9vw,2.3rem)] 2xl:text-[clamp(1.9rem,2.2vw,2.8rem)]">
          {value}
        </p>
      </div>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] border border-white/10 shadow-[0_18px_40px_rgba(15,15,15,0.14)] transition-all duration-300 group-hover:scale-105 group-hover:rotate-3 sm:h-14 sm:w-14 sm:rounded-[1.2rem] xl:h-12 xl:w-12 2xl:h-14 2xl:w-14 ${iconClass}`}>
        <Icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6 xl:h-5 xl:w-5 2xl:h-6 2xl:w-6" />
      </div>
    </div>
  );
}

function buildInvoiceHtml(
  venta: Venta,
  items: VentaItem[],
  negocio: Negocio | null,
  t: (typeof invoicesCopy)['es' | 'en'],
  loggedUserName: string,
  language: 'es' | 'en'
) {
  const currency = getCurrencyFromBusiness(negocio);
  const invoiceNumber = `FAC-${venta.id.toString().padStart(6, '0')}`;
  const cancelled = venta.estado === 'anulada' || venta.estado === 'cancelled';
  const discount = getVentaDiscount(items, venta);
  const seller = getVentaSeller(venta, loggedUserName);
  const saleTime = getVentaTime(venta, language === 'es' ? 'es-ES' : 'en-US');
  const formattedTotal = `${currency} ${formatNumber(venta.total || 0)}`;
  const rows = items.map((item) => `
    <tr>
      <td class="product-name">${escapeHtml(item.productos?.nombre || t.deletedProduct)}</td>
      <td class="text-right">${Number(item.cantidad || 0)} ${escapeHtml(item.productos?.unidad || '')}</td>
      <td class="text-right">${currency} ${formatNumber(item.precio)}</td>
      <td class="text-right strong">${currency} ${formatNumber(item.total)}</td>
    </tr>
  `).join('');

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=900, initial-scale=1" />
  <title>${t.invoice} ${invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f7f4ec;
      color: #111111;
      font-family: Arial, Helvetica, sans-serif;
      padding: 32px;
      min-width: 900px;
    }
    .invoice {
      width: 820px;
      max-width: none;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e9e2d3;
      border-radius: 28px;
      overflow: hidden;
      box-shadow: 0 24px 70px rgba(15,15,15,0.08);
    }

    .cancel-watermark {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: rotate(-22deg);
      color: rgba(220, 38, 38, 0.09);
      font-size: 92px;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      pointer-events: none;
      z-index: 0;
    }
    .invoice-body { position: relative; z-index: 1; }
    .cancelled-badge {
      display: inline-block;
      margin-top: 10px;
      border: 1px solid #fecaca;
      background: #fee2e2;
      color: #b91c1c;
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .cancel-box {
      margin-bottom: 22px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 18px;
      padding: 14px;
      color: #b91c1c;
      font-size: 13px;
      font-weight: 700;
    }
    .negative-total { color: #dc2626; text-decoration: line-through; }
    .topbar {
      background: linear-gradient(135deg, #050505 0%, #201a08 62%, #f4c542 100%);
      color: #ffffff;
      padding: 28px 32px;
    }
    .brand-row {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
    }
    .brand {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    .logo {
      width: 64px;
      height: 64px;
      object-fit: contain;
      border-radius: 18px;
      background: #ffffff;
      border: 1px solid rgba(255,255,255,0.35);
      padding: 6px;
    }
    .logo-placeholder {
      width: 64px;
      height: 64px;
      border-radius: 18px;
      background: #f4c542;
      color: #050505;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 24px;
    }
    h1 { margin: 0; font-size: 30px; line-height: 1.18; padding: 4px 0 6px; overflow: visible; }
    .subtitle { margin: 6px 0 0; color: rgba(255,255,255,0.72); font-size: 14px; }
    .invoice-meta { text-align: right; }
    .invoice-meta .label { margin: 0; color: rgba(255,255,255,0.62); font-size: 13px; }
    .invoice-meta .number { margin: 4px 0 0; font-size: 26px; font-weight: 900; color: #f4c542; }
    .content { padding: 30px 32px 34px; }
    .business-details { margin-top: 18px; color: rgba(255,255,255,0.68); font-size: 13px; line-height: 1.5; }
    .cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-bottom: 26px;
    }
    .box {
      background: #fbfaf7;
      border: 1px solid #e9e2d3;
      border-radius: 20px;
      padding: 18px;
      min-height: 120px;
    }
    .box-title {
      margin: 0 0 10px;
      color: #8a6a16;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    .box-main { margin: 0 0 5px; font-size: 18px; font-weight: 900; }
    .box-text { margin: 4px 0; color: #71717a; font-size: 13px; line-height: 1.4; }
    table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 12px; }
    th:nth-child(1), td:nth-child(1) { width: 46%; }
    th:nth-child(2), td:nth-child(2) { width: 18%; }
    th:nth-child(3), td:nth-child(3) { width: 18%; }
    th:nth-child(4), td:nth-child(4) { width: 18%; }
    th {
      background: #fbfaf7;
      color: #8a6a16;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      padding: 14px 12px;
      border-bottom: 1px solid #e9e2d3;
      text-align: left;
    }
    td {
      padding: 15px 12px;
      border-bottom: 1px solid #f1ebdf;
      color: #3f3f46;
      font-size: 14px;
      vertical-align: top;
    }
    .product-name { color: #050505; font-weight: 800; }
    .text-right { text-align: right; }
    .strong { color: #050505; font-weight: 900; }
    .summary {
      width: 300px;
      margin: 26px 0 0 auto;
      background: #fff4c7;
      border: 1px solid rgba(244,197,66,0.5);
      border-radius: 20px;
      padding: 18px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
      color: #8a6a16;
      font-size: 22px;
      font-weight: 900;
    }
    .summary-row.small { font-size: 14px; }
    .summary-row.discount { color: #b91c1c; }
    .summary-row.final { border-top: 1px solid rgba(244,197,66,0.55); padding-top: 10px; margin-top: 10px; }
    .footer {
      margin-top: 32px;
      text-align: center;
      color: #71717a;
      font-size: 13px;
    }
    @media print {
      @page { size: A4 portrait; margin: 10mm; }
      html, body { width: 900px; min-width: 900px; background: #ffffff; padding: 0; }
      .invoice { width: 820px; max-width: none; box-shadow: none; border-radius: 0; border: 0; }
      .topbar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .box, .summary, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <main class="invoice">
    <section class="topbar">
      <div class="brand-row">
        <div>
          <div class="brand">
            ${negocio?.logo_url ? `<img class="logo" src="${escapeHtml(negocio.logo_url)}" alt="${escapeHtml(negocio.nombre || 'Logo')}" />` : `<div class="logo-placeholder">${escapeHtml((negocio?.nombre || t.systemPos).slice(0, 1).toUpperCase())}</div>`}
            <div>
              <h1>${escapeHtml(negocio?.nombre || t.systemPos)}</h1>
              <p class="subtitle">${t.salesInvoice}</p>
            </div>
          </div>
          <div class="business-details">
            ${negocio?.telefono ? `<div>${t.phone}: ${escapeHtml(formatPhone(negocio.telefono))}</div>` : ''}
            ${negocio?.direccion ? `<div>${escapeHtml(negocio.direccion)}</div>` : ''}
          </div>
        </div>
        <div class="invoice-meta">
          <p class="label">${t.invoice}</p>
          <p class="number">${invoiceNumber}</p>
          <p class="subtitle">${t.date}: ${escapeHtml(venta.fecha)}</p>
          <p class="subtitle">${t.time}: ${escapeHtml(saleTime)}</p>
          <p class="subtitle">${t.seller}: ${escapeHtml(seller)}</p>
          ${cancelled ? `<span class="cancelled-badge">${escapeHtml(t.cancelled)}</span>` : ''}
        </div>
      </div>
    </section>

    <section class="content">
      ${cancelled ? `<div class="cancel-box"><div>${escapeHtml(t.cancelled)}</div>${venta.anulada_at ? `<div>${escapeHtml(t.cancelledAt)}: ${escapeHtml(new Date(venta.anulada_at).toLocaleString())}</div>` : ''}${venta.motivo_anulacion ? `<div>${escapeHtml(t.cancelledReason)}: ${escapeHtml(venta.motivo_anulacion)}</div>` : ''}</div>` : ''}
      <div class="cards">
        <div class="box">
          <p class="box-title">${t.client}</p>
          <p class="box-main">${escapeHtml(getVentaClientName(venta, t.generalClient))}</p>
          ${venta.clientes?.telefono ? `<p class="box-text">${escapeHtml(formatPhone(venta.clientes.telefono))}</p>` : ''}
          ${venta.clientes?.direccion ? `<p class="box-text">${escapeHtml(venta.clientes.direccion)}</p>` : ''}
        </div>
        <div class="box">
          <p class="box-title">${t.payment}</p>
          <p class="box-main">${venta.tipo_pago === 'Contado' ? t.cash : venta.tipo_pago === 'Crédito' ? t.credit : '-'}</p>
          <p class="box-text">${t.pendingBalance}: ${currency} ${formatNumber(venta.saldo_pendiente)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>${t.product}</th>
            <th class="text-right">${t.quantity}</th>
            <th class="text-right">${t.price}</th>
            <th class="text-right">${t.total}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="summary">
        <div class="summary-row small">
          <span>${t.subtotal}</span>
          <span>${currency} ${formatNumber(discount.subtotal)}</span>
        </div>
        <div class="summary-row small discount">
          <span>${t.discount} (${formatNumber(discount.percent)}%)</span>
          <span>-${currency} ${formatNumber(discount.amount)}</span>
        </div>
        <div class="summary-row final">
          <span>${t.total}</span>
          <span class="${cancelled ? 'negative-total' : ''}">${cancelled ? '-' : ''}${formattedTotal}</span>
        </div>
      </div>

      <div class="footer">${t.thanks}</div>
    </section>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  }
