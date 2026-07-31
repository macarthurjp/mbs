import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import { Building2, CalendarClock, CreditCard, DollarSign, Package, RefreshCw, ShieldCheck, ShoppingCart, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getUserRoleFlags } from '../utils/roles';
import { getEffectivePlan } from '../utils/subscriptionPlan';

type Venta = {
  id: number;
  negocio_id: string | null;
  cliente_id: number | null;
  fecha: string;
  subtotal?: number | null;
  descuento?: number | null;
  descuento_porcentaje?: number | null;
  descuento_monto?: number | null;
  total: number | null;
  tipo_pago: 'Contado' | 'Crédito' | null;
  saldo_pendiente: number | null;
  vendedor_id?: string | null;
  vendedor_nombre?: string | null;
  created_at?: string | null;
  estado?: string | null;
  clientes?: {
    nombre: string;
  } | null | Array<{
    nombre: string;
  }>;
};

type Producto = {
  id: number;
  nombre: string;
  stock: number | null;
  minimo: number | null;
  precio: number | null;
};


type Cliente = {
  id: number;
  nombre: string;
  saldo: number | null;
  limite_credito: number | null;
};

type PlatformBusiness = {
  id: string;
  nombre?: string | null;
  name?: string | null;
  estado?: string | null;
  plan?: string | null;
  trial_ends_at?: string | null;
  created_at?: string | null;
};

type PlatformUser = {
  id: string;
  negocio_id: string | null;
  rol: string | null;
  created_at?: string | null;
};

type PlatformSubscription = {
  id: string | number;
  negocio_id: string | null;
  plan?: string | null;
  estado?: string | null;
  monto?: number | null;
  amount?: number | null;
  precio?: number | null;
  created_at?: string | null;
};

type CurrencySettings = {
  code: string;
  symbol: string;
};

type DashboardStats = {
  ventasHoy: number;
  cantidadVentasHoy: number;
  ingresosContadoHoy: number;
  ventasCreditoHoy: number;
  ventasMes: number;
  clientesConDeuda: number;
  productosBajoStock: number;
  totalProductos: number;
  totalClientes: number;
};

const dashboardCopy = {
  es: {
    loading: 'Cargando dashboard...',
    missingTitle: 'Usuario sin negocio asignado',
    missingText: 'El login funciona, pero este usuario todavía no existe en la tabla usuarios o no tiene un negocio_id asignado.',
    heroSubtitle: 'Resumen general de ventas, clientes e inventario',
        sellerHeroSubtitle: 'Vista básica para vendedor: ventas del día, historial reciente y productos vendidos',
    sellerBasicView: 'Vista limitada: no incluye créditos, cuentas por cobrar, utilidades, márgenes ni reportes financieros.',
    refresh: 'Actualizar',
    loggedUser: 'Usuario conectado',
    business: 'Negocio',
    todaySales: 'Ventas de Hoy',
    todaySalesCount: 'Ventas del día',
    todaySalesSubtitle: 'Total vendido hoy',
    cashToday: 'Contado Hoy',
    cashTodaySubtitle: 'Ventas contado',
    creditToday: 'Crédito Hoy',
    creditTodaySubtitle: 'Ventas crédito',
    monthSales: 'Ventas del Mes',
    monthSalesSubtitle: 'Acumulado mensual',
    seller: 'Vendedor',
    discount: 'Descuento',
    time: 'Hora',
    products: 'Productos',
    productsLowStock: 'con bajo stock',
    clients: 'Clientes',
    clientsDebt: 'con saldo pendiente',
    lowStock: 'Bajo Stock',
    lowStockSubtitle: 'Productos en alerta',
    clientsWithDebt: 'Clientes con Deuda',
    accountsReceivable: 'Cuentas por cobrar',
    last7Days: 'Ventas últimos 7 días',
    cashAndCreditByDay: 'Contado y crédito por día',
    cash: 'Contado',
    credit: 'Crédito',
    recentSales: 'Últimas ventas',
    sale: 'Venta',
    generalClient: 'Cliente general',
    noSales: 'No hay ventas registradas',
    lowStockProducts: 'Productos bajo stock',
    minimum: 'Mínimo',
    noLowStock: 'No hay productos en alerta',
    debtClients: 'Clientes con deuda',
    limit: 'Límite',
    noPendingBalances: 'No hay saldos pendientes',
    saasTitle: 'Dashboard SaaS',
    saasSubtitle: 'Métricas reales de plataforma, negocios, usuarios y suscripciones',
    mrr: 'MRR',
    activeBusinesses: 'Negocios activos',
    totalUsers: 'Usuarios totales',
    activeTrials: 'Trials activos',
    businessGrowth: 'Crecimiento de negocios',
    monthlyRevenue: 'Ingresos mensuales',
    planDistribution: 'Distribución de planes',
    recentPlatformActivity: 'Actividad reciente',
    trialAlerts: 'Trials por vencer',
    noPlatformActivity: 'No hay actividad reciente',
    noTrialAlerts: 'No hay trials por vencer',
    businesses: 'Negocios',
    subscriptions: 'Suscripciones',
    withOwner: 'Con owner',
    withoutOwner: 'Sin owner',
    locale: 'es-ES',
  },
  en: {
    loading: 'Loading dashboard...',
    missingTitle: 'User has no assigned business',
    missingText: 'Login works, but this user does not exist in the usuarios table yet or does not have an assigned negocio_id.',
    heroSubtitle: 'General overview of sales, clients, and inventory',
        sellerHeroSubtitle: 'Basic seller view: today sales, recent activity, and sold products',
    sellerBasicView: 'Limited view: excludes credit, receivables, profit, margins, and financial reports.',
    refresh: 'Refresh',
    loggedUser: 'Logged in user',
    business: 'Business',
    todaySales: 'Today Sales',
    todaySalesCount: 'Today sales count',
    todaySalesSubtitle: 'Total sold today',
    cashToday: 'Cash Today',
    cashTodaySubtitle: 'Cash sales',
    creditToday: 'Credit Today',
    creditTodaySubtitle: 'Credit sales',
    monthSales: 'Monthly Sales',
    monthSalesSubtitle: 'Monthly total',
    seller: 'Seller',
    discount: 'Discount',
    time: 'Time',
    products: 'Products',
    productsLowStock: 'low stock',
    clients: 'Clients',
    clientsDebt: 'with pending balance',
    lowStock: 'Low Stock',
    lowStockSubtitle: 'Products on alert',
    clientsWithDebt: 'Clients with Debt',
    accountsReceivable: 'Accounts receivable',
    last7Days: 'Sales last 7 days',
    cashAndCreditByDay: 'Cash and credit by day',
    cash: 'Cash',
    credit: 'Credit',
    recentSales: 'Recent sales',
    sale: 'Sale',
    generalClient: 'General client',
    noSales: 'No sales registered',
    lowStockProducts: 'Low stock products',
    minimum: 'Minimum',
    noLowStock: 'No products on alert',
    debtClients: 'Clients with debt',
    limit: 'Limit',
    noPendingBalances: 'No pending balances',
    saasTitle: 'SaaS Dashboard',
    saasSubtitle: 'Real platform metrics for businesses, users, and subscriptions',
    mrr: 'MRR',
    activeBusinesses: 'Active businesses',
    totalUsers: 'Total users',
    activeTrials: 'Active trials',
    businessGrowth: 'Business growth',
    monthlyRevenue: 'Monthly revenue',
    planDistribution: 'Plan distribution',
    recentPlatformActivity: 'Recent activity',
    trialAlerts: 'Expiring trials',
    noPlatformActivity: 'No recent activity',
    noTrialAlerts: 'No expiring trials',
    businesses: 'Businesses',
    subscriptions: 'Subscriptions',
    withOwner: 'With owner',
    withoutOwner: 'Without owner',
    locale: 'en-US',
  },
} as const;


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

function formatNumber(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function isCancelledSale(venta: Venta | null | undefined) {
  return venta?.estado === 'anulada' || venta?.estado === 'cancelled';
}

function getSaleDiscountAmount(venta: Venta | null | undefined) {
  return Number(venta?.descuento_monto ?? venta?.descuento ?? 0);
}

function getSaleSeller(venta: Venta | null | undefined) {
  return venta?.vendedor_nombre || 'Usuario';
}

function getClientName(clientes: Venta['clientes'], fallback: string) {
  if (Array.isArray(clientes)) {
    return clientes[0]?.nombre || fallback;
  }

  return clientes?.nombre || fallback;
}
function formatSaleCode(id: number) {
  return `V-${String(id).padStart(4, '0')}`;
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

function openInvoiceFromDashboard(invoiceId: number) {
  const invoiceIdText = String(invoiceId);

  sessionStorage.setItem('matmax_pending_invoice_id', invoiceIdText);
  sessionStorage.setItem('matmax_open_invoice_sale', invoiceIdText);

  window.dispatchEvent(
    new CustomEvent('matmax_navigate', {
      detail: `invoices?invoiceId=${invoiceIdText}`
    })
  );

  window.setTimeout(() => {
    sessionStorage.setItem('matmax_pending_invoice_id', invoiceIdText);
    sessionStorage.setItem('matmax_open_invoice_sale', invoiceIdText);

    window.requestAnimationFrame(() => {
      window.dispatchEvent(
        new CustomEvent('matmax:open-invoice', {
          detail: invoiceIdText
        })
      );
    });
  }, 320);
}

export function DashboardPage() {
  const { user, userProfile } = useAuth();
  const { language } = useLanguage();
  const t = dashboardCopy[language];
  const roleFlags = getUserRoleFlags(userProfile);
  const role = roleFlags.role;
  const isSeller = roleFlags.isSeller;
  const isSuperAdmin = roleFlags.isSuperAdmin;
  const profileData = userProfile as Record<string, unknown> | null | undefined;
  const loggedUserName = String(
    profileData?.nombre ||
      profileData?.name ||
      profileData?.full_name ||
      profileData?.fullName ||
      user?.email ||
      'Usuario'
  );
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [platformBusinesses, setPlatformBusinesses] = useState<PlatformBusiness[]>([]);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [platformSubscriptions, setPlatformSubscriptions] = useState<PlatformSubscription[]>([]);
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY);
  const [businessName, setBusinessName] = useState('MatMax Business');
  const [loading, setLoading] = useState(true);
  const [missingNegocio, setMissingNegocio] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  const money = useCallback((value: number | null | undefined) => {
    return `${currencySettings.symbol} ${formatNumber(Number(value || 0))}`;
  }, [currencySettings.symbol]);

  const getEffectivePlatformPlan = useCallback((business: PlatformBusiness) => {
    const subscription = platformSubscriptions.find((item) => item.negocio_id === business.id);

    return getEffectivePlan({
      businessPlan: business.plan,
      subscriptionPlan: subscription?.plan,
      subscriptionStatus: subscription?.estado,
    });
  }, [platformSubscriptions]);

  const stats: DashboardStats = useMemo(() => {
    const ventasActivas = ventas.filter((venta) => !isCancelledSale(venta));
    const ventasHoy = ventasActivas.filter((venta) => venta.fecha === today);
    const ventasDelMes = ventasActivas.filter((venta) => venta.fecha?.startsWith(currentMonth));

    const ingresosContadoHoy = ventasHoy
      .filter((venta) => venta.tipo_pago === 'Contado')
      .reduce((sum, venta) => sum + Number(venta.total || 0), 0);

    const ventasCreditoHoy = ventasHoy
      .filter((venta) => venta.tipo_pago === 'Crédito')
      .reduce((sum, venta) => sum + Number(venta.total || 0), 0);

    const totalVentasMes = ventasDelMes.reduce((sum, venta) => sum + Number(venta.total || 0), 0);

    const clientesConDeuda = clientes.filter((cliente) => Number(cliente.saldo || 0) > 0).length;
    const productosBajoStock = productos.filter((producto) => Number(producto.stock || 0) <= Number(producto.minimo || 0)).length;

    return {
      cantidadVentasHoy: ventasHoy.length,
      ventasHoy: ventasHoy.reduce((sum, venta) => sum + Number(venta.total || 0), 0),
      ingresosContadoHoy,
      ventasCreditoHoy,
      ventasMes: totalVentasMes,
      clientesConDeuda,
      productosBajoStock,
      totalProductos: productos.length,
      totalClientes: clientes.length
    };
  }, [ventas, productos, clientes, today, currentMonth]);

  const ventasUltimos7Dias = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const dateStr = date.toISOString().slice(0, 10);
      const label = date.toLocaleDateString(t.locale, { weekday: 'short' });

      const ventasDia = ventas.filter((venta) => venta.fecha === dateStr && !isCancelledSale(venta));
      const contado = ventasDia
        .filter((venta) => venta.tipo_pago === 'Contado')
        .reduce((sum, venta) => sum + Number(venta.total || 0), 0);
      const credito = ventasDia
        .filter((venta) => venta.tipo_pago === 'Crédito')
        .reduce((sum, venta) => sum + Number(venta.total || 0), 0);

      return {
        label: label.charAt(0).toUpperCase() + label.slice(1),
        date: dateStr,
        contado,
        credito,
        total: contado + credito
      };
    });
  }, [ventas, t.locale]);

  const maxChartValue = Math.max(...ventasUltimos7Dias.map((day) => day.total), 1);

  const ultimasVentas = useMemo(() => {
    return ventas
      .filter((venta) => !isCancelledSale(venta))
      .sort((a, b) => String(b.created_at || b.fecha).localeCompare(String(a.created_at || a.fecha)))
      .slice(0, 6);
  }, [ventas]);

  const productosBajoStock = useMemo(() => {
    return productos
      .filter((producto) => Number(producto.stock || 0) <= Number(producto.minimo || 0))
      .slice(0, 6);
  }, [productos]);

  const clientesConDeuda = useMemo(() => {
    return clientes
      .filter((cliente) => Number(cliente.saldo || 0) > 0)
      .sort((a, b) => Number(b.saldo || 0) - Number(a.saldo || 0))
      .slice(0, 6);
  }, [clientes]);

  const platformMetrics = useMemo(() => {
    const activeBusinesses = platformBusinesses.filter((business) => String(business.estado || '').toLowerCase() === 'activo').length;
    const activeTrials = platformBusinesses.filter((business) => getEffectivePlatformPlan(business) === 'trial').length;
    const activeSubscriptions = platformSubscriptions.filter((subscription) => ['activa', 'activo', 'active'].includes(String(subscription.estado || '').toLowerCase())).length;
    const mrr = platformSubscriptions
      .filter((subscription) => ['activa', 'activo', 'active'].includes(String(subscription.estado || '').toLowerCase()))
      .reduce((sum, subscription) => sum + Number(subscription.monto ?? subscription.amount ?? subscription.precio ?? 0), 0);
    const businessesWithOwner = platformBusinesses.filter((business) =>
      platformUsers.some((item) => item.negocio_id === business.id && ['owner', 'owner_negocio', 'business_owner', 'propietario', 'dueno', 'dueño'].includes(String(item.rol || '').toLowerCase()))
    ).length;

    return {
      totalBusinesses: platformBusinesses.length,
      activeBusinesses,
      totalUsers: platformUsers.length,
      activeTrials,
      activeSubscriptions,
      mrr,
      businessesWithOwner,
      businessesWithoutOwner: Math.max(0, platformBusinesses.length - businessesWithOwner)
    };
  }, [platformBusinesses, platformUsers, platformSubscriptions, getEffectivePlatformPlan]);

  const platformBusinessGrowth = useMemo(() => {
    return Array.from({ length: 6 }).map((_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      date.setMonth(date.getMonth() - (5 - index));
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString(t.locale, { month: 'short' }).replace('.', '');
      const count = platformBusinesses.filter((business) => String(business.created_at || '').slice(0, 7) <= month).length;

      return {
        label: label.charAt(0).toUpperCase() + label.slice(1),
        count
      };
    });
  }, [platformBusinesses, t.locale]);

  const platformMonthlyRevenue = useMemo(() => {
    return Array.from({ length: 6 }).map((_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      date.setMonth(date.getMonth() - (5 - index));
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString(t.locale, { month: 'short' }).replace('.', '');
      const total = platformSubscriptions
        .filter((subscription) => String(subscription.created_at || '').slice(0, 7) === month)
        .reduce((sum, subscription) => sum + Number(subscription.monto ?? subscription.amount ?? subscription.precio ?? 0), 0);

      return {
        label: label.charAt(0).toUpperCase() + label.slice(1),
        total
      };
    });
  }, [platformSubscriptions, t.locale]);

  const planDistribution = useMemo(() => {
    const plans = ['trial', 'basic', 'pro', 'premium'];

    return plans.map((plan) => ({
      plan,
      count: platformBusinesses.filter((business) => getEffectivePlatformPlan(business) === plan).length
    }));
  }, [platformBusinesses, getEffectivePlatformPlan]);

  const expiringTrials = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    return platformBusinesses
      .filter((business) => {
        if (!business.trial_ends_at) return false;
        const trialDate = new Date(business.trial_ends_at);
        return trialDate >= now && trialDate <= weekFromNow;
      })
      .slice(0, 6);
  }, [platformBusinesses]);

  const recentPlatformActivity = useMemo(() => {
    return platformBusinesses.slice(0, 6).map((business) => ({
      id: business.id,
      name: business.nombre || business.name || 'Business',
      detail: getEffectivePlatformPlan(business),
      status: String(business.estado || '').toLowerCase(),
      date: business.created_at || ''
    }));
  }, [platformBusinesses, getEffectivePlatformPlan]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        setVentas([]);
        setProductos([]);
        setClientes([]);
        setCurrencySettings(DEFAULT_CURRENCY);
        setBusinessName('MatMax Business');
        setMissingNegocio(false);
        return;
      }

      if (isSuperAdmin) {
        const [businessesResult, usersResult, subscriptionsResult] = await Promise.all([
          supabase.from('negocios').select('*').order('created_at', { ascending: false }),
          supabase.from('usuarios').select('id, negocio_id, rol, created_at').order('created_at', { ascending: false }),
          supabase.from('suscripciones').select('*').order('created_at', { ascending: false })
        ]);

        if (businessesResult.error) throw businessesResult.error;
        if (usersResult.error) throw usersResult.error;
        if (subscriptionsResult.error) throw subscriptionsResult.error;

        setPlatformBusinesses((businessesResult.data || []) as unknown as PlatformBusiness[]);
        setPlatformUsers((usersResult.data || []) as unknown as PlatformUser[]);
        setPlatformSubscriptions((subscriptionsResult.data || []) as unknown as PlatformSubscription[]);
        setVentas([]);
        setProductos([]);
        setClientes([]);
        setCurrencySettings(DEFAULT_CURRENCY);
        setBusinessName('MatMax SaaS Control Center');
        setMissingNegocio(false);
        return;
      }

      const currentNegocioId = userProfile?.negocio_id || null;

      if (!currentNegocioId) {
        setVentas([]);
        setProductos([]);
        setClientes([]);
        setCurrencySettings(DEFAULT_CURRENCY);
        setBusinessName('MatMax Business');
        setMissingNegocio(true);
        return;
      }

      let ventasQuery = supabase
        .from('ventas')
        .select('id, negocio_id, cliente_id, fecha, subtotal, descuento, descuento_porcentaje, descuento_monto, total, tipo_pago, saldo_pendiente, vendedor_id, vendedor_nombre, created_at, estado, clientes(nombre)')
        .eq('negocio_id', currentNegocioId)
        .order('created_at', { ascending: false });

      if (isSeller && user?.id) {
        ventasQuery = ventasQuery.eq('vendedor_id', user.id);
      }

      const [ventasResult, productosResult, clientesResult, negocioResult] = await Promise.all([
        ventasQuery,
        supabase
          .from('productos')
          .select('id, nombre, stock, minimo, precio')
          .eq('negocio_id', currentNegocioId)
          .order('nombre', { ascending: true }),
        supabase
          .from('clientes')
          .select('id, nombre, saldo, limite_credito')
          .eq('negocio_id', currentNegocioId)
          .order('nombre', { ascending: true }),
        supabase
          .from('negocios')
          .select('*')
          .eq('id', currentNegocioId)
          .maybeSingle()
      ]);

      if (ventasResult.error) throw ventasResult.error;
      if (productosResult.error) throw productosResult.error;
      if (clientesResult.error) throw clientesResult.error;
      if (negocioResult.error) throw negocioResult.error;

      setVentas((ventasResult.data || []) as unknown as Venta[]);
      setProductos((productosResult.data || []) as unknown as Producto[]);
      setClientes((clientesResult.data || []) as unknown as Cliente[]);
      setCurrencySettings(normalizeCurrencySettings(negocioResult.data));
      setBusinessName(negocioResult.data?.nombre || negocioResult.data?.name || 'MatMax Business');
      setMissingNegocio(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [isSeller, isSuperAdmin, user?.id, userProfile?.negocio_id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, role]);

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
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#f7f4ec] p-4 sm:p-6">
        <div className="w-full max-w-xl rounded-[2rem] border border-red-200 bg-white/90 p-5 text-center shadow-matmax-soft sm:p-8">
          <h1 className="mb-3 text-xl font-serif font-bold text-red-700 sm:text-2xl">
            {t.missingTitle}
          </h1>
          <p className="mb-4 text-sm text-[#52525b] sm:text-base">
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

  if (isSuperAdmin) {
    const maxGrowth = Math.max(...platformBusinessGrowth.map((item) => item.count), 1);
    const maxRevenue = Math.max(...platformMonthlyRevenue.map((item) => item.total), 1);
    const maxPlanCount = Math.max(...planDistribution.map((item) => item.count), 1);

    return (
      <div className="w-full min-w-0 space-y-5 overflow-x-hidden text-[#08080b] sm:space-y-6">
        <section className="relative min-w-0 overflow-hidden rounded-[1.5rem] border border-[#141414] bg-[#050505] p-4 text-white shadow-[0_28px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl sm:rounded-[2rem] sm:p-7 xl:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.22),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_44%)]" />
          <div className="relative z-10 flex min-w-0 flex-col justify-between gap-6 xl:flex-row xl:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#f4c542]/30 bg-[#f4c542]/10 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#f4c542]">
                <ShieldCheck size={14} />
                MatMax SaaS Control Center
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl xl:text-6xl">{t.saasTitle}</h1>
              <p className="mt-3 max-w-4xl text-sm font-bold uppercase tracking-[0.18em] text-white/58 sm:text-base">{t.saasSubtitle}</p>
            </div>
            <button type="button" onClick={loadDashboardData} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white transition-all hover:-translate-y-0.5 hover:bg-[#f4c542] hover:text-[#050505]">
              <RefreshCw size={16} />
              {t.refresh}
            </button>
          </div>
        </section>

        <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 2xl:grid-cols-4">
          <DashboardMetricCard compact title={t.mrr} value={platformMetrics.mrr.toLocaleString(t.locale, { style: 'currency', currency: 'EUR' })} subtitle={t.subscriptions} icon={DollarSign} iconClass="bg-[#050505] text-[#f4c542]" />
          <DashboardMetricCard
            compact
            title={t.activeBusinesses}
            value={platformMetrics.activeBusinesses.toLocaleString(t.locale)}
            subtitle={`${platformMetrics.activeBusinesses}/${platformMetrics.totalBusinesses} · ${platformMetrics.totalBusinesses > 0 ? Math.round((platformMetrics.activeBusinesses / platformMetrics.totalBusinesses) * 100) : 0}%`}
            icon={Building2}
            iconClass="bg-[#fff4c7] text-[#8a6a16]"
          />
          <DashboardMetricCard compact title={t.totalUsers} value={platformMetrics.totalUsers.toLocaleString(t.locale)} subtitle={language === 'es' ? 'En toda la plataforma' : 'Across the platform'} icon={Users} iconClass="bg-[#f6f4ee] text-[#050505]" />
          <DashboardMetricCard compact title={t.activeTrials} value={platformMetrics.activeTrials.toLocaleString(t.locale)} subtitle={`${expiringTrials.length} ${language === 'es' ? 'por vencer' : 'expiring'}`} icon={CalendarClock} iconClass="bg-red-100 text-red-700" />
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className="rounded-[1.5rem] sm:rounded-[2rem]">
            <CardHeader className="px-4 py-4 sm:px-6 sm:py-5">
              <h2 className="text-xl font-serif font-bold text-[#050505] sm:text-2xl">{t.businessGrowth}</h2>
              <p className="mt-1 text-xs font-semibold text-[#71717a]">
                {language === 'es' ? 'Total acumulado · últimos 6 meses' : 'Cumulative total · last 6 months'}
              </p>
            </CardHeader>
            <CardContent className="p-3 sm:p-5 xl:p-6">
              <div className="flex h-64 items-end gap-2 rounded-2xl border border-[#f1ebdf] bg-[#fffdf8] px-3 pb-3 pt-5 sm:h-72 sm:gap-3 sm:p-4">
                {platformBusinessGrowth.map((item) => (
                  <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <span className="text-[11px] font-black tabular-nums text-[#050505] sm:text-xs">{item.count}</span>
                    <div className="flex h-40 w-full max-w-10 items-end overflow-hidden rounded-t-lg bg-[#f1efe9] sm:h-48 sm:max-w-none sm:rounded-t-xl">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-[#050505] to-[#3f3f46] transition-all duration-500 sm:rounded-t-xl"
                        style={{ height: item.count > 0 ? `${Math.max((item.count / maxGrowth) * 100, 5)}%` : '0%' }}
                      />
                    </div>
                    <span className="truncate text-[10px] font-black capitalize text-[#71717a] sm:text-xs">{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] sm:rounded-[2rem]">
            <CardHeader className="px-4 py-4 sm:px-6 sm:py-5">
              <h2 className="text-xl font-serif font-bold text-[#050505] sm:text-2xl">{t.monthlyRevenue}</h2>
              <p className="mt-1 text-xs font-semibold text-[#71717a]">
                {language === 'es' ? 'Ingresos registrados · últimos 6 meses' : 'Recorded revenue · last 6 months'}
              </p>
            </CardHeader>
            <CardContent className="p-3 sm:p-5 xl:p-6">
              {platformMonthlyRevenue.some((item) => item.total > 0) ? (
                <div className="flex h-64 items-end gap-2 rounded-2xl border border-[#f1ebdf] bg-[#fffdf8] px-3 pb-3 pt-5 sm:h-72 sm:gap-3 sm:p-4">
                  {platformMonthlyRevenue.map((item) => (
                    <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                      <span className="max-w-full truncate text-[9px] font-black tabular-nums text-[#050505] sm:text-xs">
                        {item.total.toLocaleString(t.locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                      </span>
                      <div className="flex h-40 w-full max-w-10 items-end overflow-hidden rounded-t-lg bg-[#f1efe9] sm:h-48 sm:max-w-none sm:rounded-t-xl">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-[#d9a900] to-[#f4c542] transition-all duration-500 sm:rounded-t-xl"
                          style={{ height: item.total > 0 ? `${Math.max((item.total / maxRevenue) * 100, 5)}%` : '0%' }}
                        />
                      </div>
                      <span className="truncate text-[10px] font-black capitalize text-[#71717a] sm:text-xs">{item.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-[#dfd5c2] bg-[#fffdf8] px-6 text-center sm:h-64">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff4c7] text-[#8a6a16]">
                    <DollarSign size={22} />
                  </div>
                  <p className="font-black text-[#050505]">
                    {language === 'es' ? 'Aún no hay ingresos registrados' : 'No revenue recorded yet'}
                  </p>
                  <p className="mt-1 max-w-sm text-sm font-medium text-[#71717a]">
                    {language === 'es' ? 'La gráfica aparecerá cuando se registren pagos de suscripciones.' : 'The chart will appear when subscription payments are recorded.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-serif font-bold text-[#050505]">{t.planDistribution}</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {planDistribution.map((item) => (
                  <div key={item.plan}>
                    <div className="mb-2 flex items-center justify-between text-sm font-black text-[#050505]">
                      <span className="capitalize">{item.plan}</span>
                      <span>{item.count}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-[#f6f4ee]">
                      <div className="h-full rounded-full bg-[#050505] transition-all duration-500" style={{ width: `${(item.count / maxPlanCount) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] sm:rounded-[2rem]">
            <CardHeader className="px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-serif font-bold text-[#050505]">{t.recentPlatformActivity}</h2>
                <span className="rounded-full bg-[#050505] px-2.5 py-1 text-[11px] font-black text-[#f4c542]">
                  {recentPlatformActivity.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-5 xl:p-5">
              <div className="overflow-hidden rounded-2xl border border-[#f1ebdf] bg-white">
                {recentPlatformActivity.map((item) => (
                  <div key={item.id} className="flex min-w-0 items-center gap-3 border-b border-[#f1ebdf] px-3 py-3 last:border-b-0 sm:px-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f6f4ee] text-[#8a6a16]">
                      <Building2 size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-[#050505] sm:text-base">{item.name}</p>
                      <p className="mt-0.5 text-xs font-semibold text-[#71717a]">
                        {language === 'es' ? 'Creado' : 'Created'} · {item.date
                          ? new Date(item.date).toLocaleDateString(t.locale, { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                        item.detail === 'premium'
                          ? 'bg-[#050505] text-[#f4c542]'
                          : item.detail === 'pro'
                            ? 'bg-[#fff4c7] text-[#8a6a16]'
                            : item.detail === 'basic'
                              ? 'bg-[#f1f0ec] text-[#52525b]'
                              : 'bg-blue-50 text-blue-700'
                      }`}>
                        {item.detail}
                      </span>
                      {item.status === 'bloqueado' && (
                        <span className="text-[9px] font-black uppercase text-red-600">{language === 'es' ? 'Bloqueado' : 'Blocked'}</span>
                      )}
                    </div>
                  </div>
                ))}
                {recentPlatformActivity.length === 0 && <div className="rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] py-8 text-center font-semibold text-[#71717a]">{t.noPlatformActivity}</div>}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] sm:rounded-[2rem]">
            <CardHeader className="px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-serif font-bold text-[#050505]">{t.trialAlerts}</h2>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${expiringTrials.length > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {expiringTrials.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-5 xl:p-5">
              <div className="overflow-hidden rounded-2xl border border-[#f1ebdf] bg-white">
                {expiringTrials.map((business) => {
                  const trialEnd = business.trial_ends_at ? new Date(business.trial_ends_at) : null;
                  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : null;
                  return (
                    <div key={business.id} className="flex min-w-0 items-center gap-3 border-b border-red-100 bg-red-50/55 px-3 py-3 last:border-b-0 sm:px-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                        <CalendarClock size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[#050505] sm:text-base">{business.nombre || business.name || 'Business'}</p>
                        <p className="mt-0.5 text-xs font-semibold text-red-700">
                          {trialEnd ? trialEnd.toLocaleDateString(t.locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-red-700">
                        {daysLeft} {language === 'es' ? 'días' : 'days'}
                      </span>
                    </div>
                  );
                })}
                {expiringTrials.length === 0 && (
                  <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                      <ShieldCheck size={20} />
                    </div>
                    <p className="text-sm font-bold text-[#71717a]">{t.noTrialAlerts}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden pb-20 text-[#08080b] sm:space-y-6 sm:pb-6">
      <section className="relative min-w-0 overflow-hidden rounded-[1.5rem] border border-[#e9e2d3]/80 bg-[#fffdf8]/85 p-4 shadow-[0_24px_70px_rgba(15,15,15,0.07)] backdrop-blur-2xl sm:rounded-[2rem] sm:p-7 xl:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,197,66,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.88),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f4c542]/60 to-transparent" />
        <div className="relative z-10 flex min-w-0 flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#eadfca] bg-white/75 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6a16] shadow-sm backdrop-blur-xl">
              <Sparkles size={14} />
              MatMax Business Suite
            </div>
            <h1 className="mb-3 text-3xl font-black tracking-tight text-[#050505] sm:text-5xl xl:text-6xl">
              Dashboard
            </h1>
            <p className="max-w-3xl text-sm font-bold uppercase tracking-[0.18em] text-[#71717a] sm:text-base">
              {isSeller ? t.sellerHeroSubtitle : t.heroSubtitle}
            </p>
          </div>

          <div className="grid w-full min-w-0 grid-cols-1 gap-3 xl:w-[520px]">
            <div className="relative min-w-0 overflow-hidden rounded-[1.5rem] border border-[#e9e2d3] bg-white/78 p-4 shadow-sm backdrop-blur-xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.12),transparent_38%)]" />
              <div className="relative flex min-w-0 items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542] shadow-[0_16px_36px_rgba(0,0,0,0.2)]">
                  <Package className="h-5 w-5 shrink-0" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#8a6a16]">{t.business}</p>
                  <p className="break-words text-xl font-black leading-tight text-[#050505] sm:text-2xl">
                    {businessName}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative min-w-0 overflow-hidden rounded-[1.5rem] border border-[#e9e2d3] bg-white/78 p-4 shadow-sm backdrop-blur-xl">
              <div className="relative flex min-w-0 items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff4c7] text-[#8a6a16] shadow-[0_16px_36px_rgba(138,106,22,0.14)]">
                  <Users className="h-5 w-5 shrink-0" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#8a6a16]">{t.loggedUser}</p>
                  <p className="break-words text-lg font-black leading-tight text-[#050505] sm:text-xl">
                    {loggedUserName}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={loadDashboardData}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#e9e2d3] bg-white/90 px-5 py-3 text-sm font-black text-[#050505] shadow-[0_14px_34px_rgba(15,15,15,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#fff9e8] sm:w-auto"
        >
          <RefreshCw size={16} className="transition-transform duration-300 group-hover:rotate-180" />
          {t.refresh}
        </button>
      </div>

      {isSeller && (
        <div className="rounded-[1.5rem] border border-[#e9e2d3] bg-[#fbfaf7] px-4 py-3 text-sm font-bold text-[#71717a] shadow-sm">
          {t.sellerBasicView}
        </div>
      )}

      <div className={`grid min-w-0 grid-cols-2 gap-3 sm:gap-5 ${isSeller ? '2xl:grid-cols-2' : '2xl:grid-cols-4'}`}>
        <DashboardMetricCard
          title={isSeller ? t.todaySalesCount : t.todaySales}
          value={isSeller ? stats.cantidadVentasHoy.toLocaleString('en-US') : money(stats.ventasHoy)}
          subtitle={isSeller ? t.todaySalesSubtitle : t.todaySalesSubtitle}
          icon={ShoppingCart}
          iconClass="bg-[#050505] text-[#f4c542]"
          compact
        />
        {!isSeller && (
          <DashboardMetricCard title={t.cashToday} value={money(stats.ingresosContadoHoy)} subtitle={t.cashTodaySubtitle} icon={DollarSign} iconClass="bg-[#fff4c7] text-[#8a6a16]" compact />
        )}
        {!isSeller && (
          <DashboardMetricCard title={t.creditToday} value={money(stats.ventasCreditoHoy)} subtitle={t.creditTodaySubtitle} icon={CreditCard} iconClass="bg-[#f6f4ee] text-[#050505]" compact />
        )}
        {!isSeller && (
          <DashboardMetricCard title={t.monthSales} value={money(stats.ventasMes)} subtitle={t.monthSalesSubtitle} icon={TrendingUp} iconClass="bg-[#050505] text-[#f4c542]" compact />
        )}
      </div>

      {!isSeller && (
        <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-5">
          <DashboardMetricCard title={t.products} value={stats.totalProductos.toLocaleString('en-US')} subtitle={`${stats.productosBajoStock.toLocaleString('en-US')} ${t.productsLowStock}`} icon={Package} iconClass="bg-[#fff4c7] text-[#8a6a16]" compact />
          <DashboardMetricCard title={t.clients} value={stats.totalClientes.toLocaleString('en-US')} subtitle={`${stats.clientesConDeuda.toLocaleString('en-US')} ${t.clientsDebt}`} icon={Users} iconClass="bg-[#050505] text-[#f4c542]" compact />
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-serif font-bold text-[#050505] sm:text-2xl">{t.last7Days}</h2>
              <p className="mt-1 text-sm font-medium text-[#71717a]">{t.cashAndCreditByDay}</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-[#f4c542]" />
                <span className="text-sm font-bold text-[#52525b]">{t.cash}</span>
              </div>
              {!isSeller && (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-[#050505]" />
                  <span className="text-sm font-bold text-[#52525b]">{t.credit}</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-4 sm:px-5 sm:pb-5">
          <div className="min-w-0">
            <div className="grid h-56 min-w-0 grid-cols-7 items-end gap-1 sm:h-72 sm:gap-3 md:h-80">
              {ventasUltimos7Dias.map((day) => {
                const contadoHeight = maxChartValue > 0 ? (day.contado / maxChartValue) * 100 : 0;
                const creditoHeight = maxChartValue > 0 ? (day.credito / maxChartValue) * 100 : 0;

                return (
                  <div key={day.date} className="flex min-w-0 flex-col items-center gap-2 sm:gap-3">
                    <div className="flex h-40 w-full items-end justify-center sm:h-56 md:h-64">
                      <div className="relative h-full w-full overflow-hidden rounded-t-lg border border-[#eee6d8] bg-[#f6f4ee] shadow-inner sm:rounded-t-2xl">
                        <div
                          className={`absolute bottom-0 left-0 rounded-t-2xl bg-gradient-to-t from-[#d9a900] to-[#f4c542] transition-all duration-500 ${isSeller ? 'w-full' : 'w-1/2'}`}
                          style={{ height: `${contadoHeight}%` }}
                          title={`${t.cash}: ${money(day.contado)}`}
                        />
                        {!isSeller && (
                          <div
                            className="absolute bottom-0 right-0 w-1/2 rounded-t-2xl bg-gradient-to-t from-[#050505] to-[#3f3f46] transition-all duration-500"
                            style={{ height: `${creditoHeight}%` }}
                            title={`${t.credit}: ${money(day.credito)}`}
                          />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 text-center">
                      <span className="block truncate text-[10px] font-black text-[#3f3f46] sm:text-sm">{day.label}</span>
                      {!isSeller && <span className="hidden text-xs font-bold text-[#71717a] sm:block">{money(day.total)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className={`grid min-w-0 grid-cols-1 gap-4 sm:gap-6 ${isSeller ? 'xl:grid-cols-1' : 'xl:grid-cols-3'}`}>
        <Card>
          <CardHeader>
            <h2 className="text-xl font-serif font-bold text-[#050505]">{t.recentSales}</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ultimasVentas.map((venta) => (
                <button
                  key={venta.id}
                  type="button"
                  onClick={() => openInvoiceFromDashboard(venta.id)}
                  className="group flex w-full min-w-0 flex-col items-stretch rounded-2xl border border-[#f1ebdf] bg-[#fffdf8] p-3 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#f4c542]/35 hover:bg-white hover:shadow-[0_20px_50px_rgba(15,15,15,0.10)] sm:flex-row sm:items-center sm:justify-between sm:p-4"
                >
                  <div className="min-w-0 flex-1 sm:pr-3">
                    <p className="font-black text-[#050505] transition-colors duration-300 group-hover:text-[#8a6a16]">{formatSaleCode(venta.id)}</p>
                    <p className="mt-0.5 line-clamp-2 break-words text-sm font-medium leading-snug text-[#71717a]">
                      {getClientName(venta.clientes, t.generalClient)}{!isSeller ? ` · ${venta.tipo_pago === 'Contado' ? t.cash : t.credit}` : ''}
                    </p>
                    <p className="mt-1 break-words text-xs font-bold leading-snug text-[#8a6a16]">
                      {t.seller}: {getSaleSeller(venta)} · {t.time}: {getSaleTime(venta, t.locale)}
                    </p>
                    {!isSeller && getSaleDiscountAmount(venta) > 0 && (
                      <p className="truncate text-xs font-black text-red-600">
                        {t.discount}: -{money(getSaleDiscountAmount(venta))}
                      </p>
                    )}
                  </div>
                  {!isSeller && (
                    <p className="mt-2 self-end whitespace-nowrap text-lg font-black tabular-nums text-[#8a6a16] sm:mt-0 sm:shrink-0">
                      {money(venta.total)}
                    </p>
                  )}
                </button>
              ))}

              {ultimasVentas.length === 0 && (
                <div className="rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] py-8 text-center font-semibold text-[#71717a]">{t.noSales}</div>
              )}
            </div>
          </CardContent>
        </Card>

        {!isSeller && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-serif font-bold text-[#050505]">{t.lowStockProducts}</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {productosBajoStock.map((producto) => (
                  <div key={producto.id} className="flex min-w-0 items-center justify-between rounded-2xl border border-[#f1ebdf] bg-[#fffdf8] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#e9e2d3] hover:bg-white hover:shadow-[0_16px_40px_rgba(15,15,15,0.08)] sm:p-4">
                    <div className="min-w-0 flex-1 overflow-hidden pr-3">
                      <p className="line-clamp-2 break-words font-black leading-snug text-[#050505]">{producto.nombre}</p>
                      <p className="text-sm font-medium text-[#71717a]">
                        {t.minimum}: {Number(producto.minimo || 0).toLocaleString('en-US')}
                      </p>
                    </div>
                    <p className="rounded-full bg-red-100 px-3 py-1 text-sm font-black text-red-700">
                      {Number(producto.stock || 0).toLocaleString('en-US')}
                    </p>
                  </div>
                ))}

                {productosBajoStock.length === 0 && (
                  <div className="rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] py-8 text-center font-semibold text-[#71717a]">{t.noLowStock}</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {!isSeller && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-serif font-bold text-[#050505]">{t.debtClients}</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientesConDeuda.map((cliente) => (
                  <div key={cliente.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[#f1ebdf] bg-[#fffdf8] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#e9e2d3] hover:bg-white hover:shadow-[0_16px_40px_rgba(15,15,15,0.08)] sm:p-4">
                    <div className="min-w-0 flex-1 overflow-hidden pr-3">
                      <p className="line-clamp-2 break-words font-black leading-snug text-[#050505]">{cliente.nombre}</p>
                      <p className="mt-1 break-words text-xs font-medium leading-snug text-[#71717a] sm:text-sm">
                        {t.limit}: {money(cliente.limite_credito)}
                      </p>
                    </div>
                    <p className="shrink-0 whitespace-nowrap rounded-full bg-red-100 px-2.5 py-1 text-right text-xs font-black tabular-nums text-red-700 sm:px-3 sm:text-sm">
                      {money(cliente.saldo)}
                    </p>
                  </div>
                ))}

                {clientesConDeuda.length === 0 && (
                  <div className="rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] py-8 text-center font-semibold text-[#71717a]">{t.noPendingBalances}</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function DashboardMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
  compact = false
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ElementType;
  iconClass: string;
  compact?: boolean;
}) {
  return (
    <div className={`group relative min-w-0 overflow-hidden border border-[#e9e2d3]/85 bg-white/90 shadow-[0_18px_50px_rgba(15,15,15,0.055)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#f4c542]/35 hover:bg-white hover:shadow-[0_28px_70px_rgba(15,15,15,0.09)] ${
      compact
        ? 'flex min-h-[9.5rem] flex-col justify-between rounded-[1.4rem] p-4 sm:min-h-0 sm:flex-row sm:items-center sm:gap-4 sm:rounded-[1.75rem] sm:p-6'
        : 'flex items-center justify-between gap-4 rounded-[1.75rem] p-5 sm:p-6'
    }`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.09),transparent_38%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className={`relative z-10 min-w-0 flex-1 overflow-hidden ${compact ? 'pt-11 sm:pt-0 sm:pr-2' : 'pr-2'}`}>
        <p className={`mb-2 font-black uppercase text-[#8a6a16] ${compact ? 'line-clamp-2 text-[9px] leading-4 tracking-[0.14em] sm:truncate sm:text-[10px] sm:tracking-[0.18em]' : 'truncate text-[10px] tracking-[0.18em]'}`}>
          {title}
        </p>
        <p className={`max-w-full whitespace-nowrap font-black leading-none tracking-[-0.04em] text-[#050505] ${compact ? 'text-[clamp(1.05rem,4.55vw,2.35rem)] sm:text-[2.15rem] 2xl:text-[2.35rem]' : 'text-[1.9rem] sm:text-[2.15rem] 2xl:text-[2.35rem]'}`}>
          {value}
        </p>
        <p className={`mt-2 font-bold leading-snug text-[#71717a] ${compact ? 'line-clamp-2 text-[11px] sm:text-sm' : 'truncate text-sm'}`}>
          {subtitle}
        </p>
      </div>
      <div className={`z-10 flex shrink-0 items-center justify-center shadow-[0_16px_34px_rgba(15,15,15,0.12)] transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 ${
        compact ? 'absolute right-3 top-3 h-9 w-9 rounded-xl sm:relative sm:right-auto sm:top-auto sm:h-14 sm:w-14 sm:rounded-[1.15rem]' : 'relative h-12 w-12 rounded-[1.15rem] sm:h-14 sm:w-14'
      } ${iconClass}`}>
        <Icon className={`${compact ? 'h-4 w-4 sm:h-6 sm:w-6' : 'h-6 w-6'} shrink-0`} />
      </div>
    </div>
  );
}
