
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Package, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getUserRoleFlags } from '../utils/roles';
import { logAudit } from '../utils/audit';

type Producto = {
  id: number;
  negocio_id: string | null;
  nombre: string;
  unidad: string | null;
  precio: number;
  precio_anterior?: number | null;
  precio_cambio?: 'up' | 'down' | null;
  precio_actualizado_en?: string | null;
  costo: number | null;
  stock: number | null;
  minimo: number | null;
};

type ProductoRow = Partial<Producto> & {
  id: number;
  negocio_id: string | null;
  nombre: string;
  precio: number;
  stock: number | null;
  minimo: number | null;
};

type Cliente = {
  id: number;
  negocio_id: string | null;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  limite_credito: number | null;
  saldo: number | null;
};

type CartItem = {
  producto: Producto;
  cantidad: number;
  precio: number;
};

type ReceiptData = {
  ventaId: number;
  negocioNombre: string;
  fecha: string;
  hora: string;
  vendedor: string;
  cliente: string;
  tipoPago: 'Contado' | 'Crédito';
  subtotal: number;
  descuentoPorcentaje: number;
  descuentoMonto: number;
  total: number;
  montoRecibido: number;
  montoRecibidoOriginal: number;
  monedaPago: string;
  tasaCambio: number | null;
  aplicadoADeuda: number;
  cambio: number;
  deudaRestante: number;
  items: CartItem[];
  estado?: string | null;
  monedaCodigo: string;
  monedaSimbolo: string;
};

const salesCopy = {
  es: {
    loading: 'Cargando ventas...',
    missingTitle: 'Usuario sin negocio asignado',
    missingText: 'El login funciona, pero este usuario todavía no existe en la tabla usuarios o no tiene un negocio_id asignado.',
    pageTitle: 'Ventas',
    sellerSubtitle: 'Punto de venta habilitado para vendedores',
    sellerBasicView: 'Vista de vendedor: crear ventas, cobrar y consultar productos disponibles. No se muestran costos ni datos financieros sensibles.',
    adminSubtitle: 'Punto de venta y registro de transacciones',
    searchPlaceholder: 'Buscar producto por nombre o unidad...',
    availableProducts: 'Productos disponibles',
    productsCount: 'productos',
    stock: 'Stock',
    unit: 'unidad',
    clickToAdd: 'Agregar',
    noProducts: 'No se encontraron productos',
    cart: 'Carrito',
    units: 'unidades',
    products: 'productos',
    client: 'Cliente',
    generalClient: 'Cliente general / sin cliente',
    generalClientShort: 'Cliente general',
    informalClient: 'Cliente informal',
    informalClientPlaceholder: 'Ej. Cliente de mostrador',
    paymentType: 'Tipo de pago',
    cash: 'Contado',
    credit: 'Crédito',
    creditDueDate: 'Fecha de vencimiento',
    creditStatus: 'Estado crédito',
    creditPending: 'Pendiente',
    dueDateRequired: 'Selecciona una fecha de vencimiento para la venta a crédito',
    each: 'c/u',
    emptyCart: 'El carrito está vacío',
    totalUnits: 'Unidades',
    subtotal: 'Subtotal',
    discountPercent: 'Descuento (%)',
    discount: 'Descuento',
    total: 'Total',
    amountReceived: 'Monto recibido',
    paymentCurrency: 'Moneda recibida',
    systemCurrency: 'Moneda del sistema',
    alternativeCurrency: 'Moneda alternativa',
    exchangeRate: 'Tasa',
    convertedAmount: 'Monto convertido',
    exchangeRateUnavailable: 'Configura una tasa del día en Settings para cobrar en otra moneda.',
    change: 'Cambio',
    appliedToDebt: 'Aplicado a deuda',
    remainingDebt: 'Deuda restante',
    currentDebt: 'Deuda actual',
    creditBalance: 'Crédito a favor',
    extraAvailable: 'Excedente disponible',
    applyExtraToDebt: 'Aplicar excedente a deuda',
    debtApplyHint: 'Activa esta opción si el cliente quiere usar el dinero restante para bajar su deuda anterior.',
    noDebt: 'Este cliente no tiene deuda pendiente.',
    enterExtraCash: 'Para aplicar a deuda, el monto recibido debe ser mayor que el total de la venta.',
    amountReceivedRequired: 'El monto recibido debe cubrir el total de la venta',
    clear: 'Limpiar',
    saving: 'Guardando...',
    charge: 'Cobrar',
    saleRegistered: 'Venta registrada',
    receiptGenerated: 'Recibo generado',
    sale: 'Venta',
    soldProducts: 'Productos vendidos',
    close: 'Cerrar',
    printReceipt: 'Imprimir recibo',
    receiptTitle: 'Recibo de venta',
    date: 'Fecha',
    time: 'Hora',
    seller: 'Vendedor',
    loggedUser: 'Usuario conectado',
    priceIncreased: 'Precio subió',
    priceDecreased: 'Precio bajó',
    sellerDiscountLimit: 'Los vendedores solo pueden aplicar hasta {limit}% de descuento',
    payment: 'Pago',
    product: 'Producto',
    quantityShort: 'Cant.',
    price: 'Precio',
    thanks: 'Gracias por su compra.',
    blockedPrint: 'El navegador bloqueó la ventana de impresión',
    loadError: 'Error al cargar datos de ventas',
    noStock: 'Este producto no tiene stock disponible',
    notEnoughStock: 'No hay suficiente stock disponible',
    noPermission: 'No tienes permiso para registrar ventas',
    noBusiness: 'No se encontró el negocio del usuario',
    addProduct: 'Agrega al menos un producto a la venta',
    selectCreditClient: 'Selecciona un cliente para una venta a crédito',
    insufficientStockFor: 'Stock insuficiente para',
    minimumStockBlocked: 'No puedes facturar porque esta venta dejaría el stock por debajo del mínimo configurado para',
    invalidPriceStart: 'El producto',
    invalidPriceEnd: 'no tiene precio válido',
    confirmTitle: 'Confirmar venta',
    confirmMessage: '¿Deseas registrar esta venta por',
    confirmText: 'Registrar venta',
    cancelText: 'Cancelar',
    successSale: 'Venta registrada correctamente. Puedes imprimir el recibo.',
    active: 'Activa',
    cancelled: 'Anulada',
    saveError: 'Error al registrar la venta',
  },
  en: {
    loading: 'Loading sales...',
    missingTitle: 'User has no assigned business',
    missingText: 'Login works, but this user does not exist in the usuarios table yet or does not have an assigned negocio_id.',
    pageTitle: 'Sales',
    sellerSubtitle: 'Point of sale enabled for sellers',
    sellerBasicView: 'Seller view: create sales, collect payments, and view available products. Costs and sensitive financial data are hidden.',
    adminSubtitle: 'Point of sale and transaction registration',
    searchPlaceholder: 'Search product by name or unit...',
    availableProducts: 'Available products',
    productsCount: 'products',
    stock: 'Stock',
    unit: 'unit',
    clickToAdd: 'Add',
    noProducts: 'No products found',
    cart: 'Cart',
    units: 'units',
    products: 'products',
    client: 'Client',
    generalClient: 'General client / no client',
    generalClientShort: 'General client',
    informalClient: 'Informal client',
    informalClientPlaceholder: 'Ex. Walk-in customer',
    paymentType: 'Payment type',
    cash: 'Cash',
    credit: 'Credit',
    creditDueDate: 'Due date',
    creditStatus: 'Credit status',
    creditPending: 'Pending',
    dueDateRequired: 'Select a due date for the credit sale',
    each: 'each',
    emptyCart: 'The cart is empty',
    totalUnits: 'Units',
    subtotal: 'Subtotal',
    discountPercent: 'Discount (%)',
    discount: 'Discount',
    total: 'Total',
    amountReceived: 'Amount received',
    paymentCurrency: 'Payment currency',
    systemCurrency: 'System currency',
    alternativeCurrency: 'Alternative currency',
    exchangeRate: 'Rate',
    convertedAmount: 'Converted amount',
    exchangeRateUnavailable: 'Set a daily exchange rate in Settings to accept another currency.',
    change: 'Change',
    appliedToDebt: 'Applied to debt',
    remainingDebt: 'Remaining debt',
    currentDebt: 'Current debt',
    creditBalance: 'Credit balance',
    extraAvailable: 'Available extra cash',
    applyExtraToDebt: 'Apply extra cash to debt',
    debtApplyHint: 'Turn this on if the client wants to use the remaining cash to reduce their previous debt.',
    noDebt: 'This client has no pending debt.',
    enterExtraCash: 'To apply cash to debt, the amount received must be greater than the sale total.',
    amountReceivedRequired: 'Amount received must cover the sale total',
    clear: 'Clear',
    saving: 'Saving...',
    charge: 'Charge',
    saleRegistered: 'Sale registered',
    receiptGenerated: 'Receipt generated',
    sale: 'Sale',
    soldProducts: 'Sold products',
    close: 'Close',
    printReceipt: 'Print receipt',
    receiptTitle: 'Sales receipt',
    date: 'Date',
    time: 'Time',
    seller: 'Seller',
    loggedUser: 'Logged in user',
    priceIncreased: 'Price increased',
    priceDecreased: 'Price decreased',
    sellerDiscountLimit: 'Sellers can only apply up to {limit}% discount',
    payment: 'Payment',
    product: 'Product',
    quantityShort: 'Qty.',
    price: 'Price',
    thanks: 'Thank you for your purchase.',
    blockedPrint: 'The browser blocked the print window',
    loadError: 'Error loading sales data',
    noStock: 'This product has no available stock',
    notEnoughStock: 'Not enough stock available',
    noPermission: 'You do not have permission to register sales',
    noBusiness: 'The user business was not found',
    addProduct: 'Add at least one product to the sale',
    selectCreditClient: 'Select a client for a credit sale',
    insufficientStockFor: 'Insufficient stock for',
    minimumStockBlocked: 'You cannot invoice because this sale would leave stock below the configured minimum for',
    invalidPriceStart: 'Product',
    invalidPriceEnd: 'does not have a valid price',
    confirmTitle: 'Confirm sale',
    confirmMessage: 'Do you want to register this sale for',
    confirmText: 'Register sale',
    cancelText: 'Cancel',
    successSale: 'Sale registered successfully. You can print the receipt.',
    active: 'Active',
    cancelled: 'Cancelled',
    saveError: 'Error registering the sale',
  },
} as const;

type CurrencySettings = {
  code: string;
  symbol: string;
};

type ExchangeRateSettings = {
  secondaryCurrency: string;
  rate: number | null;
  updatedAt: string | null;
};

const DEFAULT_CURRENCY: CurrencySettings = {
  code: 'USD',
  symbol: '$'
};

const DEFAULT_EXCHANGE_RATE: ExchangeRateSettings = {
  secondaryCurrency: 'USD',
  rate: null,
  updatedAt: null
};

const DEFAULT_SELLER_DISCOUNT_LIMIT = 15;

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

function normalizeCurrencySettings(data: Record<string, unknown> | null | undefined): CurrencySettings {
  const rawCode =
    data?.moneda_codigo ||
    data?.monedaCode ||
    data?.currency_code ||
    data?.currencyCode ||
    data?.moneda ||
    data?.currency ||
    DEFAULT_CURRENCY.code;

  const code = String(rawCode || DEFAULT_CURRENCY.code).trim().toUpperCase();

  const rawSymbol =
    data?.moneda_simbolo ||
    data?.monedaSimbolo ||
    data?.currency_symbol ||
    data?.currencySymbol ||
    data?.simbolo_moneda ||
    data?.simboloMoneda ||
    data?.simbolo ||
    data?.simboloMonedaNegocio ||
    data?.currencySymbolBusiness;

  const symbol = String(rawSymbol || getCurrencySymbol(code)).trim() || getCurrencySymbol(code);

  return { code, symbol };
}

function normalizeExchangeRateSettings(data: Record<string, unknown> | null | undefined): ExchangeRateSettings {
  const rawSecondaryCurrency =
    data?.moneda_secundaria ||
    data?.secondary_currency ||
    data?.monedaSecundaria ||
    DEFAULT_EXCHANGE_RATE.secondaryCurrency;

  const rawRate = Number(data?.tasa_cambio || data?.exchange_rate || data?.tasaCambio || 0);

  return {
    secondaryCurrency: String(rawSecondaryCurrency || DEFAULT_EXCHANGE_RATE.secondaryCurrency).trim().toUpperCase(),
    rate: Number.isFinite(rawRate) && rawRate > 0 ? rawRate : null,
    updatedAt: data?.tasa_actualizada_en || data?.exchange_rate_updated_at || data?.tasaActualizadaEn
      ? String(data?.tasa_actualizada_en || data?.exchange_rate_updated_at || data?.tasaActualizadaEn)
      : null
  };
}

function normalizeSellerDiscountLimit(data: Record<string, unknown> | null | undefined) {
  const rawLimit =
    data?.seller_discount_limit ??
    data?.sellerDiscountLimit ??
    DEFAULT_SELLER_DISCOUNT_LIMIT;
  const numericLimit = Number(rawLimit);

  if (!Number.isFinite(numericLimit)) return DEFAULT_SELLER_DISCOUNT_LIMIT;
  return Math.min(100, Math.max(0, numericLimit));
}

function getProductPriceTrend(product: Producto) {
  const previousPrice = Number(product.precio_anterior ?? product.precio);
  const currentPrice = Number(product.precio || 0);

  if (Number.isFinite(previousPrice) && previousPrice > 0 && currentPrice > previousPrice) return 'up';
  if (Number.isFinite(previousPrice) && previousPrice > 0 && currentPrice < previousPrice) return 'down';
  return product.precio_cambio || null;
}

function formatCurrency(value: number | null | undefined) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatMoney(value: number | null | undefined, currency: CurrencySettings) {
  return `${currency.symbol} ${formatCurrency(value)}`;
}

function formatSaleCode(id: number) {
  return `V-${String(id).padStart(4, '0')}`;
}

function isCancelledSale(estado: string | null | undefined) {
  return estado === 'anulada' || estado === 'cancelled';
}

function getLocalDateString(date: Date) {
  return date.toLocaleDateString('en-CA');
}

function getDefaultCreditDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return getLocalDateString(date);
}

export function SalesPage() {
  const { user, userProfile } = useAuth();
  const roleFlags = getUserRoleFlags(userProfile);
  const isOwner = roleFlags.isOwner;
  const isAdmin = roleFlags.isAdmin;
  const isSeller = roleFlags.isSeller;
  const isSuperAdmin = roleFlags.isSuperAdmin;
  const canCreateSale = isOwner || isAdmin || isSeller || isSuperAdmin;
  const { showToast, showConfirm } = useNotification();

  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('MatMax Business Suite');
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY);
  const [exchangeRateSettings, setExchangeRateSettings] = useState<ExchangeRateSettings>(DEFAULT_EXCHANGE_RATE);
  const [sellerDiscountLimit, setSellerDiscountLimit] = useState(DEFAULT_SELLER_DISCOUNT_LIMIT);
  const [products, setProducts] = useState<Producto[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [informalClientName, setInformalClientName] = useState('');
  const [tipoPago, setTipoPago] = useState<'Contado' | 'Crédito'>('Contado');
  const [fechaVencimiento, setFechaVencimiento] = useState(getDefaultCreditDueDate());
  const [discountPercent, setDiscountPercent] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState<'system' | 'secondary'>('system');
  const [applyExtraToDebt, setApplyExtraToDebt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [missingNegocio, setMissingNegocio] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);
  const { language } = useLanguage();
  const t = salesCopy[language];
  const profileData = userProfile as Record<string, unknown> | null | undefined;
  const loggedUserName = String(
    profileData?.nombre ||
    profileData?.name ||
    profileData?.full_name ||
    profileData?.fullName ||
    user?.email ||
    'Usuario'
  );

  const loggedUserEmail = String(profileData?.email || user?.email || '');
  const loggedUserRole = roleFlags.role;

  const filteredProducts = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return products;
    return products.filter((product) =>
      product.nombre.toLowerCase().includes(search) ||
      (product.unidad || '').toLowerCase().includes(search)
    );
  }, [products, searchTerm]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.cantidad * item.precio, 0), [cart]);
  const maxDiscountPercent = isSeller ? sellerDiscountLimit : 100;
  const formattedMaxDiscountPercent = formatCurrency(maxDiscountPercent).replace(/\.00$/, '');

  const safeDiscountPercent = useMemo(() => {
    const value = Number(discountPercent || 0);
    if (Number.isNaN(value)) return 0;
    return Math.min(Math.max(value, 0), maxDiscountPercent);
  }, [discountPercent, maxDiscountPercent]);

  const discountAmount = useMemo(() => (subtotal * safeDiscountPercent) / 100, [subtotal, safeDiscountPercent]);
  const isDiscountBlocked = isSeller && Number(discountPercent || 0) > maxDiscountPercent;
  const totalToPay = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);
  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.cantidad, 0), [cart]);
  const selectedClient = useMemo(() => clients.find((client) => client.id.toString() === selectedClientId) || null, [clients, selectedClientId]);
  const rawAmountReceivedNumber = Number(amountReceived || 0);
  const amountReceivedNumber = Number.isFinite(rawAmountReceivedNumber) ? rawAmountReceivedNumber : 0;
  const canUseSecondaryCurrency = Boolean(exchangeRateSettings.rate && exchangeRateSettings.rate > 0);
  const activePaymentCurrencyCode = paymentCurrency === 'secondary' ? exchangeRateSettings.secondaryCurrency : currencySettings.code;
  const convertedAmountReceived = paymentCurrency === 'secondary'
    ? amountReceivedNumber * Number(exchangeRateSettings.rate || 0)
    : amountReceivedNumber;
  const effectiveAmountReceived = tipoPago === 'Contado'
    ? (amountReceived.trim() ? convertedAmountReceived : totalToPay)
    : 0;
  const originalAmountReceived = tipoPago === 'Contado'
    ? (amountReceived.trim()
      ? amountReceivedNumber
      : paymentCurrency === 'secondary' && Number(exchangeRateSettings.rate || 0) > 0
        ? totalToPay / Number(exchangeRateSettings.rate || 0)
        : totalToPay)
    : 0;
  const selectedClientBalance = Number(selectedClient?.saldo || 0);
  const selectedClientDebt = Math.max(0, selectedClientBalance);
  const selectedClientCreditBalance = Math.max(0, -selectedClientBalance);
  const extraCash = Math.max(0, effectiveAmountReceived - totalToPay);
  const amountAppliedToDebt =
    tipoPago === 'Contado' && applyExtraToDebt && selectedClient && selectedClientDebt > 0
      ? Math.min(extraCash, selectedClientDebt)
      : 0;
  const changeAmount = Math.max(0, extraCash - amountAppliedToDebt);
  const remainingClientDebt = Math.max(0, selectedClientDebt - amountAppliedToDebt);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        setProducts([]);
        setClients([]);
        setBusinessName('MatMax Business Suite');
        setCurrencySettings(DEFAULT_CURRENCY);
        setExchangeRateSettings(DEFAULT_EXCHANGE_RATE);
        setSellerDiscountLimit(DEFAULT_SELLER_DISCOUNT_LIMIT);
        setMissingNegocio(false);
        return;
      }

      const currentNegocioId = userProfile?.negocio_id || null;
      setNegocioId(currentNegocioId);

      if (!currentNegocioId) {
        setProducts([]);
        setClients([]);
        setBusinessName('MatMax Business Suite');
        setCurrencySettings(DEFAULT_CURRENCY);
        setExchangeRateSettings(DEFAULT_EXCHANGE_RATE);
        setSellerDiscountLimit(DEFAULT_SELLER_DISCOUNT_LIMIT);
        setMissingNegocio(true);
        return;
      }

      const [productsResult, clientsResult, businessResult] = await Promise.all([
        supabase
          .from('productos')
          .select('id, negocio_id, nombre, unidad, precio, precio_anterior, precio_cambio, precio_actualizado_en, stock, minimo')
          .eq('negocio_id', currentNegocioId)
          .order('nombre', { ascending: true }),
        supabase.from('clientes').select('*').eq('negocio_id', currentNegocioId).order('nombre', { ascending: true }),
        supabase.from('negocios').select('*').eq('id', currentNegocioId).maybeSingle()
      ]);

      if (productsResult.error) throw productsResult.error;
      if (clientsResult.error) throw clientsResult.error;
      if (businessResult.error) throw businessResult.error;

      const normalizedProducts = ((productsResult.data || []) as ProductoRow[]).map((product) => ({
        ...product,
        costo: null
      })) as Producto[];

      setProducts(normalizedProducts);
      setClients(clientsResult.data || []);
      setBusinessName(businessResult.data?.nombre || 'MatMax Business Suite');
      setCurrencySettings(normalizeCurrencySettings(businessResult.data));
      setExchangeRateSettings(normalizeExchangeRateSettings(businessResult.data));
      setSellerDiscountLimit(normalizeSellerDiscountLimit(businessResult.data));
      setMissingNegocio(false);
    } catch (error) {
      console.error('Error loading sales data:', error);
      showToast(t.loadError, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t.loadError, user?.id, userProfile?.negocio_id]);

  useEffect(() => {
    loadData();
  }, [loadData, roleFlags.role]);

  function addToCart(product: Producto) {
    const stock = Number(product.stock || 0);
    if (stock <= 0) {
      showToast(t.noStock, 'error');
      return;
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.producto.id === product.id);

      if (existingItem) {
        if (existingItem.cantidad + 1 > stock) {
          showToast(t.notEnoughStock, 'error');
          return currentCart;
        }
        return currentCart.map((item) => item.producto.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      }

      return [...currentCart, { producto: product, cantidad: 1, precio: Number(product.precio || 0) }];
    });
  }

  function updateQuantity(productId: number, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.producto.id !== productId) return item;
        const stock = Number(item.producto.stock || 0);
        const safeQuantity = Math.min(quantity, stock);
        if (quantity > stock) showToast(t.notEnoughStock, 'error');
        return { ...item, cantidad: safeQuantity };
      })
    );
  }

  function removeFromCart(productId: number) {
    setCart((currentCart) => currentCart.filter((item) => item.producto.id !== productId));
  }

  function clearSale() {
    setCart([]);
    setSelectedClientId('');
    setInformalClientName('');
    setTipoPago('Contado');
    setFechaVencimiento(getDefaultCreditDueDate());
    setDiscountPercent('');
    setSearchTerm('');
    setAmountReceived('');
    setPaymentCurrency('system');
    setApplyExtraToDebt(false);
  }

  function printReceipt(receipt: ReceiptData) {
    const rows = receipt.items
      .map(
        (item) => `
          <tr>
            <td>${item.producto.nombre}</td>
            <td style="text-align:right;">${item.cantidad}</td>
            <td style="text-align:right;">${formatMoney(item.precio, { code: receipt.monedaCodigo, symbol: receipt.monedaSimbolo })}</td>
            <td style="text-align:right;">${formatMoney(item.cantidad * item.precio, { code: receipt.monedaCodigo, symbol: receipt.monedaSimbolo })}</td>
          </tr>
        `
      )
      .join('');

    const cancelled = isCancelledSale(receipt.estado);
    const receiptWindow = window.open('', '_blank', 'width=420,height=700');

    if (!receiptWindow) {
      showToast(t.blockedPrint, 'error');
      return;
    }

    receiptWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${t.receiptTitle} ${formatSaleCode(receipt.ventaId)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111; padding: 22px; }
            .receipt { max-width: 360px; margin: 0 auto; }
            h1 { font-size: 22px; margin: 0 0 6px; text-align: center; }
            .muted { color: #666; font-size: 12px; text-align: center; margin: 0; }
            .info { border-top: 1px dashed #bbb; border-bottom: 1px dashed #bbb; margin: 18px 0; padding: 12px 0; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { padding: 7px 0; border-bottom: 1px solid #eee; }
            th { text-align: left; }
            .total { display: flex; justify-content: space-between; margin-top: 16px; font-size: 18px; font-weight: 800; }
            .thanks { margin-top: 22px; text-align: center; font-size: 12px; color: #666; }
            .cancelled { margin: 10px auto 0; width: fit-content; border: 1px solid #fecaca; background: #fee2e2; color: #b91c1c; border-radius: 999px; padding: 6px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <h1>${receipt.negocioNombre}</h1>
            <p class="muted">${t.receiptTitle}</p>
            <p class="muted">${formatSaleCode(receipt.ventaId)}</p>
            ${cancelled ? `<p class="cancelled">${t.cancelled}</p>` : ''}
            <div class="info">
              <div><strong>${t.date}:</strong> ${receipt.fecha}</div>
              <div><strong>${t.time}:</strong> ${receipt.hora}</div>
              <div><strong>${t.seller}:</strong> ${receipt.vendedor}</div>
              <div><strong>${t.client}:</strong> ${receipt.cliente}</div>
              <div><strong>${t.payment}:</strong> ${receipt.tipoPago === 'Contado' ? t.cash : t.credit}</div>
            </div>
            <table><thead><tr><th>${t.product}</th><th style="text-align:right;">${t.quantityShort}</th><th style="text-align:right;">${t.price}</th><th style="text-align:right;">${t.total}</th></tr></thead><tbody>${rows}</tbody></table>
            <div class="total"><span>${t.subtotal}</span><span>${formatMoney(receipt.subtotal, { code: receipt.monedaCodigo, symbol: receipt.monedaSimbolo })}</span></div>
            <div class="total" style="font-size:14px; margin-top:8px;"><span>${t.discount} (${formatCurrency(receipt.descuentoPorcentaje)}%)</span><span>-${formatMoney(receipt.descuentoMonto, { code: receipt.monedaCodigo, symbol: receipt.monedaSimbolo })}</span></div>
            <div class="total" style="border-top:1px dashed #bbb; padding-top:10px;"><span>${t.total}</span><span>${formatMoney(receipt.total, { code: receipt.monedaCodigo, symbol: receipt.monedaSimbolo })}</span></div>
            <div class="info" style="border-top:none; margin-top:14px;">
              <div><strong>${t.amountReceived}:</strong> ${formatMoney(receipt.montoRecibido, { code: receipt.monedaCodigo, symbol: receipt.monedaSimbolo })}</div>
            ${receipt.monedaPago !== receipt.monedaCodigo ? `<div><strong>${t.paymentCurrency}:</strong> ${receipt.monedaPago} ${formatCurrency(receipt.montoRecibidoOriginal)}</div>` : ''}
            ${receipt.tasaCambio ? `<div><strong>${t.exchangeRate}:</strong> ${formatCurrency(receipt.tasaCambio)}</div>` : ''}
              ${receipt.aplicadoADeuda > 0 ? `<div><strong>${t.appliedToDebt}:</strong> ${formatMoney(receipt.aplicadoADeuda, { code: receipt.monedaCodigo, symbol: receipt.monedaSimbolo })}</div>` : ''}
              ${receipt.aplicadoADeuda > 0 ? `<div><strong>${t.remainingDebt}:</strong> ${formatMoney(receipt.deudaRestante, { code: receipt.monedaCodigo, symbol: receipt.monedaSimbolo })}</div>` : ''}
              <div><strong>${t.change}:</strong> ${formatMoney(receipt.cambio, { code: receipt.monedaCodigo, symbol: receipt.monedaSimbolo })}</div>
            </div>
            <div class="thanks">${t.thanks}</div>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);

    receiptWindow.document.close();
  }

  async function saveSale() {
    if (saving) return;
    if (!canCreateSale) {
      showToast(t.noPermission, 'error');
      return;
    }
    if (!user?.id) {
      showToast(t.noPermission, 'error');
      return;
    }
    if (!negocioId) {
      showToast(t.noBusiness, 'error');
      return;
    }
    if (cart.length === 0) {
      showToast(t.addProduct, 'error');
      return;
    }
    if (isDiscountBlocked) return;
    if (tipoPago === 'Crédito' && !selectedClientId) {
      showToast(t.selectCreditClient, 'error');
      return;
    }
    if (tipoPago === 'Crédito' && !fechaVencimiento) {
      showToast(t.dueDateRequired, 'error');
      return;
    }
    if (tipoPago === 'Contado' && paymentCurrency === 'secondary' && !canUseSecondaryCurrency) {
      showToast(t.exchangeRateUnavailable, 'error');
      return;
    }

    if (tipoPago === 'Contado' && amountReceived.trim() && effectiveAmountReceived < totalToPay) {
      showToast(t.amountReceivedRequired, 'error');
      return;
    }

    const invalidStockItem = cart.find((item) => item.cantidad > Number(item.producto.stock || 0));
    if (invalidStockItem) {
      showToast(`${t.insufficientStockFor} ${invalidStockItem.producto.nombre}`, 'error');
      return;
    }

    const minimumStockItem = cart.find((item) => {
      const currentStock = Number(item.producto.stock || 0);
      const minimumStock = Number(item.producto.minimo || 0);
      const nextStock = currentStock - item.cantidad;

      return minimumStock > 0 && nextStock < minimumStock;
    });

    if (minimumStockItem) {
      const currentStock = Number(minimumStockItem.producto.stock || 0);
      const minimumStock = Number(minimumStockItem.producto.minimo || 0);
      const nextStock = currentStock - minimumStockItem.cantidad;

      showToast(
        `${t.minimumStockBlocked} ${minimumStockItem.producto.nombre}. Stock actual: ${currentStock.toLocaleString('en-US')}. Mínimo: ${minimumStock.toLocaleString('en-US')}. Stock después: ${nextStock.toLocaleString('en-US')}.`,
        'error'
      );
      return;
    }

    const invalidPriceItem = cart.find((item) => Number(item.precio || 0) <= 0);
    if (invalidPriceItem) {
      showToast(`${t.invalidPriceStart} ${invalidPriceItem.producto.nombre} ${t.invalidPriceEnd}`, 'error');
      return;
    }

    const confirmed = await showConfirm({
      title: t.confirmTitle,
      message: `${t.confirmMessage} ${formatMoney(totalToPay, currencySettings)}?`,
      confirmText: t.confirmText,
      cancelText: t.cancelText,
      variant: 'warning'
    });

    if (!confirmed) return;

    try {
      setSaving(true);
      const saleDate = new Date();
      const today = saleDate.toLocaleDateString('en-CA');
      const saleTime = saleDate.toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' });
      const clienteId = selectedClientId ? Number(selectedClientId) : null;
      const receiptClientName = selectedClient?.nombre || informalClientName.trim() || t.generalClientShort;
      const saldoPendiente = tipoPago === 'Crédito' ? totalToPay : 0;
      const fechaVencimientoCredito = tipoPago === 'Crédito' ? fechaVencimiento : null;
      const estadoCredito = tipoPago === 'Crédito' ? 'pendiente' : null;

      const { data: ventaData, error: ventaError } = await supabase
        .from('ventas')
        .insert([
          {
            negocio_id: negocioId,
            cliente_id: clienteId,
            vendedor_id: user.id,
            vendedor_nombre: loggedUserName,
            fecha: today,
            subtotal,
            descuento: discountAmount,
            descuento_porcentaje: safeDiscountPercent,
            descuento_monto: discountAmount,
            total: totalToPay,
            tipo_pago: tipoPago,
            saldo_pendiente: saldoPendiente,
            fecha_vencimiento: fechaVencimientoCredito,
            estado_credito: estadoCredito,
            estado: 'activa'
          }
        ])
        .select('id, estado, subtotal, descuento, descuento_porcentaje, descuento_monto, vendedor_id, vendedor_nombre')
        .single();

      if (ventaError) throw ventaError;

      const ventaId = ventaData.id;
      const highDiscountThreshold = isSeller ? Math.max(1, sellerDiscountLimit * 0.8) : 10;
      const isHighDiscountSale = safeDiscountPercent >= highDiscountThreshold;
      const ventaItems = cart.map((item) => ({ venta_id: ventaId, producto_id: item.producto.id, cantidad: item.cantidad, precio: item.precio, total: item.cantidad * item.precio }));
      const { error: itemsError } = await supabase.from('venta_items').insert(ventaItems);
      if (itemsError) throw itemsError;

      await Promise.all(cart.map(async (item) => {
        const newStock = Number(item.producto.stock || 0) - item.cantidad;
        const { error } = await supabase.from('productos').update({ stock: newStock }).eq('id', item.producto.id).eq('negocio_id', negocioId);
        if (error) throw error;
      }));

      if (tipoPago === 'Crédito' && clienteId && selectedClient) {
        const newBalance = Number(selectedClient.saldo || 0) + totalToPay;
        const { error: clientError } = await supabase.from('clientes').update({ saldo: newBalance }).eq('id', clienteId).eq('negocio_id', negocioId);
        if (clientError) throw clientError;
      }

        if (tipoPago === 'Contado') {
          const paymentRows: Array<{
            negocio_id: string;
            cliente_id: number | null;
            venta_id: number | null;
            fecha: string;
            monto: number;
            moneda_pago?: string | null;
            monto_original?: number | null;
            tasa_cambio?: number | null;
          }> = [
            {
              negocio_id: negocioId,
              cliente_id: clienteId,
              venta_id: ventaId,
              fecha: today,
              monto: totalToPay,
              moneda_pago: activePaymentCurrencyCode,
              monto_original: paymentCurrency === 'secondary' && Number(exchangeRateSettings.rate || 0) > 0 ? totalToPay / Number(exchangeRateSettings.rate || 0) : totalToPay,
              tasa_cambio: paymentCurrency === 'secondary' ? exchangeRateSettings.rate : null
            }
          ];

          if (amountAppliedToDebt > 0 && clienteId) {
            paymentRows.push({
              negocio_id: negocioId,
              cliente_id: clienteId,
              venta_id: null,
              fecha: today,
              monto: amountAppliedToDebt,
              moneda_pago: activePaymentCurrencyCode,
              monto_original: paymentCurrency === 'secondary' && Number(exchangeRateSettings.rate || 0) > 0 ? amountAppliedToDebt / Number(exchangeRateSettings.rate || 0) : amountAppliedToDebt,
              tasa_cambio: paymentCurrency === 'secondary' ? exchangeRateSettings.rate : null
            });
          }

        const { error: pagoError } = await supabase.from('pagos').insert(paymentRows);
        if (pagoError) throw pagoError;

        if (amountAppliedToDebt > 0 && clienteId && selectedClient) {
          let remainingDebtPayment = amountAppliedToDebt;

          const { data: pendingCreditSales, error: pendingCreditSalesError } = await supabase
            .from('ventas')
            .select('id, saldo_pendiente')
            .eq('negocio_id', negocioId)
            .eq('cliente_id', clienteId)
            .gt('saldo_pendiente', 0)
            .order('fecha', { ascending: true })
            .order('id', { ascending: true });

          if (pendingCreditSalesError) throw pendingCreditSalesError;

          for (const pendingSale of pendingCreditSales || []) {
            if (remainingDebtPayment <= 0) break;

            const currentPendingBalance = Number(pendingSale.saldo_pendiente || 0);
            const paymentForThisSale = Math.min(remainingDebtPayment, currentPendingBalance);
            const nextPendingBalance = Math.max(0, currentPendingBalance - paymentForThisSale);

            const { error: pendingSaleUpdateError } = await supabase
              .from('ventas')
              .update({
                saldo_pendiente: nextPendingBalance,
                estado_credito: nextPendingBalance <= 0 ? 'pagado' : 'pendiente'
              })
              .eq('id', pendingSale.id)
              .eq('negocio_id', negocioId);

            if (pendingSaleUpdateError) throw pendingSaleUpdateError;

            remainingDebtPayment -= paymentForThisSale;
          }

          const { error: clientDebtError } = await supabase
            .from('clientes')
            .update({ saldo: remainingClientDebt })
            .eq('id', clienteId)
            .eq('negocio_id', negocioId);

          if (clientDebtError) throw clientDebtError;
        }
      }

      await logAudit({
        negocio_id: negocioId,
        user_id: user.id,
        user_name: loggedUserName,
        user_email: loggedUserEmail || undefined,
        user_role: loggedUserRole || undefined,
        action: 'CREATE_SALE',
        module: 'SALES',
        record_id: ventaId,
        description: `Venta ${formatSaleCode(ventaId)} creada por ${loggedUserName}`,
        new_data: {
          venta_id: ventaId,
          cliente_id: clienteId,
          cliente_nombre: receiptClientName,
          vendedor_id: user.id,
          vendedor_nombre: loggedUserName,
          tipo_pago: tipoPago,
          subtotal,
          descuento_porcentaje: safeDiscountPercent,
          descuento_monto: discountAmount,
          total: totalToPay,
          monto_recibido: effectiveAmountReceived,
          monto_recibido_original: originalAmountReceived,
          moneda_pago: activePaymentCurrencyCode,
          tasa_cambio: paymentCurrency === 'secondary' ? exchangeRateSettings.rate : null,
          aplicar_excedente_a_deuda: applyExtraToDebt,
          aplicado_a_deuda: amountAppliedToDebt,
          cambio: changeAmount,
          deuda_restante: remainingClientDebt,
          saldo_pendiente: saldoPendiente,
          fecha: today,
          productos: cart.map((item) => ({
            producto_id: item.producto.id,
            nombre: item.producto.nombre,
            cantidad: item.cantidad,
            precio: item.precio,
            total: item.cantidad * item.precio
          }))
        }
      });

      if (safeDiscountPercent > 0) {
        await logAudit({
          negocio_id: negocioId,
          user_id: user.id,
          user_name: loggedUserName,
          user_email: loggedUserEmail || undefined,
          user_role: loggedUserRole || undefined,
          action: isHighDiscountSale ? 'HIGH_DISCOUNT_SALE' : 'SALE_WITH_DISCOUNT',
          module: 'SALES',
          record_id: ventaId,
          description: `Venta ${formatSaleCode(ventaId)} registrada con ${formatCurrency(safeDiscountPercent)}% de descuento por ${loggedUserName}`,
          new_data: {
            venta_id: ventaId,
            vendedor_id: user.id,
            vendedor_nombre: loggedUserName,
            cliente_id: clienteId,
            cliente_nombre: receiptClientName,
            descuento_porcentaje: safeDiscountPercent,
            descuento_monto: discountAmount,
            subtotal,
            total: totalToPay,
            seller_discount_limit: isSeller ? sellerDiscountLimit : null
          }
        });
      }

      if (isHighDiscountSale) {
        const highDiscountNotificationPayload = {
          negocio_id: negocioId,
          user_id: null,
          audience: 'admin',
          title: language === 'es' ? 'Venta con descuento alto' : 'High discount sale',
          message:
            language === 'es'
              ? `${formatSaleCode(ventaId)} fue registrada por ${loggedUserName} con ${formatCurrency(safeDiscountPercent)}% de descuento. Total: ${formatMoney(totalToPay, currencySettings)}.`
              : `${formatSaleCode(ventaId)} was registered by ${loggedUserName} with ${formatCurrency(safeDiscountPercent)}% discount. Total: ${formatMoney(totalToPay, currencySettings)}.`,
          type: 'warning',
          category: 'sales',
          link: `invoices?sale=${ventaId}`,
          read: false
        };

        const { error: highDiscountNotificationError } = await supabase
          .from('notifications')
          .insert(highDiscountNotificationPayload);

        if (highDiscountNotificationError) {
          console.warn('High discount notification with category was not created:', highDiscountNotificationError);

          const { category: _highDiscountCategory, ...highDiscountNotificationFallbackPayload } = highDiscountNotificationPayload;
          const { error: fallbackHighDiscountNotificationError } = await supabase
            .from('notifications')
            .insert(highDiscountNotificationFallbackPayload);

          if (fallbackHighDiscountNotificationError) {
            console.warn('High discount notification fallback was not created:', fallbackHighDiscountNotificationError);
          }
        }
      }

      const salesNotificationPayload = {
        negocio_id: negocioId,
        user_id: null,
        audience: 'admin',
        title: language === 'es' ? 'Venta registrada' : 'Sale registered',
        message:
          language === 'es'
            ? `${formatSaleCode(ventaId)} registrada por ${loggedUserName} por ${formatMoney(totalToPay, currencySettings)}.`
            : `${formatSaleCode(ventaId)} registered by ${loggedUserName} for ${formatMoney(totalToPay, currencySettings)}.`,
        type: 'success',
        category: 'sales',
        link: `invoices?sale=${ventaId}`,
        read: false
      };

      const { error: salesNotificationError } = await supabase
        .from('notifications')
        .insert(salesNotificationPayload);

      if (salesNotificationError) {
        console.warn('Sales notification with category was not created:', salesNotificationError);

        const { category: _salesNotificationCategory, ...salesNotificationFallbackPayload } = salesNotificationPayload;
        const { error: fallbackSalesNotificationError } = await supabase
          .from('notifications')
          .insert(salesNotificationFallbackPayload);

        if (fallbackSalesNotificationError) {
          console.warn('Sales notification fallback was not created:', fallbackSalesNotificationError);
        }
      }

      setLastReceipt({
        ventaId,
        negocioNombre: businessName,
        fecha: today,
        hora: saleTime,
        vendedor: ventaData.vendedor_nombre || loggedUserName,
        cliente: receiptClientName,
        tipoPago,
        subtotal: Number(ventaData.subtotal ?? subtotal),
        descuentoPorcentaje: Number(ventaData.descuento_porcentaje ?? safeDiscountPercent),
        descuentoMonto: Number(ventaData.descuento_monto ?? ventaData.descuento ?? discountAmount),
        total: totalToPay,
        montoRecibido: effectiveAmountReceived,
        montoRecibidoOriginal: originalAmountReceived,
        monedaPago: activePaymentCurrencyCode,
        tasaCambio: paymentCurrency === 'secondary' ? exchangeRateSettings.rate : null,
        aplicadoADeuda: amountAppliedToDebt,
        cambio: tipoPago === 'Contado' ? changeAmount : 0,
        deudaRestante: remainingClientDebt,
        items: cart,
        estado: ventaData.estado || 'activa',
        monedaCodigo: currencySettings.code,
        monedaSimbolo: currencySettings.symbol
      });
      showToast(t.successSale, 'success');
      clearSale();
      await loadData();
    } catch (error) {
      console.error('Error saving sale:', error);
      showToast(t.saveError, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="rounded-2xl border border-[#e9e2d3] bg-white/80 px-6 py-4 text-sm font-bold text-[#71717a] shadow-matmax-soft">{t.loading}</div>
      </div>
    );
  }

  if (missingNegocio) {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#fbfaf7] p-4 sm:p-6">
        <div className="w-full max-w-xl rounded-[2rem] border border-red-200 bg-white/90 p-5 text-center shadow-matmax-soft sm:p-8">
          <h1 className="mb-3 text-xl font-serif font-bold text-red-700 sm:text-2xl">{t.missingTitle}</h1>
          <p className="mb-4 text-sm text-[#71717a] sm:text-base">{t.missingText}</p>
          <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4 text-left text-sm text-[#3f3f46]"><p className="mb-2 font-black">User ID:</p><code className="break-all">{user?.id}</code></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden text-[#08080b] sm:space-y-6">
      <section className="relative min-w-0 overflow-hidden rounded-[2rem] border border-[#e9e2d3]/80 bg-[#fffdf8]/85 p-5 shadow-[0_24px_70px_rgba(15,15,15,0.07)] backdrop-blur-2xl sm:p-7 xl:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,197,66,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.88),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f4c542]/60 to-transparent" />
        <div className="relative z-10 flex min-w-0 flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#eadfca] bg-white/75 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6a16] shadow-sm backdrop-blur-xl"><Sparkles size={14} />MatMax Business Suite</div>
            <h1 className="mb-3 text-4xl font-black tracking-tight text-[#050505] sm:text-5xl xl:text-6xl">{t.pageTitle}</h1>
            <p className="max-w-3xl text-sm font-bold uppercase tracking-[0.18em] text-[#71717a] sm:text-base">
              {isSeller ? t.sellerSubtitle : t.adminSubtitle}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-[1.5rem] border border-[#e9e2d3] bg-white/75 p-3 shadow-sm backdrop-blur-xl sm:min-w-[320px]">
            <div className="rounded-2xl bg-[#fbfaf7] px-4 py-3"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.products}</p><p className="mt-1 text-2xl font-black text-[#050505]">{products.length.toLocaleString('en-US')}</p></div>
            <div className="rounded-2xl bg-[#050505] px-4 py-3 text-white"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f4c542]">{t.cart}</p><p className="mt-1 text-2xl font-black text-white">{cart.length.toLocaleString('en-US')}</p></div>
          </div>
        </div>
      </section>

      {isSeller && (
        <section className="rounded-[1.5rem] border border-[#e9e2d3] bg-[#fbfaf7] px-4 py-3 text-sm font-bold text-[#71717a] shadow-sm">
          {t.sellerBasicView}
        </section>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]">
        <div className="min-w-0 space-y-4 sm:space-y-6">
          <section className="rounded-[2rem] border border-[#e9e2d3]/80 bg-white/82 p-4 shadow-[0_18px_55px_rgba(15,15,15,0.055)] backdrop-blur-2xl sm:p-5">
            <div className="relative"><Search className="absolute left-4 top-1/2 shrink-0 -translate-y-1/2 transform text-[#a1a1aa]" size={20} /><Input type="text" placeholder={t.searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11" /></div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-[2rem] border border-[#e9e2d3]/80 bg-white/90 shadow-[0_22px_65px_rgba(15,15,15,0.06)] backdrop-blur-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f1ebdf] bg-white/75 px-5 py-5 backdrop-blur-xl sm:px-6">
              <div><p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#8a6a16]">{t.availableProducts}</p><h2 className="mt-1 text-xl font-black text-[#050505] sm:text-2xl">{filteredProducts.length.toLocaleString('en-US')} {t.productsCount}</h2></div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e9e2d3] bg-[#fbfaf7] px-4 py-2 text-sm font-black text-[#71717a] shadow-sm"><Package size={16} />{products.length.toLocaleString('en-US')}</span>
            </div>

            <div className="grid max-h-[620px] gap-3 overflow-y-auto p-3 sm:grid-cols-2 sm:p-4 2xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const stock = Number(product.stock || 0);
                const isOutOfStock = stock <= 0;
                const priceTrend = getProductPriceTrend(product);
                const previousPrice = Number(product.precio_anterior || 0);
                const trendTitle = priceTrend === 'up'
                  ? `${t.priceIncreased}${previousPrice > 0 ? `: ${formatMoney(previousPrice, currencySettings)} → ${formatMoney(product.precio, currencySettings)}` : ''}`
                  : priceTrend === 'down'
                    ? `${t.priceDecreased}${previousPrice > 0 ? `: ${formatMoney(previousPrice, currencySettings)} → ${formatMoney(product.precio, currencySettings)}` : ''}`
                    : '';

                return (
                  <button key={product.id} type="button" onClick={() => addToCart(product)} disabled={isOutOfStock} className="group relative min-w-0 overflow-hidden rounded-[1.5rem] border border-[#ece5d7] bg-[#fffdf8]/92 p-4 text-left shadow-[0_14px_34px_rgba(15,15,15,0.045)] transition-all duration-300 hover:-translate-y-1 hover:border-[#f4c542]/40 hover:bg-white hover:shadow-[0_24px_55px_rgba(15,15,15,0.09)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.12),transparent_34%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="relative z-10 flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0 flex-1"><h3 className="break-words text-base font-black leading-snug text-[#050505]">{product.nombre}</h3><p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[#8a6a16]">{t.stock}: {stock.toLocaleString('en-US')} {product.unidad || t.unit}</p></div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542] shadow-[0_14px_30px_rgba(0,0,0,0.18)]"><Plus size={18} /></div>
                    </div>
                    <div className="relative z-10 mt-4 flex items-end justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="break-words text-2xl font-black leading-none tracking-tight text-[#8a6a16]">{formatMoney(product.precio, currencySettings)}</p>
                        {priceTrend === 'up' && (
                          <span title={trendTitle} aria-label={trendTitle} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                            <TrendingUp size={17} />
                          </span>
                        )}
                        {priceTrend === 'down' && (
                          <span title={trendTitle} aria-label={trendTitle} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700">
                            <TrendingDown size={17} />
                          </span>
                        )}
                      </div>
                      <span className="rounded-full bg-[#fbfaf7] px-3 py-1 text-[11px] font-black text-[#71717a] transition group-hover:bg-[#fff4c7] group-hover:text-[#8a6a16]">{t.clickToAdd}</span>
                    </div>
                  </button>
                );
              })}
              {filteredProducts.length === 0 && <div className="col-span-full bg-[#fbfaf7] py-12 text-center font-semibold text-[#71717a]">{t.noProducts}</div>}
            </div>
          </section>
        </div>

        <aside className="min-w-0 overflow-hidden rounded-[2rem] border border-[#e9e2d3]/80 bg-white/95 shadow-[0_22px_70px_rgba(15,15,15,0.08)] backdrop-blur-2xl xl:sticky xl:top-24 xl:h-fit">
          <div className="flex min-w-0 items-center gap-3 border-b border-[#e9e2d3] bg-[#050505] px-4 py-4 text-white sm:px-6 sm:py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4c542] text-[#050505] shadow-[0_14px_34px_rgba(244,197,66,0.24)]"><ShoppingCart className="shrink-0" size={22} /></div>
            <div className="min-w-0"><h2 className="truncate text-lg font-black text-white">{t.cart}</h2><p className="truncate text-sm font-semibold text-white/55">{totalItems.toLocaleString('en-US')} {t.units} · {cart.length.toLocaleString('en-US')} {t.products}</p></div>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            <Select
              label={t.client}
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setApplyExtraToDebt(false);
                if (e.target.value) setInformalClientName('');
              }}
              options={[
                { value: '', label: t.generalClient },
                ...clients.map((client) => ({
                  value: client.id.toString(),
                  label: `${client.nombre}${Number(client.saldo || 0) > 0 ? ` · ${t.currentDebt}: ${formatMoney(client.saldo, currencySettings)}` : Number(client.saldo || 0) < 0 ? ` · ${t.creditBalance}: ${formatMoney(Math.abs(Number(client.saldo || 0)), currencySettings)}` : ''}`
                }))
              ]}
            />
            {selectedClient && (
              <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] px-4 py-3 text-sm shadow-sm">
                <div className="flex items-center justify-between gap-3 text-[#71717a]">
                  <span className="font-bold">{selectedClientCreditBalance > 0 ? t.creditBalance : t.currentDebt}</span>
                  <span className={`font-black ${selectedClientDebt > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                    {formatMoney(selectedClientCreditBalance > 0 ? selectedClientCreditBalance : selectedClientDebt, currencySettings)}
                  </span>
                </div>
                {selectedClientDebt <= 0 && selectedClientCreditBalance <= 0 && <p className="mt-1 text-xs font-semibold text-[#71717a]">{t.noDebt}</p>}
              </div>
            )}
            {!selectedClientId && <Input label={t.informalClient} value={informalClientName} onChange={(e) => setInformalClientName(e.target.value)} placeholder={t.informalClientPlaceholder} />}
            <div>
              <label className="mb-2.5 block text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.paymentType}</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => { setTipoPago('Contado'); setFechaVencimiento(getDefaultCreditDueDate()); }} className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-black transition-all ${tipoPago === 'Contado' ? 'border-[#050505] bg-[#050505] text-[#f4c542] shadow-[0_14px_34px_rgba(0,0,0,0.22)]' : 'border-[#e9e2d3] bg-white text-[#71717a] hover:border-[#f4c542]/40 hover:bg-[#fff9e8] hover:text-[#050505]'}`}><Banknote className="shrink-0" size={20} />{t.cash}</button>
                <button type="button" onClick={() => { setTipoPago('Crédito'); setApplyExtraToDebt(false); if (!fechaVencimiento) setFechaVencimiento(getDefaultCreditDueDate()); }} className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-black transition-all ${tipoPago === 'Crédito' ? 'border-[#f4c542]/50 bg-[#fff4c7] text-[#8a6a16] shadow-[0_14px_34px_rgba(244,197,66,0.14)]' : 'border-[#e9e2d3] bg-white text-[#71717a] hover:border-[#f4c542]/40 hover:bg-[#fff9e8] hover:text-[#050505]'}`}><CreditCard className="shrink-0" size={20} />{t.credit}</button>
              </div>
            </div>

            {tipoPago === 'Crédito' && (
              <div className="rounded-[1.25rem] border border-[#f4c542]/30 bg-[#fff9e8] p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-3"><Input label={t.creditDueDate} type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} min={getLocalDateString(new Date())} required /><div className="rounded-2xl border border-[#e9e2d3] bg-white/80 px-4 py-3"><p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.creditStatus}</p><span className="inline-flex rounded-full border border-[#f4c542]/30 bg-[#fff4c7] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#8a6a16]">{t.creditPending}</span></div></div>
              </div>
            )}

            <div className="max-h-[340px] space-y-3 overflow-y-auto border-t border-[#f1ebdf] pt-4">
              {cart.map((item) => (
                <div key={item.producto.id} className="min-w-0 rounded-2xl border border-[#e9e2d3] bg-[#fffdf8] p-4 shadow-sm transition-all duration-300 hover:border-[#f4c542]/30 hover:bg-white hover:shadow-[0_14px_34px_rgba(15,15,15,0.06)]">
                  <div className="mb-3 flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="truncate font-black text-[#050505]">{item.producto.nombre}</p><p className="text-sm text-[#71717a]">{formatMoney(item.precio, currencySettings)} {t.each}</p></div><button type="button" onClick={() => removeFromCart(item.producto.id)} className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-600 transition-all hover:-translate-y-0.5 hover:bg-red-100"><Trash2 className="shrink-0" size={18} /></button></div>
                  <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><button type="button" onClick={() => updateQuantity(item.producto.id, item.cantidad - 1)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#d9ceb8] bg-white text-[#050505] transition-all hover:-translate-y-0.5 hover:bg-[#fff9e8]"><Minus className="shrink-0" size={16} /></button><span className="w-10 text-center font-semibold">{item.cantidad}</span><button type="button" onClick={() => updateQuantity(item.producto.id, item.cantidad + 1)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#d9ceb8] bg-white text-[#050505] transition-all hover:-translate-y-0.5 hover:bg-[#fff9e8]"><Plus className="shrink-0" size={16} /></button></div><p className="shrink-0 whitespace-nowrap font-bold text-[#050505]">{formatMoney(item.cantidad * item.precio, currencySettings)}</p></div>
                </div>
              ))}
              {cart.length === 0 && <div className="rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] py-10 text-center font-semibold text-[#71717a]">{t.emptyCart}</div>}
            </div>

            <div className="space-y-4 border-t border-[#e9e2d3] pt-4">
              <Input label={isSeller ? `${t.discountPercent} · Max ${formattedMaxDiscountPercent}%` : t.discountPercent} type="number" min="0" max={String(maxDiscountPercent)} step="0.01" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} placeholder="0" />
              {isDiscountBlocked && <p className="-mt-2 text-xs font-black text-red-600">{t.sellerDiscountLimit.replace('{limit}', formattedMaxDiscountPercent)}</p>}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-[#71717a]"><span>{t.totalUnits}</span><span>{totalItems.toLocaleString('en-US')}</span></div>
                <div className="flex items-center justify-between text-sm text-[#71717a]"><span>{t.subtotal}</span><span>{formatMoney(subtotal, currencySettings)}</span></div>
                {discountAmount > 0 && <div className="flex items-center justify-between text-sm font-semibold text-red-600"><span>{t.discount} ({formatCurrency(safeDiscountPercent)}%)</span><span>-{formatMoney(discountAmount, currencySettings)}</span></div>}
                <div className="flex items-center justify-between gap-4 text-lg"><span className="font-semibold text-[#3f3f46]">{t.total}</span><span className="break-words text-right text-2xl font-black text-[#8a6a16] sm:text-3xl">{formatMoney(totalToPay, currencySettings)}</span></div>
              </div>

              {tipoPago === 'Contado' && (
                <div className="space-y-3 rounded-[1.25rem] border border-[#e9e2d3] bg-[#fbfaf7] p-4 shadow-sm">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setPaymentCurrency('system')}
                      className={`rounded-2xl border px-4 py-3 text-left transition-all ${paymentCurrency === 'system' ? 'border-[#050505] bg-[#050505] text-[#f4c542]' : 'border-[#e9e2d3] bg-white text-[#71717a] hover:bg-[#fff9e8]'}`}
                    >
                      <span className="block text-[10px] font-black uppercase tracking-[0.16em]">{t.systemCurrency}</span>
                      <span className="mt-1 block text-sm font-black">{currencySettings.code}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentCurrency('secondary')}
                      disabled={!canUseSecondaryCurrency}
                      className={`rounded-2xl border px-4 py-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${paymentCurrency === 'secondary' ? 'border-[#050505] bg-[#050505] text-[#f4c542]' : 'border-[#e9e2d3] bg-white text-[#71717a] hover:bg-[#fff9e8]'}`}
                    >
                      <span className="block text-[10px] font-black uppercase tracking-[0.16em]">{t.alternativeCurrency}</span>
                      <span className="mt-1 block text-sm font-black">{exchangeRateSettings.secondaryCurrency}</span>
                    </button>
                  </div>

                  <Input label={`${t.amountReceived} · ${activePaymentCurrencyCode}`} type="number" min="0" step="0.01" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} placeholder={formatCurrency(paymentCurrency === 'secondary' && Number(exchangeRateSettings.rate || 0) > 0 ? totalToPay / Number(exchangeRateSettings.rate || 0) : totalToPay)} />

                  {paymentCurrency === 'secondary' && (
                    <div className="space-y-2 rounded-2xl border border-[#e9e2d3] bg-white/80 px-4 py-3 text-sm">
                      {canUseSecondaryCurrency ? (
                        <>
                          <div className="flex items-center justify-between gap-3 text-[#71717a]"><span>{t.exchangeRate}</span><span className="font-black text-[#050505]">1 {exchangeRateSettings.secondaryCurrency} = {formatMoney(exchangeRateSettings.rate, currencySettings)}</span></div>
                          <div className="flex items-center justify-between gap-3 text-[#71717a]"><span>{t.convertedAmount}</span><span className="font-black text-[#050505]">{formatMoney(effectiveAmountReceived, currencySettings)}</span></div>
                        </>
                      ) : (
                        <p className="text-xs font-black text-red-600">{t.exchangeRateUnavailable}</p>
                      )}
                    </div>
                  )}
                  {selectedClient && (
                    <div className="space-y-3 rounded-2xl border border-[#e9e2d3] bg-white/80 px-4 py-3 text-sm">
                      <div className="flex items-center justify-between gap-3 text-[#71717a]"><span>{selectedClientCreditBalance > 0 ? t.creditBalance : t.currentDebt}</span><span className={`font-black ${selectedClientDebt > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatMoney(selectedClientCreditBalance > 0 ? selectedClientCreditBalance : selectedClientDebt, currencySettings)}</span></div>
                      <div className="flex items-center justify-between gap-3 text-[#71717a]"><span>{t.extraAvailable}</span><span className="font-black text-[#050505]">{formatMoney(extraCash, currencySettings)}</span></div>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedClientDebt > 0 && extraCash > 0) {
                            setApplyExtraToDebt((current) => !current);
                          }
                        }}
                        disabled={selectedClientDebt <= 0 || extraCash <= 0}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left font-black transition-all disabled:cursor-not-allowed disabled:opacity-50 ${applyExtraToDebt ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#e9e2d3] bg-[#fbfaf7] text-[#71717a] hover:border-[#f4c542]/40 hover:bg-[#fff9e8] hover:text-[#050505]'}`}
                      >
                        <span>{t.applyExtraToDebt}</span>
                        <span className={`h-6 w-11 rounded-full p-1 transition-all ${applyExtraToDebt ? 'bg-emerald-600' : 'bg-[#d9ceb8]'}`}>
                          <span className={`block h-4 w-4 rounded-full bg-white transition-all ${applyExtraToDebt ? 'translate-x-5' : 'translate-x-0'}`} />
                        </span>
                      </button>
                      <p className="text-xs font-semibold leading-relaxed text-[#71717a]">
                        {selectedClientCreditBalance > 0 ? t.noDebt : selectedClientDebt <= 0 ? t.noDebt : extraCash <= 0 ? t.enterExtraCash : t.debtApplyHint}
                      </p>
                      <div className="flex items-center justify-between gap-3 text-[#71717a]"><span>{t.appliedToDebt}</span><span className="font-black text-emerald-700">{formatMoney(amountAppliedToDebt, currencySettings)}</span></div>
                      <div className="flex items-center justify-between gap-3 text-[#71717a]"><span>{t.remainingDebt}</span><span className="font-black text-[#050505]">{formatMoney(remainingClientDebt, currencySettings)}</span></div>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#e9e2d3] bg-white/80 px-4 py-3 text-sm text-[#71717a]">
                    <span>{t.change}</span>
                    <span className="font-black text-[#050505]">{formatMoney(changeAmount, currencySettings)}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Button type="button" variant="secondary" onClick={clearSale} disabled={saving || cart.length === 0}>{t.clear}</Button><Button type="button" onClick={saveSale} disabled={saving || cart.length === 0 || totalToPay <= 0 || isDiscountBlocked}>{saving ? t.saving : `${t.charge} ${formatMoney(totalToPay, currencySettings)}`}</Button></div>
            </div>
          </div>
        </aside>
      </div>

      <Modal isOpen={!!lastReceipt} onClose={() => setLastReceipt(null)} title={t.saleRegistered}>
        {lastReceipt && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-5 text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.receiptGenerated}</p>
              <h2 className="mt-2 text-3xl font-black text-[#050505]">{formatSaleCode(lastReceipt.ventaId)}</h2>
              <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${isCancelledSale(lastReceipt.estado) ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {isCancelledSale(lastReceipt.estado) ? t.cancelled : t.active}
              </span>
              <p className="mt-2 text-sm font-semibold text-[#71717a]">
                {lastReceipt.fecha} · {lastReceipt.hora} · {lastReceipt.cliente} · {lastReceipt.tipoPago === 'Contado' ? t.cash : t.credit}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-[#8a6a16]">{t.seller}: {lastReceipt.vendedor}</p>
              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
                {t.subtotal}: {formatMoney(lastReceipt.subtotal, { code: lastReceipt.monedaCodigo, symbol: lastReceipt.monedaSimbolo })} · {t.discount}: -{formatMoney(lastReceipt.descuentoMonto, { code: lastReceipt.monedaCodigo, symbol: lastReceipt.monedaSimbolo })} ({formatCurrency(lastReceipt.descuentoPorcentaje)}%)
              </div>
              <p className={`mt-4 break-words text-3xl font-black sm:text-4xl ${isCancelledSale(lastReceipt.estado) ? 'text-red-600 line-through' : 'text-[#8a6a16]'}`}>
                {isCancelledSale(lastReceipt.estado) ? `-${formatMoney(lastReceipt.total, { code: lastReceipt.monedaCodigo, symbol: lastReceipt.monedaSimbolo })}` : formatMoney(lastReceipt.total, { code: lastReceipt.monedaCodigo, symbol: lastReceipt.monedaSimbolo })}
              </p>
              <div className="mt-4 grid gap-2 rounded-2xl border border-[#e9e2d3] bg-white/80 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3 text-[#71717a]">
                  <span>{t.amountReceived}</span>
                  <span className="font-black text-[#050505]">{formatMoney(lastReceipt.montoRecibido, { code: lastReceipt.monedaCodigo, symbol: lastReceipt.monedaSimbolo })}</span>
                </div>
                {lastReceipt.monedaPago !== lastReceipt.monedaCodigo && (
                  <div className="flex items-center justify-between gap-3 text-[#71717a]">
                    <span>{t.paymentCurrency}</span>
                    <span className="font-black text-[#050505]">{lastReceipt.monedaPago} {formatCurrency(lastReceipt.montoRecibidoOriginal)}</span>
                  </div>
                )}
                {lastReceipt.tasaCambio && (
                  <div className="flex items-center justify-between gap-3 text-[#71717a]">
                    <span>{t.exchangeRate}</span>
                    <span className="font-black text-[#050505]">{formatCurrency(lastReceipt.tasaCambio)}</span>
                  </div>
                )}
                {lastReceipt.aplicadoADeuda > 0 && (
                  <div className="flex items-center justify-between gap-3 text-[#71717a]">
                    <span>{t.appliedToDebt}</span>
                    <span className="font-black text-emerald-700">{formatMoney(lastReceipt.aplicadoADeuda, { code: lastReceipt.monedaCodigo, symbol: lastReceipt.monedaSimbolo })}</span>
                  </div>
                )}
                {lastReceipt.aplicadoADeuda > 0 && (
                  <div className="flex items-center justify-between gap-3 text-[#71717a]">
                    <span>{t.remainingDebt}</span>
                    <span className="font-black text-[#050505]">{formatMoney(lastReceipt.deudaRestante, { code: lastReceipt.monedaCodigo, symbol: lastReceipt.monedaSimbolo })}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 text-[#71717a]">
                  <span>{t.change}</span>
                  <span className="font-black text-[#050505]">{formatMoney(lastReceipt.cambio, { code: lastReceipt.monedaCodigo, symbol: lastReceipt.monedaSimbolo })}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#f1ebdf] bg-white p-4">
              <p className="mb-3 text-sm font-black text-[#050505]">{t.soldProducts}</p>
              <div className="space-y-2">
                {lastReceipt.items.map((item) => (
                  <div key={item.producto.id} className="flex min-w-0 items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 break-words font-semibold text-[#71717a]">{item.cantidad} × {item.producto.nombre}</span>
                    <span className="shrink-0 whitespace-nowrap font-black text-[#050505]">{formatMoney(item.cantidad * item.precio, { code: lastReceipt.monedaCodigo, symbol: lastReceipt.monedaSimbolo })}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setLastReceipt(null)}>{t.close}</Button>
              <Button type="button" onClick={() => printReceipt(lastReceipt)}>{t.printReceipt}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
