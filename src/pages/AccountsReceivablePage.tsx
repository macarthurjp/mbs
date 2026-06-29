

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ElementType, FormEvent } from 'react';
import { AlertTriangle, Banknote, CreditCard, History, RefreshCw, Search, ShieldCheck, Sparkles, Users, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getUserRoleFlags } from '../utils/roles';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { formatEmail, formatPhone } from '../utils/formatContact';

type Cliente = {
  id: number;
  negocio_id: string | null;
  nombre: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  limite_credito: number | null;
  saldo: number | null;
  created_at?: string | null;
};

type ClientePago = {
  id: number;
  negocio_id: string | null;
  cliente_id: number | null;
  venta_id: number | null;
  fecha: string;
  monto: number;
  moneda_pago?: string | null;
  monto_original?: number | null;
  tasa_cambio?: number | null;
  created_at?: string | null;
};

type VentaCredito = {
  id: number;
  negocio_id: string | null;
  cliente_id: number | null;
  fecha: string;
  total: number | null;
  saldo_pendiente: number | null;
  fecha_vencimiento: string | null;
  estado_credito: 'pendiente' | 'parcial' | 'pagado' | 'vencido' | null;
  estado?: string | null;
};

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

const receivablesCopy = {
  es: {
    loading: 'Cargando cuentas por cobrar...',
    missingTitle: 'Usuario sin negocio asignado',
    missingText: 'El login funciona, pero este usuario todavía no existe en la tabla usuarios o no tiene un negocio_id asignado.',
    title: 'Cuentas por cobrar',
    subtitle: 'Control premium de clientes con saldo pendiente y límite de crédito',
    restrictedTitle: 'Acceso restringido',
    restrictedSellerText: 'Los vendedores no tienen acceso al módulo de cuentas por cobrar.',
    businessSuite: 'MatMax Business Suite',
    refresh: 'Actualizar',
    searchPlaceholder: 'Buscar por cliente, teléfono, email o dirección...',
    totalReceivable: 'Total por cobrar',
    clientsWithDebt: 'Clientes con deuda',
    totalCreditLimit: 'Límite total',
    exceededClients: 'Clientes excedidos',
    averageDebt: 'Promedio deuda',
    availableCredit: 'Crédito disponible',
    overdueTotal: 'Total vencido',
    overdueInvoices: 'Facturas vencidas',
    overdueFilter: 'Vencidos',
    allFilter: 'Todos',
    dueDate: 'Vence',
    daysLate: 'Días atraso',
    noDueDate: 'Sin vencimiento',
    dueToday: 'Vence hoy',
    overdue: 'Vencido',
    pending: 'Pendiente',
    partial: 'Parcial',
    paid: 'Pagado',
    client: 'Cliente',
    contact: 'Contacto',
    creditLimit: 'Límite',
    balance: 'Saldo',
    available: 'Disponible',
    status: 'Estado',
    actions: 'Acciones',
    exceeded: 'Excedido',
    healthy: 'Disponible',
    noDebtClients: 'No hay cuentas por cobrar',
    registerPayment: 'Registrar pago',
    paymentHistory: 'Historial de pagos',
    loadingPayments: 'Cargando pagos...',
    noPayments: 'No hay pagos registrados',
    paymentDate: 'Fecha',
    paymentTransaction: 'Transacción',
    paymentTotal: 'Monto',
    paymentRegistered: 'Pagos registrados',
    creditPayment: 'Pago a deuda',
    purchaseTransaction: 'Compra',
    loadPaymentsError: 'Error al cargar el historial de pagos',
    paymentAmount: 'Monto recibido',
    paymentCurrency: 'Moneda recibida',
    systemCurrency: 'Moneda del sistema',
    alternativeCurrency: 'Moneda alternativa',
    exchangeRate: 'Tasa',
    convertedAmount: 'Monto convertido',
    exchangeRateUnavailable: 'Configura una tasa del día en Settings para cobrar en otra moneda.',
    paymentSummary: 'Resumen del pago',
    pendingBalance: 'Saldo pendiente',
    newBalance: 'Nuevo saldo',
    cancel: 'Cancelar',
    confirmingPayment: 'Registrando...',
    noBusiness: 'No se encontró el negocio del usuario',
    selectClientError: 'Selecciona un cliente válido',
    paymentAmountRequired: 'Ingresa un monto válido',
    paymentAmountTooHigh: 'El monto no puede ser mayor que el saldo pendiente',
    paymentSuccess: 'Pago registrado correctamente',
    paymentNotificationTitle: 'Pago recibido',
    paymentNotificationMessage: 'Pago registrado para',
    paymentError: 'Error al registrar el pago',
    sellerViewNotice: 'Vista de vendedor: saldos de clientes y registro de pagos',
    loadError: 'Error al cargar cuentas por cobrar',
  },
  en: {
    loading: 'Loading accounts receivable...',
    missingTitle: 'User has no assigned business',
    missingText: 'Login works, but this user does not exist in the usuarios table yet or does not have an assigned negocio_id.',
    title: 'Accounts Receivable',
    subtitle: 'Premium control of clients with pending balances and credit limits',
    restrictedTitle: 'Restricted access',
    restrictedSellerText: 'Sellers do not have access to the accounts receivable module.',
    businessSuite: 'MatMax Business Suite',
    refresh: 'Refresh',
    searchPlaceholder: 'Search by client, phone, email, or address...',
    totalReceivable: 'Total receivable',
    clientsWithDebt: 'Clients with debt',
    totalCreditLimit: 'Total credit limit',
    exceededClients: 'Exceeded clients',
    averageDebt: 'Average debt',
    availableCredit: 'Available credit',
    overdueTotal: 'Overdue total',
    overdueInvoices: 'Overdue invoices',
    overdueFilter: 'Overdue',
    allFilter: 'All',
    dueDate: 'Due date',
    daysLate: 'Days late',
    noDueDate: 'No due date',
    dueToday: 'Due today',
    overdue: 'Overdue',
    pending: 'Pending',
    partial: 'Partial',
    paid: 'Paid',
    client: 'Client',
    contact: 'Contact',
    creditLimit: 'Limit',
    balance: 'Balance',
    available: 'Available',
    status: 'Status',
    actions: 'Actions',
    exceeded: 'Exceeded',
    healthy: 'Available',
    noDebtClients: 'No accounts receivable',
    registerPayment: 'Register payment',
    paymentHistory: 'Payment history',
    loadingPayments: 'Loading payments...',
    noPayments: 'No registered payments',
    paymentDate: 'Date',
    paymentTransaction: 'Transaction',
    paymentTotal: 'Amount',
    paymentRegistered: 'Registered payments',
    creditPayment: 'Debt payment',
    purchaseTransaction: 'Purchase',
    loadPaymentsError: 'Error loading payment history',
    paymentAmount: 'Amount received',
    paymentCurrency: 'Payment currency',
    systemCurrency: 'System currency',
    alternativeCurrency: 'Alternative currency',
    exchangeRate: 'Rate',
    convertedAmount: 'Converted amount',
    exchangeRateUnavailable: 'Set a daily exchange rate in Settings to accept another currency.',
    paymentSummary: 'Payment summary',
    pendingBalance: 'Pending balance',
    newBalance: 'New balance',
    cancel: 'Cancel',
    confirmingPayment: 'Registering...',
    noBusiness: 'The user business was not found',
    selectClientError: 'Select a valid client',
    paymentAmountRequired: 'Enter a valid amount',
    paymentAmountTooHigh: 'The amount cannot be greater than the pending balance',
    paymentSuccess: 'Payment registered successfully',
    paymentNotificationTitle: 'Payment received',
    paymentNotificationMessage: 'Payment registered for',
    paymentError: 'Error registering payment',
    sellerViewNotice: 'Seller view: client balances and payment registration',
    loadError: 'Error loading accounts receivable',
  },
} as const;

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

function getAvailableCredit(client: Cliente) {
  return Math.max(0, Number(client.limite_credito || 0) - Number(client.saldo || 0));
}

function getExceededAmount(client: Cliente) {
  return Math.max(0, Number(client.saldo || 0) - Number(client.limite_credito || 0));
}

function getLocalDateString(date: Date) {
  return date.toLocaleDateString('en-CA');
}

function isCancelledSale(venta: VentaCredito | null | undefined) {
  const estado = String(venta?.estado || '').toLowerCase().trim();
  return ['anulada', 'cancelada', 'cancelled', 'void'].includes(estado);
}

function getDaysLate(fechaVencimiento: string | null | undefined) {
  if (!fechaVencimiento) return 0;

  const today = new Date(getLocalDateString(new Date()));
  const dueDate = new Date(`${fechaVencimiento}T00:00:00`);

  if (Number.isNaN(dueDate.getTime())) return 0;

  const diffMs = today.getTime() - dueDate.getTime();
  return Math.max(0, Math.floor(diffMs / 86400000));
}

function getClientCreditSales(clientId: number, sales: VentaCredito[]) {
  return sales.filter((sale) => sale.cliente_id === clientId && !isCancelledSale(sale) && Number(sale.saldo_pendiente || 0) > 0);
}

function getClientNextDueDate(clientId: number, sales: VentaCredito[]) {
  const dates = getClientCreditSales(clientId, sales)
    .map((sale) => sale.fecha_vencimiento)
    .filter(Boolean)
    .sort() as string[];

  return dates[0] || null;
}

function getClientMaxDaysLate(clientId: number, sales: VentaCredito[]) {
  return Math.max(0, ...getClientCreditSales(clientId, sales).map((sale) => getDaysLate(sale.fecha_vencimiento)));
}

function getClientOverdueAmount(clientId: number, sales: VentaCredito[]) {
  return getClientCreditSales(clientId, sales)
    .filter((sale) => getDaysLate(sale.fecha_vencimiento) > 0)
    .reduce((sum, sale) => sum + Number(sale.saldo_pendiente || 0), 0);
}

function getClientCreditStatus(clientId: number, sales: VentaCredito[]) {
  const clientSales = getClientCreditSales(clientId, sales);
  const hasOverdue = clientSales.some((sale) => getDaysLate(sale.fecha_vencimiento) > 0);
  const hasPartial = clientSales.some((sale) => sale.estado_credito === 'parcial');

  if (hasOverdue) return 'vencido';
  if (hasPartial) return 'parcial';
  return 'pendiente';
}

export default function AccountsReceivablePage() {
  const { user, userProfile } = useAuth();
  const { showToast } = useNotification();
  const { language } = useLanguage();
  const t = receivablesCopy[language];

  const roleFlags = getUserRoleFlags(userProfile);
  const isSuperAdmin = roleFlags.isSuperAdmin;
  const canManageReceivables = roleFlags.canManageFinancials || isSuperAdmin;

  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [filteredClients, setFilteredClients] = useState<Cliente[]>([]);
  const [creditSales, setCreditSales] = useState<VentaCredito[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY);
  const [exchangeRateSettings, setExchangeRateSettings] = useState<ExchangeRateSettings>(DEFAULT_EXCHANGE_RATE);
  const [loading, setLoading] = useState(true);
  const [missingNegocio, setMissingNegocio] = useState(false);
  const [payingClient, setPayingClient] = useState<Cliente | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState<'system' | 'secondary'>('system');
  const [savingPayment, setSavingPayment] = useState(false);
  const [historyClient, setHistoryClient] = useState<Cliente | null>(null);
  const [clientPayments, setClientPayments] = useState<ClientePago[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [debtFilter, setDebtFilter] = useState<'all' | 'overdue'>('all');

  useEffect(() => {
    const search = searchTerm.toLowerCase().trim();

    const filtered = clients.filter((client) => {
      const matchesSearch =
        client.nombre.toLowerCase().includes(search) ||
        (client.telefono || '').toLowerCase().includes(search) ||
        (client.email || '').toLowerCase().includes(search) ||
        (client.direccion || '').toLowerCase().includes(search);

      const matchesDebtFilter =
        debtFilter === 'all' ||
        (debtFilter === 'overdue' && getClientMaxDaysLate(client.id, creditSales) > 0);

      return matchesSearch && matchesDebtFilter;
    });

    setFilteredClients(filtered);
  }, [searchTerm, clients, debtFilter, creditSales]);

  const metrics = useMemo(() => {
    const totalReceivable = clients.reduce((sum, client) => sum + Number(client.saldo || 0), 0);
    const totalCreditLimit = clients.reduce((sum, client) => sum + Number(client.limite_credito || 0), 0);
    const exceededClients = clients.filter((client) => getExceededAmount(client) > 0).length;
    const availableCredit = clients.reduce((sum, client) => sum + getAvailableCredit(client), 0);
    const overdueTotal = creditSales
      .filter((sale) => !isCancelledSale(sale) && Number(sale.saldo_pendiente || 0) > 0 && getDaysLate(sale.fecha_vencimiento) > 0)
      .reduce((sum, sale) => sum + Number(sale.saldo_pendiente || 0), 0);
    const overdueInvoices = creditSales.filter((sale) => !isCancelledSale(sale) && Number(sale.saldo_pendiente || 0) > 0 && getDaysLate(sale.fecha_vencimiento) > 0).length;

    return {
      totalReceivable,
      totalCreditLimit,
      exceededClients,
      availableCredit,
      overdueTotal,
      overdueInvoices,
      clientsWithDebt: clients.length,
      averageDebt: clients.length > 0 ? totalReceivable / clients.length : 0
    };
  }, [clients, creditSales]);

  const rawPaymentAmount = Number(paymentAmount || 0);
  const paymentAmountNumber = Number.isFinite(rawPaymentAmount) ? rawPaymentAmount : 0;
  const canUseSecondaryCurrency = Boolean(exchangeRateSettings.rate && exchangeRateSettings.rate > 0);
  const activePaymentCurrencyCode = paymentCurrency === 'secondary' ? exchangeRateSettings.secondaryCurrency : currencySettings.code;
  const convertedPaymentAmount = paymentCurrency === 'secondary'
    ? paymentAmountNumber * Number(exchangeRateSettings.rate || 0)
    : paymentAmountNumber;
  const effectivePaymentAmount = convertedPaymentAmount;

  const loadReceivables = useCallback(async () => {
    try {
      setLoading(true);
      if (!canManageReceivables) {
        setLoading(false);
        return;
      }

      if (!user?.id) {
        setClients([]);
        setFilteredClients([]);
        setCreditSales([]);
        setCurrencySettings(DEFAULT_CURRENCY);
        setExchangeRateSettings(DEFAULT_EXCHANGE_RATE);
        setMissingNegocio(false);
        return;
      }

      const currentNegocioId = userProfile?.negocio_id || null;
      setNegocioId(currentNegocioId);

      if (!currentNegocioId) {
        setClients([]);
        setFilteredClients([]);
        setCreditSales([]);
        setCurrencySettings(DEFAULT_CURRENCY);
        setExchangeRateSettings(DEFAULT_EXCHANGE_RATE);
        setMissingNegocio(true);
        return;
      }

      const [clientsResult, creditSalesResult, businessResult] = await Promise.all([
        supabase
          .from('clientes')
          .select('id, negocio_id, nombre, telefono, email, direccion, limite_credito, saldo, created_at')
          .eq('negocio_id', currentNegocioId)
          .gt('saldo', 0)
          .order('saldo', { ascending: false }),
        supabase
          .from('ventas')
          .select('id, negocio_id, cliente_id, fecha, total, saldo_pendiente, fecha_vencimiento, estado_credito, estado')
          .eq('negocio_id', currentNegocioId)
          .eq('tipo_pago', 'Crédito')
          .gt('saldo_pendiente', 0)
          .order('fecha_vencimiento', { ascending: true, nullsFirst: false }),
        supabase
          .from('negocios')
          .select('*')
          .eq('id', currentNegocioId)
          .maybeSingle()
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (creditSalesResult.error) throw creditSalesResult.error;
      if (businessResult.error) throw businessResult.error;

      const debtClients = (clientsResult.data || []) as unknown as Cliente[];

      setClients(debtClients);
      setFilteredClients(debtClients);
      setCreditSales((creditSalesResult.data || []) as unknown as VentaCredito[]);
      setCurrencySettings(normalizeCurrencySettings(businessResult.data));
      setExchangeRateSettings(normalizeExchangeRateSettings(businessResult.data));
      setMissingNegocio(false);
    } catch (error) {
      console.error('Error loading accounts receivable:', error);
      showToast(t.loadError, 'error');
    } finally {
      setLoading(false);
    }
  }, [canManageReceivables, showToast, t.loadError, user?.id, userProfile?.negocio_id]);

  useEffect(() => {
    if (!canManageReceivables) {
      setLoading(false);
      return;
    }

    loadReceivables();
  }, [canManageReceivables, loadReceivables, roleFlags.role]);

  function openPaymentModal(client: Cliente) {
    if (!canManageReceivables) {
      showToast(t.paymentError, 'error');
      return;
    }

    setPayingClient(client);
    setPaymentAmount('');
    setPaymentCurrency('system');
    setIsPaymentModalOpen(true);
  }

  async function openPaymentHistory(client: Cliente) {
    if (!canManageReceivables) {
      showToast(t.loadPaymentsError, 'error');
      return;
    }

    if (!negocioId) {
      showToast(t.noBusiness, 'error');
      return;
    }

    try {
      setHistoryClient(client);
      setClientPayments([]);
      setIsHistoryModalOpen(true);
      setLoadingPayments(true);

      const { data, error } = await supabase
        .from('pagos')
        .select('id, negocio_id, cliente_id, venta_id, fecha, monto, moneda_pago, monto_original, tasa_cambio, created_at')
        .eq('negocio_id', negocioId)
        .eq('cliente_id', client.id)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setClientPayments((data || []) as unknown as ClientePago[]);
    } catch (error) {
      console.error('Error loading receivable payment history:', error);
      showToast(t.loadPaymentsError, 'error');
    } finally {
      setLoadingPayments(false);
    }
  }

  async function handlePaymentSubmit(e: FormEvent) {
    e.preventDefault();

    if (!canManageReceivables) {
      showToast(t.paymentError, 'error');
      return;
    }

    if (savingPayment) return;

    if (!payingClient) {
      showToast(t.selectClientError, 'error');
      return;
    }

    if (!negocioId) {
      showToast(t.noBusiness, 'error');
      return;
    }

    const amount = effectivePaymentAmount;
    const currentBalance = Number(payingClient.saldo || 0);

    if (paymentCurrency === 'secondary' && !canUseSecondaryCurrency) {
      showToast(t.exchangeRateUnavailable, 'error');
      return;
    }

    if (amount <= 0) {
      showToast(t.paymentAmountRequired, 'error');
      return;
    }

    if (amount > currentBalance) {
      showToast(t.paymentAmountTooHigh, 'error');
      return;
    }

    try {
      setSavingPayment(true);

      const today = new Date().toLocaleDateString('en-CA');

      const { data: paymentResult, error: paymentError } = await supabase.rpc('register_receivable_payment', {
        p_cliente_id: payingClient.id,
        p_monto: amount,
        p_moneda_pago: activePaymentCurrencyCode,
        p_monto_original: paymentAmountNumber,
        p_tasa_cambio: paymentCurrency === 'secondary' ? exchangeRateSettings.rate : null,
        p_fecha: today
      });

      if (paymentError) throw paymentError;

      const newBalance = Number(paymentResult?.[0]?.new_client_balance ?? Math.max(0, currentBalance - amount));

      const { error: receivableNotificationError } = await supabase
        .from('notifications')
        .insert({
          negocio_id: negocioId,
          user_id: null,
          audience: 'admin',
          title: t.paymentNotificationTitle,
          message: `${t.paymentNotificationMessage} ${payingClient.nombre}: ${formatMoney(amount, currencySettings)}. ${t.newBalance}: ${formatMoney(newBalance, currencySettings)}.`,
          type: 'success',
          category: 'accounts_receivable',
          link: 'accounts-receivable',
          read: false
        });

      if (receivableNotificationError) {
        console.warn('Accounts receivable notification was not created:', receivableNotificationError);
      }

      showToast(t.paymentSuccess, 'success');
      setIsPaymentModalOpen(false);
      setPayingClient(null);
      setPaymentAmount('');
      setPaymentCurrency('system');
      await loadReceivables();
    } catch (error) {
      console.error('Error registering receivable payment:', error);
      showToast(t.paymentError, 'error');
    } finally {
      setSavingPayment(false);
    }
  }

  if (!canManageReceivables) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-[2rem] border border-[#e9e2d3] bg-white p-8 text-center shadow-matmax-soft">
          <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-[#8a6a16]" />
          <h1 className="mb-3 text-2xl font-bold text-[#050505]">
            {t.restrictedTitle}
          </h1>
          <p className="text-[#71717a]">
            {t.restrictedSellerText}
          </p>
        </div>
      </div>
    );
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

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden text-[#08080b] sm:space-y-6">
      <section className="relative min-w-0 overflow-hidden rounded-[2rem] border border-[#e9e2d3]/80 bg-[#fffdf8]/85 p-5 shadow-[0_24px_70px_rgba(15,15,15,0.07)] backdrop-blur-2xl sm:p-7 xl:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,197,66,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.9),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f4c542]/60 to-transparent" />
        <div className="relative z-10 grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] xl:items-stretch">
          <div className="flex min-w-0 flex-col justify-between gap-6">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/';
                }}
                className="mb-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#eadfca] bg-white/75 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6a16] shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f4c542] hover:bg-[#fff9e8]"
              >
                <Sparkles size={14} />
                {t.businessSuite}
              </button>
              <h1 className="mb-3 text-4xl font-black tracking-tight text-[#050505] sm:text-5xl xl:text-6xl">
                {t.title}
              </h1>
              <p className="max-w-3xl text-sm font-bold uppercase tracking-[0.18em] text-[#71717a] sm:text-base">
                {t.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-[0.9fr_0.9fr_1.25fr]">
              <div className="rounded-2xl border border-[#e9e2d3] bg-white/75 p-4 shadow-sm backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.clientsWithDebt}</p>
                <p className="mt-2 text-[2rem] font-black leading-none tracking-tight text-red-700 sm:text-[2.35rem] xl:text-[2rem]">
                  {metrics.clientsWithDebt.toLocaleString('en-US')}
                </p>
              </div>
              <div className="rounded-2xl border border-red-100 bg-red-50/70 p-4 shadow-sm backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-700">{t.overdueInvoices}</p>
                <p className="mt-2 text-[2rem] font-black leading-none tracking-tight text-red-700 sm:text-[2.35rem] xl:text-[2rem]">
                  {metrics.overdueInvoices.toLocaleString('en-US')}
                </p>
              </div>
              {canManageReceivables && (
                <div className="rounded-2xl border border-[#e9e2d3] bg-white/80 p-4 shadow-sm backdrop-blur-xl sm:col-span-3 xl:col-span-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.availableCredit}</p>
                  <p className="mt-2 flex min-w-0 items-baseline gap-2 text-[#050505]">
                    <span className="shrink-0 text-xl font-black leading-none sm:text-2xl">{currencySettings.symbol}</span>
                    <span className="min-w-0 break-words text-[2rem] font-black leading-none tracking-tight tabular-nums sm:text-[2.35rem] xl:text-[2rem]">
                      {formatCurrency(metrics.availableCredit)}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3">
            <div className="relative min-w-0 overflow-hidden rounded-[1.5rem] border border-[#050505] bg-[#050505] p-5 text-white shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.2),transparent_38%)]" />
              <div className="relative flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f4c542] text-[#050505] shadow-[0_16px_36px_rgba(244,197,66,0.2)]">
                  <Wallet className="h-6 w-6 shrink-0" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#f4c542]">{t.totalReceivable}</p>
                  <p className="break-words text-3xl font-black leading-none text-white sm:text-4xl">
                    {formatMoney(metrics.totalReceivable, currencySettings)}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative min-w-0 overflow-hidden rounded-[1.5rem] border border-[#e9e2d3] bg-white/78 p-4 shadow-sm backdrop-blur-xl">
              <div className="relative flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff4c7] text-[#8a6a16] shadow-[0_16px_36px_rgba(138,106,22,0.14)]">
                  <ShieldCheck className="h-5 w-5 shrink-0" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#8a6a16]">{t.overdueTotal}</p>
                  <p className="break-words text-xl font-black leading-tight text-red-700 sm:text-2xl">
                    {formatMoney(metrics.overdueTotal, currencySettings)}
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full gap-2 rounded-2xl border border-[#e9e2d3] bg-white/90 shadow-[0_14px_34px_rgba(15,15,15,0.05)] hover:-translate-y-0.5"
              onClick={loadReceivables}
            >
              <RefreshCw size={16} />
              {t.refresh}
            </Button>
          </div>
        </div>
      </section>

      {/* Seller notice removed */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard title={t.totalReceivable} value={formatMoney(metrics.totalReceivable, currencySettings)} icon={Wallet} iconClass="bg-[#050505] text-[#f4c542]" />
        <MetricCard title={t.clientsWithDebt} value={metrics.clientsWithDebt.toLocaleString('en-US')} icon={Users} iconClass="bg-[#fff4c7] text-[#8a6a16]" />
        {canManageReceivables && (
          <MetricCard title={t.exceededClients} value={metrics.exceededClients.toLocaleString('en-US')} icon={AlertTriangle} iconClass="bg-red-100 text-red-700" valueClass="text-red-600" />
        )}
        {canManageReceivables && (
          <MetricCard title={t.totalCreditLimit} value={formatMoney(metrics.totalCreditLimit, currencySettings)} icon={CreditCard} iconClass="bg-[#f6f4ee] text-[#050505]" />
        )}
        <MetricCard title={t.overdueTotal} value={formatMoney(metrics.overdueTotal, currencySettings)} icon={AlertTriangle} iconClass="bg-red-100 text-red-700" valueClass="text-red-600" />
        <MetricCard title={t.overdueInvoices} value={metrics.overdueInvoices.toLocaleString('en-US')} icon={AlertTriangle} iconClass="bg-red-100 text-red-700" valueClass="text-red-600" />
      </div>

      <div className="rounded-[1.6rem] border border-[#e9e2d3] bg-white/92 p-4 shadow-[0_18px_50px_rgba(15,15,15,0.06)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
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
      </div>

      <div className="rounded-[1.6rem] border border-[#e9e2d3] bg-white/92 p-4 shadow-[0_18px_50px_rgba(15,15,15,0.06)] backdrop-blur-xl sm:rounded-[2rem] sm:p-5">
        <div className="flex flex-wrap gap-2">
          <FilterButton active={debtFilter === 'all'} onClick={() => setDebtFilter('all')}>
            {t.allFilter}
          </FilterButton>
          <FilterButton active={debtFilter === 'overdue'} onClick={() => setDebtFilter('overdue')}>
            {t.overdueFilter}
          </FilterButton>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <h2 className="text-xl font-serif font-bold text-[#050505] sm:text-2xl">{t.title}</h2>
            <p className="mt-1 text-sm font-semibold text-[#71717a]">
              {filteredClients.length.toLocaleString('en-US')} {t.clientsWithDebt.toLowerCase()}
            </p>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-[#f1ebdf] bg-[#fffdf8]">
            <table className="w-full table-fixed text-sm">
              <thead className="border-b border-[#e9e2d3] bg-[#fbfaf7]">
                <tr>
                  <th className="w-[16%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a16]">{t.client}</th>
                  <th className="w-[20%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a16]">{t.contact}</th>
                  <th className="w-[11%] px-3 py-3 text-right text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a16]">{t.balance}</th>
                  <th className="w-[12%] px-3 py-3 text-right text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a16]">{t.dueDate}</th>
                  <th className="w-[11%] px-3 py-3 text-right text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a16]">{t.daysLate}</th>
                  <th className="w-[12%] px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a16]">{t.status}</th>
                  <th className="w-[18%] px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a16]">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1ebdf]">
                {filteredClients.map((client) => {
                  const nextDueDate = getClientNextDueDate(client.id, creditSales);
                  const maxDaysLate = getClientMaxDaysLate(client.id, creditSales);
                  const creditStatus = getClientCreditStatus(client.id, creditSales);
                  const overdueAmount = getClientOverdueAmount(client.id, creditSales);

                  return (
                    <tr key={client.id} className="odd:bg-white even:bg-[#fffdf8] transition-all duration-300 hover:bg-[#fff9e8]">
                      <td className="px-3 py-3">
                        <p className="truncate font-black text-[#050505]">{client.nombre}</p>
                        <p className="line-clamp-2 text-xs font-semibold leading-snug text-[#71717a]" title={client.direccion || ''}>{client.direccion || '-'}</p>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <p className="whitespace-nowrap font-semibold text-[#71717a]">{formatPhone(client.telefono)}</p>
                        <p className="mt-1 max-w-[260px] whitespace-normal break-words text-xs font-semibold leading-snug text-[#71717a]" title={client.email || ''}>
                          {formatEmail(client.email)}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-black tabular-nums text-red-700">
                        {formatMoney(client.saldo, currencySettings)}
                        {overdueAmount > 0 && (
                          <p className="mt-1 text-[10px] font-black text-red-600">
                            {t.overdue}: {formatMoney(overdueAmount, currencySettings)}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-black tabular-nums text-[#050505]">
                        {nextDueDate || t.noDueDate}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-3 text-right font-black tabular-nums ${maxDaysLate > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                        {maxDaysLate > 0 ? maxDaysLate.toLocaleString('en-US') : '0'}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${creditStatus === 'vencido' ? 'bg-red-100 text-red-700' : creditStatus === 'parcial' ? 'bg-[#fff4c7] text-[#8a6a16]' : 'bg-emerald-50 text-emerald-700'}`}>
                          {creditStatus === 'vencido' ? t.overdue : creditStatus === 'parcial' ? t.partial : t.pending}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex min-w-[92px] items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openPaymentHistory(client)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#e9e2d3] bg-white text-[#71717a] shadow-[0_12px_24px_rgba(15,15,15,0.06)] transition-all hover:-translate-y-0.5 hover:bg-[#fff9e8] hover:text-[#050505]"
                            title={t.paymentHistory}
                          >
                            <History className="h-5 w-5 shrink-0" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openPaymentModal(client)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-[0_12px_24px_rgba(16,185,129,0.12)] transition-all hover:-translate-y-0.5 hover:bg-emerald-100"
                            title={t.registerPayment}
                          >
                            <Banknote className="h-5 w-5 shrink-0" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredClients.length === 0 && (
              <div className="border-t border-[#f1ebdf] bg-[#fbfaf7] py-12 text-center font-semibold text-[#71717a]">
                {t.noDebtClients}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          if (!savingPayment) {
            setIsPaymentModalOpen(false);
            setPayingClient(null);
            setPaymentAmount('');
            setPaymentCurrency('system');
          }
        }}
        title={t.registerPayment}
      >
        {payingClient && (
          <form onSubmit={handlePaymentSubmit} className="space-y-5 overflow-x-hidden">
            <div className="rounded-[1.4rem] border border-[#e9e2d3] bg-[#fbfaf7] p-4 shadow-sm">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">
                {t.client}
              </p>
              <p className="text-xl font-black text-[#050505]">
                {payingClient.nombre}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {canManageReceivables && (
                  <div className="rounded-2xl border border-[#f1ebdf] bg-white p-3">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#71717a]">{t.creditLimit}</p>
                    <p className="font-black tabular-nums text-[#050505]">{formatMoney(payingClient.limite_credito, currencySettings)}</p>
                  </div>
                )}
                <div className="rounded-2xl border border-red-100 bg-red-50 p-3">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-700">{t.pendingBalance}</p>
                  <p className="font-black tabular-nums text-red-700">{formatMoney(payingClient.saldo, currencySettings)}</p>
                </div>
                {canManageReceivables && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">{t.available}</p>
                    <p className="font-black tabular-nums text-emerald-700">{formatMoney(getAvailableCredit(payingClient), currencySettings)}</p>
                  </div>
                )}
              </div>
            </div>

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

              <Input
                label={`${t.paymentAmount} · ${activePaymentCurrencyCode}`}
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
              />

              {paymentCurrency === 'secondary' && (
                <div className="space-y-2 rounded-2xl border border-[#e9e2d3] bg-white/80 px-4 py-3 text-sm">
                  {canUseSecondaryCurrency ? (
                    <>
                      <div className="flex items-center justify-between gap-3 text-[#71717a]"><span>{t.exchangeRate}</span><span className="font-black text-[#050505]">1 {exchangeRateSettings.secondaryCurrency} = {formatMoney(exchangeRateSettings.rate, currencySettings)}</span></div>
                      <div className="flex items-center justify-between gap-3 text-[#71717a]"><span>{t.convertedAmount}</span><span className="font-black text-[#050505]">{formatMoney(effectivePaymentAmount, currencySettings)}</span></div>
                    </>
                  ) : (
                    <p className="text-xs font-black text-red-600">{t.exchangeRateUnavailable}</p>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-[1.4rem] border border-[#f4c542]/30 bg-[#fff4c7] p-4 shadow-sm">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">
                {t.paymentSummary}
              </p>
              <div className="space-y-2 text-sm font-black text-[#8a6a16]">
                <div className="flex justify-between gap-4">
                  <span>{t.pendingBalance}</span>
                  <span className="tabular-nums">{formatMoney(payingClient.saldo, currencySettings)}</span>
                </div>
                <div className="flex justify-between gap-4 text-emerald-700">
                  <span>{t.paymentAmount}</span>
                  <span className="tabular-nums">-{formatMoney(effectivePaymentAmount, currencySettings)}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-[#f4c542]/40 pt-2 text-lg text-[#050505]">
                  <span>{t.newBalance}</span>
                  <span className="tabular-nums">{formatMoney(Math.max(0, Number(payingClient.saldo || 0) - effectivePaymentAmount), currencySettings)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={savingPayment}
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setPayingClient(null);
                  setPaymentAmount('');
                  setPaymentCurrency('system');
                }}
              >
                {t.cancel}
              </Button>
              <Button type="submit" disabled={savingPayment || effectivePaymentAmount <= 0}>
                {savingPayment ? t.confirmingPayment : t.registerPayment}
              </Button>
            </div>
          </form>
        )}
      </Modal>
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryClient(null);
          setClientPayments([]);
        }}
        title={t.paymentHistory}
      >
        {historyClient && (
          <div className="space-y-5 overflow-x-hidden">
            <div className="rounded-[1.4rem] border border-[#e9e2d3] bg-[#fbfaf7] p-4 shadow-sm">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">
                {t.client}
              </p>
              <p className="text-xl font-black text-[#050505]">
                {historyClient.nombre}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#f1ebdf] bg-white p-3">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#71717a]">{t.pendingBalance}</p>
                  <p className="font-black tabular-nums text-red-700">{formatMoney(historyClient.saldo, currencySettings)}</p>
                </div>
                {canManageReceivables && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">{t.available}</p>
                    <p className="font-black tabular-nums text-emerald-700">{formatMoney(getAvailableCredit(historyClient), currencySettings)}</p>
                  </div>
                )}
                <div className="rounded-2xl border border-[#f1ebdf] bg-white p-3">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#71717a]">{t.paymentRegistered}</p>
                  <p className="font-black tabular-nums text-[#050505]">{clientPayments.length.toLocaleString('en-US')}</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#f1ebdf] bg-[#fffdf8]">
              <table className="w-full table-fixed">
                <thead className="border-b border-[#e9e2d3] bg-[#fbfaf7]">
                  <tr>
                    <th className="w-[30%] px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-[#8a6a16]">{t.paymentDate}</th>
                    <th className="w-[34%] px-4 py-3 text-left text-xs font-black uppercase tracking-[0.14em] text-[#8a6a16]">{t.paymentTransaction}</th>
                    <th className="w-[36%] px-4 py-3 text-right text-xs font-black uppercase tracking-[0.14em] text-[#8a6a16]">{t.paymentTotal}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1ebdf]">
                  {clientPayments.map((payment) => (
                    <tr key={payment.id} className="transition-all hover:bg-[#fff9e8]">
                      <td className="px-4 py-3 font-semibold text-[#71717a]">{payment.fecha}</td>
                      <td className="px-4 py-3 font-black text-[#050505]">
                        <span className="mb-1 inline-flex rounded-full border border-[#e9e2d3] bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#71717a]">
                          {formatPaymentCode(payment.id)}
                        </span>
                        {payment.venta_id ? (
                          <span className="inline-flex rounded-full border border-[#f4c542]/30 bg-[#fff4c7] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#8a6a16]">
                            {t.purchaseTransaction} {formatSaleCode(payment.venta_id)}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
                            {t.creditPayment}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-black tabular-nums text-emerald-700">
                        {formatMoney(payment.monto, currencySettings)}
                        {payment.moneda_pago && payment.moneda_pago !== currencySettings.code && (
                          <p className="mt-1 text-[10px] font-black text-[#71717a]">
                            {payment.moneda_pago} {formatCurrency(payment.monto_original)} · {t.exchangeRate}: {formatCurrency(payment.tasa_cambio)}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {loadingPayments && (
                <div className="border-t border-[#f1ebdf] bg-[#fbfaf7] py-8 text-center font-semibold text-[#71717a]">
                  {t.loadingPayments}
                </div>
              )}

              {!loadingPayments && clientPayments.length === 0 && (
                <div className="border-t border-[#f1ebdf] bg-[#fbfaf7] py-8 text-center font-semibold text-[#71717a]">
                  {t.noPayments}
                </div>
              )}
            </div>
          </div>
        )}
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
