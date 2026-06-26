import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CreditCard,
  DollarSign,
  RefreshCw,
  Receipt,
  ShoppingCart,
  Users,
  Wallet
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useLanguage } from '../contexts/LanguageContext';
import { getUserRoleFlags } from '../utils/roles';
import { logAudit } from '../utils/audit';

interface Venta {
  id: number;
  negocio_id: string;
  cliente_id: number | null;
  fecha: string;
  subtotal?: number | null;
  descuento?: number | null;
  descuento_porcentaje?: number | null;
  descuento_monto?: number | null;
  total: number;
  tipo_pago: 'Contado' | 'Crédito';
  saldo_pendiente: number;
  vendedor_id?: string | null;
  vendedor_nombre?: string | null;
  created_at?: string | null;
  estado?: string | null;
  clientes?: {
    nombre: string;
  } | null | Array<{
    nombre: string;
  }>;
}

interface Pago {
  id: number;
  negocio_id: string;
  cliente_id: number | null;
  venta_id: number | null;
  fecha: string;
  monto: number;
  clientes?: {
    nombre: string;
  } | null | Array<{
    nombre: string;
  }>;
}

interface Producto {
  id: number;
  nombre: string;
  stock: number;
  minimo: number;
  precio: number;
}

interface Cliente {
  id: number;
  nombre: string;
  saldo: number;
}

type CurrencySettings = {
  code: string;
  symbol: string;
};

const DEFAULT_CURRENCY: CurrencySettings = {
  code: 'USD',
  symbol: '$'
};

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

function formatPaymentCode(id: number) {
  return `PAY-${String(id).padStart(4, '0')}`;
}

function isCancelledSale(venta: Venta | null | undefined) {
  const estado = String(venta?.estado || '').toLowerCase().trim();
  return ['anulada', 'cancelada', 'cancelled', 'void'].includes(estado);
}

function getSaleDiscountAmount(venta: Venta | null | undefined) {
  return Number(venta?.descuento_monto ?? venta?.descuento ?? 0);
}

function getSaleSeller(venta: Venta | null | undefined) {
  return venta?.vendedor_nombre || 'Usuario';
}

function getSaleClientName(venta: Venta | null | undefined, fallback: string) {
  const clientes = venta?.clientes;

  if (Array.isArray(clientes)) {
    return clientes[0]?.nombre || fallback;
  }

  return clientes?.nombre || fallback;
}

function getPaymentClientName(pago: Pago | null | undefined, fallback: string) {
  const clientes = pago?.clientes;

  if (Array.isArray(clientes)) {
    return clientes[0]?.nombre || fallback;
  }

  return clientes?.nombre || fallback;
}

function getSaleTime(venta: Venta | null | undefined, locale: string) {
  const source = venta?.created_at || venta?.fecha;
  if (!source) return '-';

  const date = new Date(source);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

const cashboxCopy = {
  es: {
    loading: 'Cargando caja...',
    title: 'Caja',
    subtitle: 'Control diario de ventas y cobros',
    date: 'Fecha',
    refresh: 'Actualizar',
    dailySales: 'Ventas del Día',
    cash: 'Contado',
    credit: 'Crédito',
    receivedPayments: 'Pagos Recibidos',
    cancelledSales: 'Ventas Anuladas',
    cancelledAmount: 'Monto Anulado',
    discountsGiven: 'Descuentos Otorgados',
    seller: 'Vendedor',
    discount: 'Descuento',
    time: 'Hora',
    netCashbox: 'Neto Caja',
    activeSales: 'Ventas Activas',
    status: 'Estado',
    active: 'Activa',
    cancelled: 'Anulada',
    lowStock: 'Bajo Stock',
    clientsWithDebt: 'Clientes con Deuda',
    client: 'Cliente',
    payment: 'Pago',
    total: 'Total',
    amount: 'Monto',
    transaction: 'Transacción',
    creditPayment: 'Pago a deuda',
    purchaseTransaction: 'Compra',
    generalClient: 'Cliente General',
    clientFallback: 'Cliente',
    noSalesToday: 'No hay ventas este día',
    noPayments: 'No hay pagos registrados',
    lowStockProducts: 'Productos Bajo Stock',
    minimum: 'Mínimo',
    stock: 'Stock',
    noLowStock: 'No hay productos con bajo stock',
    noDebtClients: 'No hay clientes con deuda',
    viewAllDebtClients: 'Ver todos',
    showLessDebtClients: 'Ver menos',
    sellerViewNotice: 'Vista de vendedor: caja del día, ventas activas y pagos recibidos',
    lowStockNotificationTitle: 'Alerta de stock bajo',
    lowStockNotificationMessage: 'productos están por debajo o igual al mínimo configurado',
    debtNotificationTitle: 'Clientes con deuda',
    debtNotificationMessage: 'clientes tienen saldo pendiente',
  },
  en: {
    loading: 'Loading cashbox...',
    title: 'Cashbox',
    subtitle: 'Daily control of sales and collections',
    date: 'Date',
    refresh: 'Refresh',
    dailySales: 'Daily Sales',
    cash: 'Cash',
    credit: 'Credit',
    receivedPayments: 'Received Payments',
    cancelledSales: 'Cancelled Sales',
    cancelledAmount: 'Cancelled Amount',
    discountsGiven: 'Discounts Given',
    seller: 'Seller',
    discount: 'Discount',
    time: 'Time',
    netCashbox: 'Net Cashbox',
    activeSales: 'Active Sales',
    status: 'Status',
    active: 'Active',
    cancelled: 'Cancelled',
    lowStock: 'Low Stock',
    clientsWithDebt: 'Clients with Debt',
    client: 'Client',
    payment: 'Payment',
    total: 'Total',
    amount: 'Amount',
    transaction: 'Transaction',
    creditPayment: 'Debt payment',
    purchaseTransaction: 'Purchase',
    generalClient: 'General Client',
    clientFallback: 'Client',
    noSalesToday: 'No sales for this day',
    noPayments: 'No payments registered',
    lowStockProducts: 'Low Stock Products',
    minimum: 'Minimum',
    stock: 'Stock',
    noLowStock: 'No low stock products',
    noDebtClients: 'No clients with debt',
    viewAllDebtClients: 'View all',
    showLessDebtClients: 'Show less',
    sellerViewNotice: 'Seller view: today cashbox, active sales and received payments',
    lowStockNotificationTitle: 'Low stock alert',
    lowStockNotificationMessage: 'products are below or equal to the configured minimum',
    debtNotificationTitle: 'Clients with debt',
    debtNotificationMessage: 'clients have pending balance',
  },
} as const;

export default function CashboxPage() {
  const { user, userProfile } = useAuth();
  const { language } = useLanguage();
  const t = cashboxCopy[language];

  const roleFlags = getUserRoleFlags(userProfile);
  const isSeller = roleFlags.isSeller;
  const profileData = userProfile as Record<string, unknown> | null | undefined;
  const loggedUserName = String(
    profileData?.full_name ||
    profileData?.nombre ||
    profileData?.username ||
    user?.email ||
    'Usuario'
  );
  const loggedUserEmail = String(profileData?.email || user?.email || '');
  const loggedUserRole = roleFlags.role;

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY);
  const [showAllDebtClients, setShowAllDebtClients] = useState(false);

  const loadData = useCallback(async () => {
    if (!userProfile?.negocio_id) {
      setVentas([]);
      setPagos([]);
      setProductos([]);
      setClientes([]);
      setCurrencySettings(DEFAULT_CURRENCY);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      let ventasQuery = supabase
        .from('ventas')
        .select('id, negocio_id, cliente_id, fecha, subtotal, descuento, descuento_porcentaje, descuento_monto, total, tipo_pago, saldo_pendiente, vendedor_id, vendedor_nombre, created_at, estado, clientes(nombre)')
        .eq('negocio_id', userProfile.negocio_id)
        .eq('fecha', selectedDate)
        .order('id', { ascending: false });

      if (isSeller && user?.id) {
        ventasQuery = ventasQuery.eq('vendedor_id', user.id);
      }

      const [ventasResult, productosResult, clientesResult, businessResult] = await Promise.all([
        ventasQuery,

        supabase
          .from('productos')
          .select('id, nombre, stock, minimo, precio')
          .eq('negocio_id', userProfile.negocio_id)
          .order('nombre'),

        supabase
          .from('clientes')
          .select('id, nombre, saldo')
          .eq('negocio_id', userProfile.negocio_id)
          .order('nombre'),

        supabase
          .from('negocios')
          .select('*')
          .eq('id', userProfile.negocio_id)
          .maybeSingle()
      ]);

      if (ventasResult.error) throw ventasResult.error;
      if (productosResult.error) throw productosResult.error;
      if (clientesResult.error) throw clientesResult.error;
      if (businessResult.error) throw businessResult.error;

      const loadedVentas = (ventasResult.data || []) as Venta[];
      const ventaIds = loadedVentas.map((venta) => venta.id);

      let pagosQuery = supabase
        .from('pagos')
        .select('id, negocio_id, cliente_id, venta_id, fecha, monto, clientes(nombre)')
        .eq('negocio_id', userProfile.negocio_id)
        .eq('fecha', selectedDate)
        .order('id', { ascending: false });

      if (isSeller) {
        if (ventaIds.length === 0) {
          setVentas([]);
          setPagos([]);
          setProductos((productosResult.data || []) as Producto[]);
          setClientes((clientesResult.data || []) as Cliente[]);
          setCurrencySettings(normalizeCurrencySettings(businessResult.data));

          if (user?.id) {
            await logAudit({
              negocio_id: userProfile.negocio_id,
              user_id: user.id,
              user_name: loggedUserName,
              user_email: loggedUserEmail || undefined,
              user_role: loggedUserRole || undefined,
              action: 'VIEW_CASHBOX',
              module: 'CASHBOX',
              description: `Caja del ${selectedDate} consultada por ${loggedUserName}`,
              new_data: {
                fecha: selectedDate,
                vista: 'seller',
                ventas: 0,
                ventas_activas: 0,
                ventas_anuladas: 0,
                pagos: 0,
                total_ventas: 0,
                total_anulado: 0,
                total_pagos: 0
              }
            });
          }

          return;
        }

        pagosQuery = pagosQuery.in('venta_id', ventaIds);
      }

      const pagosResult = await pagosQuery;

      if (pagosResult.error) throw pagosResult.error;

      setVentas(loadedVentas);
      setPagos((pagosResult.data || []) as Pago[]);
      setProductos((productosResult.data || []) as Producto[]);
      setClientes((clientesResult.data || []) as Cliente[]);
      setCurrencySettings(normalizeCurrencySettings(businessResult.data));

      if (!isSeller) {
        const loadedProductos = (productosResult.data || []) as Producto[];
        const loadedClientes = (clientesResult.data || []) as Cliente[];
        const lowStockCount = loadedProductos.filter(
          (producto) => Number(producto.stock || 0) <= Number(producto.minimo || 0)
        ).length;
        const clientsWithDebtCount = loadedClientes.filter(
          (cliente) => Number(cliente.saldo || 0) > 0
        ).length;
        const notificationKeyBase = `${userProfile.negocio_id}-${selectedDate}`;

        if (lowStockCount > 0) {
          const lowStockStorageKey = `matmax_cashbox_low_stock_notification_${notificationKeyBase}`;

          if (sessionStorage.getItem(lowStockStorageKey) !== 'sent') {
            const { error: lowStockNotificationError } = await supabase
              .from('notifications')
              .insert({
                negocio_id: userProfile.negocio_id,
                user_id: null,
                audience: 'admin',
                title: t.lowStockNotificationTitle,
                message: `${lowStockCount.toLocaleString('en-US')} ${t.lowStockNotificationMessage}.`,
                type: 'warning',
                category: 'low_stock',
                link: 'products',
                read: false
              });

            if (lowStockNotificationError) {
              console.warn('Cashbox low stock notification was not created:', lowStockNotificationError);
            } else {
              sessionStorage.setItem(lowStockStorageKey, 'sent');
            }
          }
        }

        if (clientsWithDebtCount > 0) {
          const debtStorageKey = `matmax_cashbox_debt_notification_${notificationKeyBase}`;

          if (sessionStorage.getItem(debtStorageKey) !== 'sent') {
            const { error: debtNotificationError } = await supabase
              .from('notifications')
              .insert({
                negocio_id: userProfile.negocio_id,
                user_id: null,
                audience: 'admin',
                title: t.debtNotificationTitle,
                message: `${clientsWithDebtCount.toLocaleString('en-US')} ${t.debtNotificationMessage}.`,
                type: 'warning',
                category: 'accounts_receivable',
                link: 'accounts-receivable',
                read: false
              });

            if (debtNotificationError) {
              console.warn('Cashbox debt notification was not created:', debtNotificationError);
            } else {
              sessionStorage.setItem(debtStorageKey, 'sent');
            }
          }
        }
      }
      
      if (user?.id) {
        const loadedPagos = (pagosResult.data || []) as Pago[];
        const ventasActivasAudit = loadedVentas.filter((venta) => !isCancelledSale(venta));
        const ventasAnuladasAudit = loadedVentas.filter((venta) => isCancelledSale(venta));
        const totalVentasAudit = ventasActivasAudit.reduce((sum, venta) => sum + Number(venta.total || 0), 0);
        const totalAnuladoAudit = ventasAnuladasAudit.reduce((sum, venta) => sum + Number(venta.total || 0), 0);
        const totalPagosAudit = loadedPagos.reduce((sum, pago) => sum + Number(pago.monto || 0), 0);

        await logAudit({
          negocio_id: userProfile.negocio_id,
          user_id: user.id,
          user_name: loggedUserName,
          user_email: loggedUserEmail || undefined,
          user_role: loggedUserRole || undefined,
          action: 'VIEW_CASHBOX',
          module: 'CASHBOX',
          description: `Caja del ${selectedDate} consultada por ${loggedUserName}`,
          new_data: {
            fecha: selectedDate,
            vista: isSeller ? 'seller' : 'admin',
            ventas: loadedVentas.length,
            ventas_activas: ventasActivasAudit.length,
            ventas_anuladas: ventasAnuladasAudit.length,
            pagos: loadedPagos.length,
            total_ventas: totalVentasAudit,
            total_anulado: totalAnuladoAudit,
            total_pagos: totalPagosAudit
          }
        });
      }
    } catch (error) {
      console.error('Error loading cashbox:', error);
    } finally {
      setLoading(false);
    }
  }, [
    isSeller,
    loggedUserEmail,
    loggedUserName,
    loggedUserRole,
    selectedDate,
    t.debtNotificationMessage,
    t.debtNotificationTitle,
    t.lowStockNotificationMessage,
    t.lowStockNotificationTitle,
    user?.id,
    userProfile?.negocio_id
  ]);

  useEffect(() => {
    if (isSeller) {
      const today = new Date().toISOString().slice(0, 10);

      if (selectedDate !== today) {
        setSelectedDate(today);
        return;
      }
    }

    loadData();
  }, [loadData, roleFlags.role, selectedDate, isSeller]);

  const metrics = useMemo(() => {
    const ventasActivas = ventas.filter((venta) => !isCancelledSale(venta));
    const ventasAnuladas = ventas.filter((venta) => isCancelledSale(venta));

    const ventasContado = ventasActivas
      .filter((v) => v.tipo_pago === 'Contado')
      .reduce((sum, v) => sum + Number(v.total || 0), 0);

    const ventasCredito = ventasActivas
      .filter((v) => v.tipo_pago === 'Crédito')
      .reduce((sum, v) => sum + Number(v.total || 0), 0);

    const pagosRecibidos = pagos
      .filter((p) => !p.venta_id)
      .reduce((sum, p) => sum + Number(p.monto || 0), 0);

    const totalVentas = ventasActivas.reduce((sum, v) => sum + Number(v.total || 0), 0);
    const totalAnulado = ventasAnuladas.reduce((sum, v) => sum + Number(v.total || 0), 0);
    const descuentosOtorgados = ventasActivas.reduce((sum, v) => sum + getSaleDiscountAmount(v), 0);
    const netoCaja = ventasContado + pagosRecibidos;

    const productosBajoStock = productos.filter(
      (p) => Number(p.stock || 0) <= Number(p.minimo || 0)
    ).length;

    const clientesConDeuda = clientes.filter(
      (c) => Number(c.saldo || 0) > 0
    ).length;

    return {
      ventasContado,
      ventasCredito,
      pagosRecibidos,
      totalVentas,
      totalAnulado,
      descuentosOtorgados,
      netoCaja,
      ventasActivas: ventasActivas.length,
      ventasAnuladas: ventasAnuladas.length,
      productosBajoStock,
      clientesConDeuda
    };
  }, [ventas, pagos, productos, clientes]);

  const pagosDeuda = pagos.filter((pago) => !pago.venta_id);

  const productosEnAlerta = productos.filter(
    (producto) => Number(producto.stock || 0) <= Number(producto.minimo || 0)
  );

  const clientesEnDeuda = clientes.filter((cliente) => Number(cliente.saldo || 0) > 0);
  const visibleClientesEnDeuda = showAllDebtClients ? clientesEnDeuda : clientesEnDeuda.slice(0, 6);
  const hiddenDebtClientsCount = Math.max(0, clientesEnDeuda.length - 6);
  const ventasActivas = ventas.filter((venta) => !isCancelledSale(venta));
  const ventasAnuladas = ventas.filter((venta) => isCancelledSale(venta));

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center px-4">
        <div className="rounded-2xl border border-[#e9e2d3] bg-white/80 px-5 py-4 text-sm font-bold text-[#71717a] shadow-matmax-soft sm:px-6">
          {t.loading}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden text-[#08080b] sm:space-y-6">
      <section className="relative min-w-0 overflow-hidden rounded-[2rem] border border-[#141414] bg-[#050505] p-5 text-white shadow-[0_28px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.22),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_44%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f4c542]/70 to-transparent" />
        <div className="relative z-10 grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,460px)] xl:items-stretch">
          <div className="flex min-w-0 flex-col justify-between gap-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-inner backdrop-blur-2xl sm:p-6">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#f4c542]/30 bg-[#f4c542]/10 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#f4c542] shadow-sm backdrop-blur-xl">
                <Receipt size={14} />
                Cashbox Control
              </div>
              <h1 className="mb-3 text-4xl font-black tracking-tight text-white sm:text-5xl xl:text-6xl">
                {t.title}
              </h1>
              <p className="max-w-3xl text-sm font-bold uppercase tracking-[0.18em] text-white/58 sm:text-base">
                {t.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f4c542]">{t.cash}</p>
                <p className="mt-2 break-words text-xl font-black text-white">{formatMoney(metrics.ventasContado, currencySettings)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f4c542]">{t.receivedPayments}</p>
                <p className="mt-2 break-words text-xl font-black text-white">{formatMoney(metrics.pagosRecibidos, currencySettings)}</p>
              </div>
              {!isSeller && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-200">{t.cancelledAmount}</p>
                  <p className="mt-2 break-words text-xl font-black text-red-100">-{formatMoney(metrics.totalAnulado, currencySettings)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3">
            <div className="relative min-w-0 overflow-hidden rounded-[1.5rem] border border-[#f4c542]/30 bg-[#f4c542] p-5 text-[#050505] shadow-[0_20px_54px_rgba(244,197,66,0.18)]">
              <div className="relative flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542] shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
                  <Wallet className="h-6 w-6 shrink-0" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#6b4d00]">{t.netCashbox}</p>
                  <p className="break-words text-3xl font-black leading-none sm:text-4xl">
                    {formatMoney(metrics.netoCaja, currencySettings)}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative min-w-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4 shadow-sm backdrop-blur-xl">
              <div className="relative flex min-w-0 items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#f4c542] shadow-[0_16px_36px_rgba(0,0,0,0.16)]">
                  <CalendarDays className="h-5 w-5 shrink-0" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#f4c542]">{t.date}</p>
                  <Input
                    type="date"
                    value={selectedDate}
                    disabled={isSeller}
                    onChange={(e) => {
                      if (!isSeller) {
                        setSelectedDate(e.target.value);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isSeller && (
        <div className="rounded-[1.5rem] border border-[#f4c542]/35 bg-[#fff9e8] px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-[#8a6a16] shadow-[0_14px_34px_rgba(15,15,15,0.04)]">
          {t.sellerViewNotice}
        </div>
      )}

      <div className="flex justify-end border-b border-[#e9e2d3]/70 pb-5">
        <Button
          type="button"
          variant="secondary"
          className="w-full gap-2 rounded-2xl border border-[#e9e2d3] bg-white/90 shadow-[0_14px_34px_rgba(15,15,15,0.05)] hover:-translate-y-0.5 sm:w-auto"
          onClick={loadData}
        >
          <RefreshCw size={16} />
          {t.refresh}
        </Button>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard
          title={t.activeSales}
          value={formatMoney(metrics.totalVentas, currencySettings)}
          icon={ShoppingCart}
          iconClass="bg-[#050505] text-[#f4c542]"
        />

        <MetricCard
          title={t.cash}
          value={formatMoney(metrics.ventasContado, currencySettings)}
          icon={DollarSign}
          iconClass="bg-[#fff4c7] text-[#8a6a16]"
        />

        {!isSeller && (
          <MetricCard
            title={t.credit}
            value={formatMoney(metrics.ventasCredito, currencySettings)}
            icon={CreditCard}
            iconClass="bg-[#f6f4ee] text-[#050505]"
          />
        )}

        <MetricCard
          title={t.receivedPayments}
          value={formatMoney(metrics.pagosRecibidos, currencySettings)}
          icon={Wallet}
          iconClass="bg-[#050505] text-[#f4c542]"
        />

        {!isSeller && (
          <MetricCard
            title={t.cancelledAmount}
            value={`-${formatMoney(metrics.totalAnulado, currencySettings)}`}
            icon={AlertTriangle}
            iconClass="bg-red-100 text-red-700"
            valueClass="text-red-600"
          />
        )}

        {!isSeller && (
          <MetricCard
            title={t.discountsGiven}
            value={formatMoney(metrics.descuentosOtorgados, currencySettings)}
            icon={DollarSign}
            iconClass="bg-red-100 text-red-700"
            valueClass="text-red-600"
          />
        )}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542]">
                <Receipt className="h-5 w-5 shrink-0" />
              </div>
              <h2 className="text-xl font-serif font-bold text-[#050505] sm:text-2xl">
                {t.dailySales}
              </h2>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto rounded-2xl border border-[#f1ebdf] bg-[#fffdf8]">
              <table className="w-full min-w-[980px]">
                <thead className="border-b border-[#e9e2d3] bg-[#fbfaf7]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.client}</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.seller}</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.time}</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.payment}</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.status}</th>
                    {!isSeller && (
                      <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.discount}</th>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.total}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#f1ebdf]">
                  {ventasActivas.map((venta) => (
                    <tr key={venta.id} className="transition-all duration-300 hover:bg-[#fff9e8]">
                      <td className="px-4 py-3 font-black text-[#050505]">
                        {formatSaleCode(venta.id)}
                      </td>

                      <td className="px-4 py-3 font-medium text-[#71717a]">
                        {getSaleClientName(venta, t.generalClient)}
                      </td>

                      <td className="max-w-[160px] truncate px-4 py-3 font-medium text-[#71717a]">
                        {getSaleSeller(venta)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 font-medium text-[#71717a]">
                        {getSaleTime(venta, language === 'es' ? 'es-ES' : 'en-US')}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            venta.tipo_pago === 'Contado'
                              ? 'bg-[#050505] text-[#f4c542]'
                              : 'bg-[#fff4c7] text-[#8a6a16]'
                          }`}
                        >
                          {venta.tipo_pago === 'Contado' ? t.cash : t.credit}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                          {t.active}
                        </span>
                      </td>

                      {!isSeller && (
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-red-600">
                          -{formatMoney(getSaleDiscountAmount(venta), currencySettings)}
                        </td>
                      )}

                      <td className="px-4 py-3 text-right font-black text-[#8a6a16]">
                        {formatMoney(venta.total, currencySettings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {ventasActivas.length === 0 && (
                <div className="bg-[#fbfaf7] py-10 text-center font-semibold text-[#71717a]">
                  {t.noSalesToday}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        {!isSeller && ventasAnuladas.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-700">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                </div>
                <h2 className="text-xl font-serif font-bold text-[#050505] sm:text-2xl">
                  {t.cancelledSales}
                </h2>
              </div>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto rounded-2xl border border-red-100 bg-red-50/40">
                <table className="w-full min-w-[980px]">
                  <thead className="border-b border-red-100 bg-red-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-black text-red-700">#</th>
                      <th className="px-4 py-3 text-left text-sm font-black text-red-700">{t.client}</th>
                      <th className="px-4 py-3 text-left text-sm font-black text-red-700">{t.seller}</th>
                      <th className="px-4 py-3 text-left text-sm font-black text-red-700">{t.time}</th>
                      <th className="px-4 py-3 text-left text-sm font-black text-red-700">{t.payment}</th>
                      <th className="px-4 py-3 text-left text-sm font-black text-red-700">{t.status}</th>
                      <th className="px-4 py-3 text-right text-sm font-black text-red-700">{t.discount}</th>
                      <th className="px-4 py-3 text-right text-sm font-black text-red-700">{t.total}</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-red-100">
                    {ventasAnuladas.map((venta) => (
                      <tr key={venta.id} className="transition-all duration-300 hover:bg-red-50">
                      <td className="px-4 py-3 font-black text-[#050505]">{formatSaleCode(venta.id)}</td>
                        <td className="px-4 py-3 font-medium text-[#71717a]">{getSaleClientName(venta, t.generalClient)}</td>
                        <td className="max-w-[160px] truncate px-4 py-3 font-medium text-[#71717a]">{getSaleSeller(venta)}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-[#71717a]">{getSaleTime(venta, language === 'es' ? 'es-ES' : 'en-US')}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-black ${venta.tipo_pago === 'Contado' ? 'bg-[#050505] text-[#f4c542]' : 'bg-[#fff4c7] text-[#8a6a16]'}`}>
                            {venta.tipo_pago === 'Contado' ? t.cash : t.credit}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                            {t.cancelled}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-red-600">
                          -{formatMoney(getSaleDiscountAmount(venta), currencySettings)}
                        </td>
                        <td className="px-4 py-3 text-right font-black tabular-nums text-red-600 line-through">
                          -{formatMoney(venta.total, currencySettings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff4c7] text-[#8a6a16]">
                <Wallet className="h-5 w-5 shrink-0" />
              </div>
              <h2 className="text-xl font-serif font-bold text-[#050505] sm:text-2xl">
                {t.receivedPayments}
              </h2>
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto rounded-2xl border border-[#f1ebdf] bg-[#fffdf8]">
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-[#e9e2d3] bg-[#fbfaf7]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.client}</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.transaction}</th>
                    <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.amount}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#f1ebdf]">
                  {pagosDeuda.map((pago) => (
                    <tr key={pago.id} className="transition-all duration-300 hover:bg-[#fff9e8]">
                      <td className="px-4 py-3 font-black text-[#050505]">
                        {formatPaymentCode(pago.id)}
                      </td>

                      <td className="px-4 py-3 font-medium text-[#71717a]">
                        {getPaymentClientName(pago, t.clientFallback)}
                      </td>

                      <td className="px-4 py-3 font-black text-[#050505]">
                        <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
                          {t.creditPayment}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-black text-[#8a6a16]">
                        {formatMoney(pago.monto, currencySettings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {pagosDeuda.length === 0 && (
                <div className="bg-[#fbfaf7] py-10 text-center font-semibold text-[#71717a]">
                  {t.noPayments}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {!isSeller && (
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-700">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                </div>
                <h2 className="text-xl font-serif font-bold text-[#050505] sm:text-2xl">
                  {t.lowStockProducts}
                </h2>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {productosEnAlerta.map((producto) => (
                  <div
                    key={producto.id}
                    className="flex min-w-0 flex-col gap-3 rounded-2xl border border-[#f1ebdf] bg-[#fffdf8] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f4c542]/30 hover:bg-white hover:shadow-[0_14px_34px_rgba(15,15,15,0.06)] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-black text-[#050505]">
                        {producto.nombre}
                      </p>

                      <p className="text-sm font-medium text-[#71717a]">
                        {t.minimum}: {Number(producto.minimo || 0).toLocaleString('en-US')}
                      </p>
                    </div>

                    <p className="rounded-full bg-red-100 px-3 py-1 text-sm font-black text-red-700">
                      {t.stock}: {Number(producto.stock || 0).toLocaleString('en-US')}
                    </p>
                  </div>
                ))}

                {productosEnAlerta.length === 0 && (
                  <div className="rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] py-8 text-center font-semibold text-[#71717a]">
                    {t.noLowStock}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542]">
                    <Users className="h-5 w-5 shrink-0" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-serif font-bold text-[#050505] sm:text-2xl">
                      {t.clientsWithDebt}
                    </h2>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">
                      {clientesEnDeuda.length.toLocaleString('en-US')} {t.clientsWithDebt}
                    </p>
                  </div>
                </div>

                {hiddenDebtClientsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllDebtClients((current) => !current)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#e9e2d3] bg-white px-4 py-2 text-sm font-black text-[#71717a] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f4c542]/50 hover:bg-[#fff9e8] hover:text-[#050505]"
                  >
                    {showAllDebtClients ? t.showLessDebtClients : `${t.viewAllDebtClients} +${hiddenDebtClientsCount.toLocaleString('en-US')}`}
                    {showAllDebtClients ? <ChevronDown className="h-4 w-4 rotate-180" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {visibleClientesEnDeuda.map((cliente) => (
                  <div
                    key={cliente.id}
                    className="flex min-w-0 flex-col gap-3 rounded-2xl border border-[#f1ebdf] bg-[#fffdf8] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f4c542]/30 hover:bg-white hover:shadow-[0_14px_34px_rgba(15,15,15,0.06)] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="font-black text-[#050505]">
                      {cliente.nombre}
                    </p>

                    <p className="rounded-full bg-red-100 px-3 py-1 text-sm font-black text-red-700">
                      {formatMoney(cliente.saldo, currencySettings)}
                    </p>
                  </div>
                ))}

                {visibleClientesEnDeuda.length === 0 && (
                  <div className="rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] py-8 text-center font-semibold text-[#71717a]">
                    {t.noDebtClients}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  iconClass,
  valueClass = 'text-[#050505]'
}: {
  title: string;
  value: string;
  icon: ElementType;
  iconClass: string;
  valueClass?: string;
}) {
  return (
    <div className="group relative flex min-w-0 items-center justify-between gap-4 overflow-hidden rounded-[1.75rem] border border-[#e9e2d3]/85 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,15,15,0.055)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#f4c542]/35 hover:bg-white hover:shadow-[0_28px_70px_rgba(15,15,15,0.09)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.09),transparent_38%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10 min-w-0 flex-1 overflow-hidden pr-2">
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#8a6a16] sm:text-[11px]">
          {title}
        </p>

        <p className={`max-w-full break-words text-[2rem] font-black leading-[0.95] tracking-tight tabular-nums sm:text-[2.35rem] xl:text-[2.25rem] 2xl:text-[2.55rem] ${valueClass}`}>
          {value}
        </p>
      </div>

      <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] shadow-[0_18px_40px_rgba(15,15,15,0.12)] transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 sm:h-14 sm:w-14 ${iconClass}`}>
        <Icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
      </div>
    </div>
  );
}
