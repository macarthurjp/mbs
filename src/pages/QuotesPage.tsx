import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ElementType, FormEvent } from 'react';
import {
  CheckCircle2,
  FileText,
  Plus,
  Search,
  Send,
  ShoppingCart,
  Trash2,
  XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { getUserRoleFlags } from '../utils/roles';
import { logAudit } from '../utils/audit';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { formatEmail, formatPhone, normalizePhoneForLink } from '../utils/formatContact';

type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

type Cliente = {
  id: number;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
};

type Producto = {
  id: number;
  nombre: string;
  precio: number | null;
  stock: number | null;
  unidad?: string | null;
};

type Negocio = {
  id: string;
  nombre: string;
  telefono?: string | null;
  direccion?: string | null;
  moneda?: string | null;
  logo_url?: string | null;
};

type QuoteItem = {
  productId: string;
  name: string;
  quantity: string;
  price: string;
};

type Quote = {
  id: number;
  negocio_id: string | null;
  cliente_id: number | null;
  vendedor_id?: string | null;
  vendedor_nombre?: string | null;
  fecha: string;
  fecha_vencimiento?: string | null;
  subtotal: number | null;
  descuento?: number | null;
  total: number | null;
  estado: QuoteStatus | string | null;
  notas?: string | null;
  created_at?: string | null;
  clientes?: {
    nombre: string;
    telefono?: string | null;
    email?: string | null;
  } | null;
};

type QuoteDetail = {
  id: number;
  cotizacion_id: number | null;
  producto_id: number | null;
  cantidad: number | null;
  precio_unitario: number | null;
  total: number | null;
  productos?: {
    nombre: string;
    unidad?: string | null;
  } | null;
};


type CurrencySettings = {
  code: string;
  symbol: string;
};

type QuotesLanguage = 'es' | 'en';

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

const quotesCopy = {
  es: {
    loading: 'Cargando cotizaciones...',
    title: 'Cotizaciones',
    subtitle: 'Crea, envía y convierte cotizaciones en ventas',
    newQuote: 'Nueva cotización',
    refresh: 'Actualizar',
    totalQuotes: 'Total cotizaciones',
    sentQuotes: 'Enviadas',
    approvedQuotes: 'Aprobadas',
    totalQuoted: 'Total cotizado',
    searchPlaceholder: 'Buscar por cliente, número, estado o fecha...',
    history: 'Historial de cotizaciones',
    registeredQuotes: 'cotizaciones registradas',
    quote: 'Cotización',
    client: 'Cliente',
    date: 'Fecha',
    dueDate: 'Vencimiento',
    status: 'Estado',
    total: 'Total',
    actions: 'Acciones',
    viewQuote: 'Ver cotización',
    quoteDetails: 'Detalle de cotización',
    close: 'Cerrar',
    quoteItems: 'Productos cotizados',
    customerInfo: 'Información del cliente',
    quoteSummary: 'Resumen',
    loadingDetails: 'Cargando detalle...',
    noItems: 'No hay productos en esta cotización',
    searchProducts: 'Buscar productos...',
    availableStock: 'Stock disponible',
    quantityExceedsStock: 'La cantidad no puede ser mayor que el stock disponible',
    sendByEmail: 'Enviar por email',
    sendByWhatsApp: 'Enviar por WhatsApp',
    quoteMessage: 'Te compartimos la cotización',
    sendingQuote: 'Enviando cotización...',
    quoteEmailSuccess: 'Cotización enviada por email correctamente',
    quoteEmailError: 'No se pudo enviar la cotización por email',
    noClientEmail: 'Este cliente no tiene email registrado',
    pdfPrepareError: 'No se pudo preparar el PDF de la cotización',
    renderError: 'No se pudo renderizar la cotización',
    draft: 'Borrador',
    sent: 'Enviada',
    approved: 'Aprobada',
    rejected: 'Rechazada',
    expired: 'Expirada',
    noQuotes: 'No hay cotizaciones registradas',
    selectClient: 'Selecciona un cliente',
    products: 'Productos',
    product: 'Producto',
    selectProduct: 'Selecciona un producto',
    quantity: 'Cantidad',
    price: 'Precio',
    subtotal: 'Subtotal',
    discount: 'Descuento',
    notes: 'Notas',
    notesPlaceholder: 'Condiciones, tiempo de entrega, garantía, observaciones...',
    addProduct: 'Agregar producto',
    remove: 'Eliminar',
    cancel: 'Cancelar',
    saving: 'Guardando...',
    saveQuote: 'Guardar cotización',
    convertToSale: 'Convertir a venta',
    convertingToSale: 'Convirtiendo...',
    convertSuccess: 'Cotización convertida a venta correctamente',
    convertError: 'Error al convertir la cotización en venta',
    confirmConvert: '¿Deseas convertir esta cotización en una venta? Se descontará el stock de los productos.',
    sendQuote: 'Enviar',
    clientRequired: 'Selecciona un cliente',
    itemRequired: 'Agrega al menos un producto',
    quoteSaved: 'Cotización guardada correctamente',
    quoteSaveError: 'Error al guardar la cotización',
    loadError: 'Error al cargar las cotizaciones',
    noBusiness: 'No se encontró el negocio del usuario',
    missingTables: 'Si ves error al guardar, crea las tablas cotizaciones y cotizacion_detalles en Supabase.',
  },
  en: {
    loading: 'Loading quotes...',
    title: 'Quotes',
    subtitle: 'Create, send, and convert quotes into sales',
    newQuote: 'New quote',
    refresh: 'Refresh',
    totalQuotes: 'Total quotes',
    sentQuotes: 'Sent',
    approvedQuotes: 'Approved',
    totalQuoted: 'Total quoted',
    searchPlaceholder: 'Search by client, number, status, or date...',
    history: 'Quote history',
    registeredQuotes: 'registered quotes',
    quote: 'Quote',
    client: 'Client',
    date: 'Date',
    dueDate: 'Due date',
    status: 'Status',
    total: 'Total',
    actions: 'Actions',
    viewQuote: 'View quote',
    quoteDetails: 'Quote details',
    close: 'Close',
    quoteItems: 'Quoted products',
    customerInfo: 'Customer information',
    quoteSummary: 'Summary',
    loadingDetails: 'Loading details...',
    noItems: 'No products in this quote',
    searchProducts: 'Search products...',
    availableStock: 'Available stock',
    quantityExceedsStock: 'Quantity cannot be greater than available stock',
    sendByEmail: 'Send by email',
    sendByWhatsApp: 'Send by WhatsApp',
    quoteMessage: 'We are sharing the quote',
    sendingQuote: 'Sending quote...',
    quoteEmailSuccess: 'Quote sent by email successfully',
    quoteEmailError: 'Could not send the quote by email',
    noClientEmail: 'This client has no registered email',
    pdfPrepareError: 'Could not prepare the quote PDF',
    renderError: 'Could not render the quote',
    draft: 'Draft',
    sent: 'Sent',
    approved: 'Approved',
    rejected: 'Rejected',
    expired: 'Expired',
    noQuotes: 'No quotes registered',
    selectClient: 'Select a client',
    products: 'Products',
    product: 'Product',
    selectProduct: 'Select a product',
    quantity: 'Quantity',
    price: 'Price',
    subtotal: 'Subtotal',
    discount: 'Discount',
    notes: 'Notes',
    notesPlaceholder: 'Terms, delivery time, warranty, observations...',
    addProduct: 'Add product',
    remove: 'Remove',
    cancel: 'Cancel',
    saving: 'Saving...',
    saveQuote: 'Save quote',
    convertToSale: 'Convert to sale',
    convertingToSale: 'Converting...',
    convertSuccess: 'Quote converted to sale successfully',
    convertError: 'Error converting quote into sale',
    confirmConvert: 'Do you want to convert this quote into a sale? Product stock will be reduced.',
    sendQuote: 'Send',
    clientRequired: 'Select a client',
    itemRequired: 'Add at least one product',
    quoteSaved: 'Quote saved successfully',
    quoteSaveError: 'Error saving quote',
    loadError: 'Error loading quotes',
    noBusiness: 'The user business was not found',
    missingTables: 'If saving fails, create cotizaciones and cotizacion_detalles tables in Supabase.',
  }
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
    data?.simbolo;

  const symbol = String(rawSymbol || getCurrencySymbol(code)).trim() || getCurrencySymbol(code);

  return { code, symbol };
}

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getLocalDateString(date: Date) {
  return date.toLocaleDateString('en-CA');
}

function getDefaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 15);
  return getLocalDateString(date);
}

function formatQuoteCode(id: number) {
  return `COT-${String(id).padStart(6, '0')}`;
}

export default function QuotesPage() {
  const { user, userProfile } = useAuth();
  const { language } = useLanguage();
  const { showToast } = useNotification();
  const currentLanguage: QuotesLanguage = language === 'en' ? 'en' : 'es';
  const t = quotesCopy[currentLanguage];
  const roleFlags = getUserRoleFlags(userProfile);
  const isSeller = roleFlags.isSeller;
  const isAdmin = roleFlags.isAdmin;
  const isOwner = roleFlags.isOwner;
  const isSuperAdmin = roleFlags.isSuperAdmin;

  const canCreateQuote = isSeller || isAdmin || isOwner || isSuperAdmin;
  const canEditStatus = isAdmin || isOwner || isSuperAdmin;
  const canConvertQuote = isAdmin || isOwner || isSuperAdmin;
  const canViewFinancials = isAdmin || isOwner || isSuperAdmin;
  const canSendQuotes = isAdmin || isOwner || isSuperAdmin;

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

  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [products, setProducts] = useState<Producto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY);

  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedQuoteItems, setSelectedQuoteItems] = useState<QuoteDetail[]>([]);
  const [isQuoteDetailsOpen, setIsQuoteDetailsOpen] = useState(false);
  const [loadingQuoteItems, setLoadingQuoteItems] = useState(false);
  const [convertingQuote, setConvertingQuote] = useState(false);
  const [sendingQuote, setSendingQuote] = useState(false);
  const [formData, setFormData] = useState({
    cliente_id: '',
    fecha: getLocalDateString(new Date()),
    fecha_vencimiento: getDefaultDueDate(),
    descuento: '0',
    estado: 'draft' as QuoteStatus,
    notas: ''
  });

  const [items, setItems] = useState<QuoteItem[]>([
    { productId: '', name: '', quantity: '1', price: '0.00' }
  ]);

  const filteredQuotes = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return quotes.filter((quote) => {
      return (
        formatQuoteCode(quote.id).toLowerCase().includes(search) ||
        String(quote.estado || '').toLowerCase().includes(search) ||
        String(quote.fecha || '').includes(search) ||
        String(quote.clientes?.nombre || '').toLowerCase().includes(search)
      );
    });
  }, [quotes, searchTerm]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.price || 0);
    }, 0);

    const discount = Number(formData.descuento || 0);
    const total = Math.max(0, subtotal - discount);

    return { subtotal, discount, total };
  }, [items, formData.descuento]);

  const metrics = useMemo(() => {
    const sentQuotes = quotes.filter((quote) => String(quote.estado || '').toLowerCase() === 'sent').length;
    const approvedQuotes = quotes.filter((quote) => String(quote.estado || '').toLowerCase() === 'approved').length;
    const totalQuoted = quotes.reduce((sum, quote) => sum + Number(quote.total || 0), 0);

    return {
      totalQuotes: quotes.length,
      sentQuotes,
      approvedQuotes,
      totalQuoted
    };
  }, [quotes]);

  const filteredProducts = useMemo(() => {
    const search = productSearchTerm.toLowerCase().trim();

    if (!search) return products;

    return products.filter((product) => {
      return (
        product.nombre.toLowerCase().includes(search) ||
        String(product.precio || '').includes(search)
      );
    });
  }, [products, productSearchTerm]);

function money(value: number | null | undefined) {
  return `${currencySettings.symbol} ${formatNumber(value)}`;
}

  function getStatusLabel(status: QuoteStatus | string | null | undefined) {
    const normalizedStatus = String(status || 'draft').toLowerCase();

    if (normalizedStatus === 'sent') return t.sent;
    if (normalizedStatus === 'approved') return t.approved;
    if (normalizedStatus === 'rejected') return t.rejected;
    if (normalizedStatus === 'expired') return t.expired;
    return t.draft;
  }

  function getStatusClass(status: QuoteStatus | string | null | undefined) {
    const normalizedStatus = String(status || 'draft').toLowerCase();

    if (normalizedStatus === 'sent') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (normalizedStatus === 'approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (normalizedStatus === 'rejected') return 'bg-red-50 text-red-700 border-red-200';
    if (normalizedStatus === 'expired') return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    return 'bg-[#fff4c7] text-[#8a6a16] border-[#f4c542]/30';
  }

  function getProductStock(productId: string | number | null | undefined) {
    const product = products.find((item) => Number(item.id) === Number(productId));
    return Number(product?.stock || 0);
  }

  function getProductUnit(productId: string | number | null | undefined) {
    const product = products.find((item) => Number(item.id) === Number(productId));
    return product?.unidad || '';
  }

  function normalizeMoneyInput(value: string) {
    return Number(value || 0).toFixed(2);
  }

  function resetForm() {
    setFormData({
      cliente_id: '',
      fecha: getLocalDateString(new Date()),
      fecha_vencimiento: getDefaultDueDate(),
      descuento: '0',
      estado: 'draft',
      notas: ''
    });
    setItems([{ productId: '', name: '', quantity: '1', price: '0.00' }]);
    setProductSearchTerm('');
  }

  const resolveNegocioId = useCallback(async () => {
    if (userProfile?.negocio_id) return userProfile.negocio_id;
    if (negocioId) return negocioId;
    return null;
  }, [negocioId, userProfile?.negocio_id]);

  async function openQuoteDetails(quote: Quote) {
    try {
      if (isSeller && quote.vendedor_id && quote.vendedor_id !== user?.id) {
        showToast(language === 'es' ? 'No tienes permisos para ver esta cotización' : 'You do not have permission to view this quote', 'error');
        return;
      }
      setSelectedQuote(quote);
      setSelectedQuoteItems([]);
      setIsQuoteDetailsOpen(true);
      setLoadingQuoteItems(true);

      const { data, error } = await supabase
        .from('cotizacion_detalles')
        .select('id, cotizacion_id, producto_id, cantidad, precio_unitario, total')
        .eq('cotizacion_id', quote.id)
        .order('id', { ascending: true });

      if (error) throw error;

      const details = ((data || []) as QuoteDetail[]).map((detail) => {
        const product = products.find((item) => Number(item.id) === Number(detail.producto_id));

        return {
          ...detail,
          productos: product
            ? {
                nombre: product.nombre,
                unidad: product.unidad || null
              }
            : null
        };
      });

      setSelectedQuoteItems(details);
    } catch (error) {
      console.error('Error loading quote details:', error);
      showToast(t.loadError, 'error');
    } finally {
      setLoadingQuoteItems(false);
    }
  }

  async function convertQuoteToSale() {
    if (!selectedQuote || convertingQuote) return;

    if (!canConvertQuote) {
      showToast(language === 'es' ? 'No tienes permisos para convertir cotizaciones' : 'You do not have permission to convert quotes', 'error');
      return;
    }

    if (selectedQuoteItems.length === 0) {
      showToast(t.noItems, 'error');
      return;
    }

    const confirmed = window.confirm(t.confirmConvert);

    if (!confirmed) return;

    const currentNegocioId = await resolveNegocioId();

    if (!currentNegocioId) {
      showToast(t.noBusiness, 'error');
      return;
    }

    try {
      setConvertingQuote(true);

      const saleTotal = Number(selectedQuote.total || 0);

      const { data: saleId, error: convertError } = await supabase.rpc('convert_quote_to_sale', {
        p_quote_id: selectedQuote.id,
        p_negocio_id: currentNegocioId
      });

      if (convertError) throw convertError;

      if (!saleId) {
        throw new Error('Sale id was not returned');
      }

      if (user?.id) {
        await logAudit({
          negocio_id: currentNegocioId,
          user_id: user.id,
          user_name: loggedUserName,
          user_email: loggedUserEmail || undefined,
          user_role: loggedUserRole || undefined,
          action: 'CONVERT_QUOTE_TO_SALE',
          module: 'QUOTES',
          record_id: selectedQuote.id,
          description: `Cotización ${formatQuoteCode(selectedQuote.id)} convertida a venta por ${loggedUserName}`,
          new_data: {
            cotizacion_id: selectedQuote.id,
            venta_id: saleId,
            cliente_id: selectedQuote.cliente_id,
            vendedor_id: user?.id || null,
            vendedor_nombre: loggedUserName,
            total: saleTotal,
            estado_anterior: selectedQuote.estado,
            estado_nuevo: 'approved',
            productos: selectedQuoteItems.map((item) => ({
              producto_id: item.producto_id,
              nombre: item.productos?.nombre || null,
              cantidad: item.cantidad,
              precio_unitario: item.precio_unitario,
              total: item.total
            }))
          }
        });
      }

      showToast(t.convertSuccess, 'success');
      setIsQuoteDetailsOpen(false);
      setSelectedQuote(null);
      setSelectedQuoteItems([]);
      await loadData();
    } catch (error) {
      console.error('Error converting quote to sale:', error);
      const message = error instanceof Error ? error.message : t.convertError;
      showToast(`${t.convertError}. ${message}`, 'error');
    } finally {
      setConvertingQuote(false);
    }
  }

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        setQuotes([]);
        setClients([]);
        setProducts([]);
        return;
      }

      const currentNegocioId = await resolveNegocioId();
      setNegocioId(currentNegocioId);

      if (!currentNegocioId) {
        setQuotes([]);
        setClients([]);
        setProducts([]);
        showToast(t.noBusiness, 'error');
        return;
      }

      const [quotesResult, clientsResult, productsResult, businessResult] = await Promise.all([
        (() => {
          let quotesQuery = supabase
            .from('cotizaciones')
            .select('id, negocio_id, cliente_id, vendedor_id, vendedor_nombre, fecha, fecha_vencimiento, subtotal, descuento, total, estado, created_at')
            .eq('negocio_id', currentNegocioId);

          if (isSeller && user?.id) {
            quotesQuery = quotesQuery.eq('vendedor_id', user.id);
          }

          return quotesQuery.order('created_at', { ascending: false });
        })(),
        supabase
          .from('clientes')
          .select('id, nombre, telefono, email')
          .eq('negocio_id', currentNegocioId)
          .order('nombre', { ascending: true }),
        supabase
          .from('productos')
          .select('id, nombre, precio, stock, unidad')
          .eq('negocio_id', currentNegocioId)
          .order('nombre', { ascending: true }),
        supabase
          .from('negocios')
          .select('*')
          .eq('id', currentNegocioId)
          .maybeSingle()
      ]);

      if (quotesResult.error) throw quotesResult.error;
      if (clientsResult.error) throw clientsResult.error;
      if (productsResult.error) throw productsResult.error;
      if (businessResult.error) throw businessResult.error;

      const loadedClients = (clientsResult.data || []) as Cliente[];
      const loadedQuotes = ((quotesResult.data || []) as Quote[]).map((quote) => {
        const matchedClient = loadedClients.find((client) => Number(client.id) === Number(quote.cliente_id));

        return {
          ...quote,
          clientes: matchedClient
            ? {
                nombre: matchedClient.nombre,
                telefono: matchedClient.telefono || null,
                email: matchedClient.email || null
              }
            : null
        };
      });

      setQuotes(loadedQuotes);
      setClients(loadedClients);
      setProducts((productsResult.data || []) as Producto[]);
      setNegocio((businessResult.data || null) as Negocio | null);
      setCurrencySettings(normalizeCurrencySettings(businessResult.data));
    } catch (error) {
      console.error('Error loading quotes:', error);
      showToast(t.loadError, 'error');
    } finally {
      setLoading(false);
    }
  }, [isSeller, resolveNegocioId, showToast, t.loadError, t.noBusiness, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData, roleFlags.role]);

  function handleProductChange(index: number, productId: string) {
    const product = products.find((item) => String(item.id) === productId);

    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              productId,
              name: product?.nombre || '',
              price: product?.precio != null ? Number(product.precio).toFixed(2) : item.price
            }
          : item
      )
    );
  }

  function updateItem(index: number, field: keyof QuoteItem, value: string) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        if (field === 'quantity' && item.productId) {
          const stock = getProductStock(item.productId);
          const quantity = Number(value || 0);

          if (quantity > stock) {
            showToast(t.quantityExceedsStock, 'error');
            return { ...item, quantity: String(stock) };
          }
        }

        return { ...item, [field]: value };
      })
    );
  }

  function addItem() {
    setItems((current) => [...current, { productId: '', name: '', quantity: '1', price: '0.00' }]);
  }

  function removeItem(index: number) {
    setItems((current) => current.length <= 1 ? current : current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function generateQuotePdfBase64() {
    if (!selectedQuote) {
      throw new Error(t.pdfPrepareError);
    }

    const html = buildQuoteHtml(selectedQuote, selectedQuoteItems, negocio, currencySettings, t);
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const styleContent = parsed.querySelector('style')?.textContent || '';
    const quoteElement = parsed.querySelector('.quote-document');

    if (!quoteElement) {
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
    wrapper.appendChild(quoteElement.cloneNode(true));
    document.body.appendChild(wrapper);

    try {
      const target = wrapper.querySelector('.quote-document') as HTMLElement | null;

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

  async function markQuoteAsSent() {
    if (!selectedQuote) return;

    const currentNegocioId = await resolveNegocioId();

    if (!currentNegocioId) return;

    const { error } = await supabase
      .from('cotizaciones')
      .update({ estado: 'sent' })
      .eq('id', selectedQuote.id)
      .eq('negocio_id', currentNegocioId);

    if (error) throw error;

    setSelectedQuote({ ...selectedQuote, estado: 'sent' });
    await loadData();
  }

  async function sendQuote(channel: 'email' | 'whatsapp') {
    if (!selectedQuote || sendingQuote) return;

    if (isSeller) {
      showToast(language === 'es' ? 'No tienes permisos para enviar cotizaciones' : 'You do not have permission to send quotes', 'error');
      return;
    }

    const quoteCode = formatQuoteCode(selectedQuote.id);
    const clientName = selectedQuote.clientes?.nombre || t.client;
    const message = `${t.quoteMessage} ${quoteCode}\n${t.client}: ${clientName}\n${t.date}: ${selectedQuote.fecha}\n${t.dueDate}: ${selectedQuote.fecha_vencimiento || '-'}\n${t.total}: ${money(selectedQuote.total)}`;

    if (channel === 'whatsapp') {
      const phone = normalizePhoneForLink(selectedQuote.clientes?.telefono);
      const whatsappUrl = phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;

      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

      const currentNegocioId = await resolveNegocioId();
      if (currentNegocioId && user?.id) {
        await logAudit({
          negocio_id: currentNegocioId,
          user_id: user.id,
          user_name: loggedUserName,
          user_email: loggedUserEmail || undefined,
          user_role: loggedUserRole || undefined,
          action: 'SEND_QUOTE_WHATSAPP',
          module: 'QUOTES',
          record_id: selectedQuote.id,
          description: `Cotización ${quoteCode} enviada por WhatsApp por ${loggedUserName}`,
          new_data: {
            cotizacion_id: selectedQuote.id,
            cliente: clientName,
            telefono: selectedQuote.clientes?.telefono || null,
            total: selectedQuote.total,
            estado: selectedQuote.estado
          }
        });
      }

      return;
    }

    const email = selectedQuote.clientes?.email?.trim();

    if (!email) {
      showToast(t.noClientEmail, 'error');
      return;
    }

    try {
      setSendingQuote(true);
      showToast(t.sendingQuote, 'success');

      const pdfBase64 = await generateQuotePdfBase64();

      const { data, error } = await supabase.functions.invoke('send-quote', {
        body: {
          quote: selectedQuote,
          items: selectedQuoteItems,
          negocio,
          clienteEmail: email,
          pdfBase64,
          quoteNumber: quoteCode,
          currency: currencySettings
        }
      });

      if (error) {
        console.error('Supabase quote function error:', error);
        throw new Error(error.message || t.quoteEmailError);
      }

      if (data?.success === false) {
        console.error('send-quote response:', data);
        throw new Error(data?.error || t.quoteEmailError);
      }

      await markQuoteAsSent();
      showToast(t.quoteEmailSuccess, 'success');

      const currentNegocioId = await resolveNegocioId();
      if (currentNegocioId && user?.id) {
        await logAudit({
          negocio_id: currentNegocioId,
          user_id: user.id,
          user_name: loggedUserName,
          user_email: loggedUserEmail || undefined,
          user_role: loggedUserRole || undefined,
          action: 'SEND_QUOTE_EMAIL',
          module: 'QUOTES',
          record_id: selectedQuote.id,
          description: `Cotización ${quoteCode} enviada por email por ${loggedUserName}`,
          new_data: {
            cotizacion_id: selectedQuote.id,
            cliente: clientName,
            email,
            total: selectedQuote.total,
            estado_anterior: selectedQuote.estado,
            estado_nuevo: 'sent'
          }
        });
      }
    } catch (error) {
      console.error('Error sending quote by email:', error);
      const messageError = error instanceof Error ? error.message : t.quoteEmailError;
      showToast(`${t.quoteEmailError}. ${messageError}`, 'error');
    } finally {
      setSendingQuote(false);
    }
  }
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!formData.cliente_id) {
      showToast(t.clientRequired, 'error');
      return;
    }

    const validItems = items.filter((item) => item.productId && Number(item.quantity || 0) > 0);
    const hasStockError = validItems.some((item) => Number(item.quantity || 0) > getProductStock(item.productId));

    if (hasStockError) {
      showToast(t.quantityExceedsStock, 'error');
      return;
    }
    if (validItems.length === 0) {
      showToast(t.itemRequired, 'error');
      return;
    }

    const currentNegocioId = await resolveNegocioId();

    if (!currentNegocioId) {
      showToast(t.noBusiness, 'error');
      return;
    }

    try {
      setSaving(true);

      const { data: quoteData, error: quoteError } = await supabase
        .from('cotizaciones')
        .insert([
          {
            negocio_id: currentNegocioId,
            cliente_id: Number(formData.cliente_id),
            vendedor_id: user?.id || null,
            vendedor_nombre:
              userProfile?.nombre ||
              userProfile?.full_name ||
              userProfile?.name ||
              user?.email ||
              'Usuario',
            fecha: formData.fecha,
            fecha_vencimiento: formData.fecha_vencimiento || null,
            subtotal: totals.subtotal,
            descuento: totals.discount,
            total: totals.total,
            estado: isSeller ? 'draft' : formData.estado
          }
        ])
        .select('id')
        .single();

      if (quoteError) throw quoteError;

      const quoteId = quoteData?.id;

      if (!quoteId) {
        throw new Error('Quote id was not returned');
      }

      const quoteItems = validItems.map((item) => ({
        cotizacion_id: quoteId,
        producto_id: Number(item.productId),
        cantidad: Number(item.quantity || 0),
        precio_unitario: Number(item.price || 0),
        total: Number(item.quantity || 0) * Number(item.price || 0)
      }));

      const { error: itemsError } = await supabase
        .from('cotizacion_detalles')
        .insert(quoteItems);

      if (itemsError) throw itemsError;

      if (user?.id) {
        await logAudit({
          negocio_id: currentNegocioId,
          user_id: user.id,
          user_name: loggedUserName,
          user_email: loggedUserEmail || undefined,
          user_role: loggedUserRole || undefined,
          action: 'CREATE_QUOTE',
          module: 'QUOTES',
          record_id: quoteId,
          description: `Cotización ${formatQuoteCode(quoteId)} creada por ${loggedUserName}`,
          new_data: {
            cotizacion_id: quoteId,
            cliente_id: Number(formData.cliente_id),
            vendedor_id: user.id,
            vendedor_nombre: loggedUserName,
            fecha: formData.fecha,
            fecha_vencimiento: formData.fecha_vencimiento || null,
            subtotal: totals.subtotal,
            descuento: totals.discount,
            total: totals.total,
            estado: isSeller ? 'draft' : formData.estado,
            productos: validItems.map((item) => ({
              producto_id: Number(item.productId),
              nombre: item.name,
              cantidad: Number(item.quantity || 0),
              precio_unitario: Number(item.price || 0),
              total: Number(item.quantity || 0) * Number(item.price || 0)
            }))
          }
        });
      }

      showToast(t.quoteSaved, 'success');
      setIsModalOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error saving quote:', error);
      const message = error instanceof Error ? error.message : t.missingTables;
      showToast(`${t.quoteSaveError}. ${message}`, 'error');
    } finally {
      setSaving(false);
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

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden text-[#08080b] sm:space-y-8">
      <section className="relative min-w-0 overflow-hidden rounded-[2rem] border border-[#e9e2d3]/80 bg-[#fffdf8]/85 p-5 shadow-[0_24px_70px_rgba(15,15,15,0.07)] backdrop-blur-2xl sm:p-7 xl:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,197,66,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.88),transparent_42%)]" />
        <div className="relative z-10 flex min-w-0 flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#eadfca] bg-white/75 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6a16] shadow-sm backdrop-blur-xl">
              <FileText size={14} />
              MatMax Business Suite
            </div>
            <h1 className="mb-3 text-4xl font-black tracking-tight text-[#050505] sm:text-5xl xl:text-[4rem]">
              {t.title}
            </h1>
            <p className="max-w-3xl text-sm font-bold uppercase tracking-[0.18em] text-[#71717a] sm:text-base">
              {t.subtitle}
            </p>
          </div>

          {canCreateQuote && (
            <Button
              type="button"
              className="w-full rounded-2xl px-5 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.18)] sm:w-auto"
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
            >
              <Plus className="shrink-0" size={20} />
              {t.newQuote}
            </Button>
          )}
        </div>
      </section>

      <div className={`grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 ${isSeller ? 'xl:grid-cols-2' : 'xl:grid-cols-[0.9fr_0.9fr_0.9fr_1.55fr]'}`}>
        <QuoteMetricCard title={t.totalQuotes} value={metrics.totalQuotes.toLocaleString('en-US')} icon={FileText} iconClass="bg-[#050505] text-[#f4c542]" />
        <QuoteMetricCard title={t.sentQuotes} value={metrics.sentQuotes.toLocaleString('en-US')} icon={Send} iconClass="bg-blue-50 text-blue-700" />
        {canViewFinancials && (
          <QuoteMetricCard title={t.approvedQuotes} value={metrics.approvedQuotes.toLocaleString('en-US')} icon={CheckCircle2} iconClass="bg-emerald-50 text-emerald-700" />
        )}
        {canViewFinancials && (
          <QuoteMetricCard title={t.totalQuoted} value={money(metrics.totalQuoted)} icon={ShoppingCart} iconClass="bg-[#fff4c7] text-[#8a6a16]" />
        )}
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

      <Card>
        <CardHeader>
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-serif font-bold text-[#050505] sm:text-2xl">{t.history}</h2>
              <p className="mt-1 text-sm font-semibold text-[#71717a]">{filteredQuotes.length.toLocaleString('en-US')} {t.registeredQuotes}</p>
            </div>
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={loadData}>
              {t.refresh}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="hidden overflow-hidden rounded-2xl border border-[#f1ebdf] bg-[#fffdf8] lg:block">
            <table className="w-full table-fixed text-sm">
              <thead className="border-b border-[#e9e2d3] bg-[#fbfaf7]">
                <tr>
                  <th className="w-[15%] px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.quote}</th>
                  <th className="w-[22%] px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.client}</th>
                  <th className="w-[13%] px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.date}</th>
                  <th className="w-[13%] px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.dueDate}</th>
                  <th className="w-[13%] px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.status}</th>
                  <th className="w-[12%] px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">Vendedor</th>
                  <th className="w-[14%] px-4 py-3 text-right text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.total}</th>
                  <th className="w-[10%] px-4 py-3 text-right text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1ebdf]">
                {filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="transition hover:bg-[#fff9e8]">
                    <td className="px-4 py-3 font-black text-[#050505]">{formatQuoteCode(quote.id)}</td>
                    <td className="truncate px-4 py-3 font-semibold text-[#71717a]">{quote.clientes?.nombre || t.client}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#71717a]">{quote.fecha}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#71717a]">{quote.fecha_vencimiento || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.08em] ${getStatusClass(quote.estado)}`}>
                        {getStatusLabel(quote.estado)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#71717a]">
                      {quote.vendedor_nombre || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-black tabular-nums text-[#8a6a16]">{money(quote.total)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        title={t.viewQuote}
                        aria-label={t.viewQuote}
                        onClick={() => openQuoteDetails(quote)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542] shadow-[0_12px_24px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-[#111111]"
                      >
                        <FileText size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {filteredQuotes.map((quote) => (
              <div key={quote.id} className="rounded-[1.5rem] border border-[#e9e2d3] bg-white p-4 shadow-[0_14px_34px_rgba(15,15,15,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.quote}</p>
                    <p className="mt-1 text-lg font-black text-[#050505]">{formatQuoteCode(quote.id)}</p>
                    <p className="mt-1 text-sm font-semibold text-[#71717a]">{quote.clientes?.nombre || t.client}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.08em] ${getStatusClass(quote.estado)}`}>
                    {getStatusLabel(quote.estado)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-[#f1ebdf] bg-[#fffdf8] p-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6a16]">{t.date}</p>
                    <p className="mt-1 text-sm font-semibold text-[#71717a]">{quote.fecha}</p>
                    <p className="mt-1 text-xs text-[#a1a1aa]">{t.dueDate}: {quote.fecha_vencimiento || '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6a16]">{t.total}</p>
                    <p className="mt-1 text-base font-black text-[#8a6a16]">{money(quote.total)}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  className="mt-4 w-full justify-center"
                  onClick={() => openQuoteDetails(quote)}
                >
                  <FileText size={16} />
                  {t.viewQuote}
                </Button>
              </div>
            ))}
          </div>

          {filteredQuotes.length === 0 && (
            <div className="rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] py-12 text-center font-semibold text-[#71717a]">
              {t.noQuotes}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={t.newQuote}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label={t.client}
              value={formData.cliente_id}
              onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
              required
            >
              <option value="">{t.selectClient}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.nombre}</option>
              ))}
            </Select>

            {canEditStatus && (
              <Select
                label={t.status}
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value as QuoteStatus })}
              >
                <option value="draft">{t.draft}</option>
                <option value="sent">{t.sent}</option>
                <option value="approved">{t.approved}</option>
                <option value="rejected">{t.rejected}</option>
                <option value="expired">{t.expired}</option>
              </Select>
            )}

            <Input
              label={t.date}
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              required
            />

            <Input
              label={t.dueDate}
              type="date"
              value={formData.fecha_vencimiento}
              onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
            />
          </div>

          <div className="rounded-[1.5rem] border border-[#e9e2d3] bg-[#fffdf8] p-4">
            <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <h3 className="text-lg font-black text-[#050505]">{t.products}</h3>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative min-w-0 sm:w-72">
                  <Search className="absolute left-3 top-1/2 shrink-0 -translate-y-1/2 text-[#a1a1aa]" size={18} />
                  <Input
                    type="text"
                    placeholder={t.searchProducts}
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="button" variant="secondary" onClick={addItem}>
                  <Plus size={16} />
                  {t.addProduct}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={`${index}-${item.productId}`} className="grid grid-cols-1 gap-3 rounded-2xl border border-[#f1ebdf] bg-white p-3 xl:grid-cols-[minmax(0,1fr)_120px_150px_auto] xl:items-end">
                  <Select
                    label={t.product}
                    value={item.productId}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                  >
                    <option value="">{t.selectProduct}</option>
                    {filteredProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.nombre} · {t.availableStock}: {Number(product.stock || 0).toLocaleString('en-US')} {product.unidad || ''} · {money(product.precio)}
                      </option>
                    ))}
                  </Select>



                  <Input
                    label={t.quantity}
                    type="number"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    max={item.productId ? getProductStock(item.productId) : undefined}
                  />

                  <Input
                    label={t.price}
                    type="number"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => updateItem(index, 'price', e.target.value)}
                    onBlur={(e) => updateItem(index, 'price', normalizeMoneyInput(e.target.value))}
                  />

                  <div className="rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] px-3 py-2 text-xs font-black text-[#71717a] xl:hidden">
                    {t.availableStock}: {item.productId ? `${getProductStock(item.productId).toLocaleString('en-US')} ${getProductUnit(item.productId)}` : '-'}
                  </div>

                  <Button type="button" variant="secondary" className="border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" onClick={() => removeItem(index)} disabled={items.length <= 1}>
                    <Trash2 size={16} />
                    {t.remove}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {canViewFinancials && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={t.discount}
                type="number"
                step="0.01"
                value={formData.descuento}
                onChange={(e) => setFormData({ ...formData, descuento: e.target.value })}
              />
            </div>
          )}

          <div className="rounded-2xl border border-[#f4c542]/30 bg-[#fff4c7] p-4">
            <div className="space-y-2 text-sm font-black text-[#8a6a16]">
              <div className="flex justify-between gap-4"><span>{t.subtotal}</span><span>{money(totals.subtotal)}</span></div>
              {canViewFinancials && (
                <div className="flex justify-between gap-4 text-red-700"><span>{t.discount}</span><span>-{money(totals.discount)}</span></div>
              )}
              <div className="flex justify-between gap-4 border-t border-[#f4c542]/40 pt-2 text-xl"><span>{t.total}</span><span>{money(totals.total)}</span></div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" disabled={saving} onClick={() => { setIsModalOpen(false); resetForm(); }}>
              <XCircle size={18} />
              {t.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              <FileText size={18} />
              {saving ? t.saving : t.saveQuote}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={isQuoteDetailsOpen}
        onClose={() => {
          setIsQuoteDetailsOpen(false);
          setSelectedQuote(null);
          setSelectedQuoteItems([]);
        }}
        title={selectedQuote ? `${t.quote} ${formatQuoteCode(selectedQuote.id)}` : t.quoteDetails}
      >
        {selectedQuote && (
          <div className="space-y-5">
            <div className="rounded-[1.5rem] border border-[#e9e2d3] bg-[#fffdf8] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">
                    {t.quoteDetails}
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-[#050505]">
                    {formatQuoteCode(selectedQuote.id)}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-[#71717a]">
                    {t.date}: {selectedQuote.fecha} · {t.dueDate}: {selectedQuote.fecha_vencimiento || '-'}
                  </p>
                </div>

                <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.08em] ${getStatusClass(selectedQuote.estado)}`}>
                  {getStatusLabel(selectedQuote.estado)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[#e9e2d3] bg-white p-4">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">
                  {t.customerInfo}
                </p>
                <p className="text-lg font-black text-[#050505]">
                  {selectedQuote.clientes?.nombre || t.client}
                </p>
                {selectedQuote.clientes?.telefono && (
                  <p className="mt-1 text-sm font-semibold text-[#71717a]">
                    {formatPhone(selectedQuote.clientes.telefono)}
                  </p>
                )}
                {selectedQuote.clientes?.email && (
                  <p className="mt-1 text-sm font-semibold text-[#71717a]">
                    {formatEmail(selectedQuote.clientes.email)}
                  </p>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-[#f4c542]/30 bg-[#fff4c7] p-4">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">
                  {t.quoteSummary}
                </p>
                <div className="space-y-2 text-sm font-black text-[#8a6a16]">
                  <div className="flex justify-between gap-4">
                    <span>{t.subtotal}</span>
                    <span>{money(selectedQuote.subtotal)}</span>
                  </div>
                  {canViewFinancials && (
                    <div className="flex justify-between gap-4 text-red-700">
                      <span>{t.discount}</span>
                      <span>-{money(selectedQuote.descuento || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4 border-t border-[#f4c542]/40 pt-2 text-xl">
                    <span>{t.total}</span>
                    <span>{money(selectedQuote.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[#e9e2d3] bg-white p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-black text-[#050505]">
                  {t.quoteItems}
                </h3>
              </div>

              {loadingQuoteItems ? (
                <div className="rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] py-10 text-center font-semibold text-[#71717a]">
                  {t.loadingDetails}
                </div>
              ) : selectedQuoteItems.length === 0 ? (
                <div className="rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] py-10 text-center font-semibold text-[#71717a]">
                  {t.noItems}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#f1ebdf] bg-[#fffdf8]">
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
                      {selectedQuoteItems.map((item) => (
                        <tr key={item.id}>
                          <td className="max-w-[280px] truncate px-4 py-3 font-black text-[#050505]">
                            {item.productos?.nombre || t.product}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#71717a]">
                            {Number(item.cantidad || 0).toLocaleString('en-US')} {item.productos?.unidad || ''}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-[#71717a]">
                            {money(item.precio_unitario)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-black tabular-nums text-[#8a6a16]">
                            {money(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              {canSendQuotes && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={convertingQuote || sendingQuote || loadingQuoteItems || selectedQuoteItems.length === 0}
                  onClick={() => sendQuote('email')}
                >
                  <Send size={18} />
                  {sendingQuote ? t.sendingQuote : t.sendByEmail}
                </Button>
              )}

              {canSendQuotes && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={convertingQuote || sendingQuote}
                  onClick={() => sendQuote('whatsapp')}
                >
                  <Send size={18} />
                  {t.sendByWhatsApp}
                </Button>
              )}

              <Button
                type="button"
                variant="secondary"
                disabled={convertingQuote || sendingQuote}
                onClick={() => {
                  setIsQuoteDetailsOpen(false);
                  setSelectedQuote(null);
                  setSelectedQuoteItems([]);
                }}
              >
                <XCircle size={18} />
                {t.close}
              </Button>

              {canConvertQuote && String(selectedQuote.estado || '').toLowerCase() !== 'approved' && (
                <Button
                  type="button"
                  disabled={convertingQuote || sendingQuote || loadingQuoteItems || selectedQuoteItems.length === 0}
                  onClick={convertQuoteToSale}
                >
                  <ShoppingCart size={18} />
                  {convertingQuote ? t.convertingToSale : t.convertToSale}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function QuoteMetricCard({
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
    <div className="group relative flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-[1.75rem] border border-[#e9e2d3]/85 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,15,15,0.055)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#f4c542]/35 hover:bg-white hover:shadow-[0_28px_70px_rgba(15,15,15,0.09)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.09),transparent_38%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10 min-w-0 flex-1 overflow-visible pr-2">
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#8a6a16] sm:text-[11px]">
          {title}
        </p>
        <p className="max-w-full whitespace-nowrap text-[1.55rem] font-black leading-[0.95] tracking-tight tabular-nums text-[#050505] sm:text-[1.8rem] xl:text-[1.95rem] 2xl:text-[2.15rem]">
          {value}
        </p>
      </div>
      <div className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.05rem] shadow-[0_18px_40px_rgba(15,15,15,0.12)] transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 sm:h-13 sm:w-13 ${iconClass}`}>
        <Icon className="h-5 w-5 shrink-0" />
      </div>
    </div>
  );
}

function buildQuoteHtml(
  quote: Quote,
  items: QuoteDetail[],
  negocio: Negocio | null,
  currencySettings: CurrencySettings,
  t: (typeof quotesCopy)['es' | 'en']
) {
  const quoteNumber = formatQuoteCode(quote.id);
  const currencySymbol = currencySettings.symbol;
  const rows = items.map((item) => `
    <tr>
      <td class="product-name">${escapeHtml(item.productos?.nombre || t.product)}</td>
      <td class="text-right">${Number(item.cantidad || 0).toLocaleString('en-US')} ${escapeHtml(item.productos?.unidad || '')}</td>
      <td class="text-right">${currencySymbol} ${formatNumber(item.precio_unitario)}</td>
      <td class="text-right strong">${currencySymbol} ${formatNumber(item.total)}</td>
    </tr>
  `).join('');

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=900, initial-scale=1" />
  <title>${escapeHtml(t.quote)} ${quoteNumber}</title>
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
    .quote-document {
      width: 820px;
      max-width: none;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e9e2d3;
      border-radius: 28px;
      overflow: hidden;
      box-shadow: 0 24px 70px rgba(15,15,15,0.08);
    }
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
    h1 { margin: 0; font-size: 30px; line-height: 1.05; }
    .subtitle { margin: 6px 0 0; color: rgba(255,255,255,0.72); font-size: 14px; }
    .quote-meta { text-align: right; }
    .quote-meta .label { margin: 0; color: rgba(255,255,255,0.62); font-size: 13px; }
    .quote-meta .number { margin: 4px 0 0; font-size: 26px; font-weight: 900; color: #f4c542; }
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
      width: 320px;
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
      color: #8a6a16;
      font-size: 15px;
      font-weight: 900;
      margin-bottom: 8px;
    }
    .summary-row.total {
      border-top: 1px solid rgba(138,106,22,0.25);
      padding-top: 12px;
      margin-bottom: 0;
      font-size: 22px;
    }
    .footer {
      margin-top: 32px;
      text-align: center;
      color: #71717a;
      font-size: 13px;
    }
    @media print {
      @page { size: A4 portrait; margin: 10mm; }
      html, body { width: 900px; min-width: 900px; background: #ffffff; padding: 0; }
      .quote-document { width: 820px; max-width: none; box-shadow: none; border-radius: 0; border: 0; }
      .topbar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .box, .summary, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <main class="quote-document">
    <section class="topbar">
      <div class="brand-row">
        <div>
          <div class="brand">
            ${negocio?.logo_url ? `<img class="logo" src="${escapeHtml(negocio.logo_url)}" alt="${escapeHtml(negocio.nombre || 'Logo')}" />` : `<div class="logo-placeholder">${escapeHtml((negocio?.nombre || 'M').slice(0, 1).toUpperCase())}</div>`}
            <div>
              <h1>${escapeHtml(negocio?.nombre || 'MatMax')}</h1>
              <p class="subtitle">${escapeHtml(t.quote)}</p>
            </div>
          </div>
          <div class="business-details">
            ${negocio?.telefono ? `<div>${escapeHtml(formatPhone(negocio.telefono))}</div>` : ''}
            ${negocio?.direccion ? `<div>${escapeHtml(negocio.direccion)}</div>` : ''}
          </div>
        </div>
        <div class="quote-meta">
          <p class="label">${escapeHtml(t.quote)}</p>
          <p class="number">${quoteNumber}</p>
          <p class="subtitle">${escapeHtml(t.date)}: ${escapeHtml(quote.fecha)}</p>
          <p class="subtitle">${escapeHtml(t.dueDate)}: ${escapeHtml(quote.fecha_vencimiento || '-')}</p>
        </div>
      </div>
    </section>

    <section class="content">
      <div class="cards">
        <div class="box">
          <p class="box-title">${escapeHtml(t.client)}</p>
          <p class="box-main">${escapeHtml(quote.clientes?.nombre || t.client)}</p>
          ${quote.clientes?.telefono ? `<p class="box-text">${escapeHtml(formatPhone(quote.clientes.telefono))}</p>` : ''}
          ${quote.clientes?.email ? `<p class="box-text">${escapeHtml(formatEmail(quote.clientes.email))}</p>` : ''}
        </div>
        <div class="box">
          <p class="box-title">${escapeHtml(t.status)}</p>
          <p class="box-main">${escapeHtml(String(quote.estado || 'draft'))}</p>
          <p class="box-text">${escapeHtml(t.total)}: ${currencySymbol} ${formatNumber(quote.total)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>${escapeHtml(t.product)}</th>
            <th class="text-right">${escapeHtml(t.quantity)}</th>
            <th class="text-right">${escapeHtml(t.price)}</th>
            <th class="text-right">${escapeHtml(t.total)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="summary">
        <div class="summary-row"><span>${escapeHtml(t.subtotal)}</span><span>${currencySymbol} ${formatNumber(quote.subtotal)}</span></div>
        <div class="summary-row"><span>${escapeHtml(t.discount)}</span><span>- ${currencySymbol} ${formatNumber(quote.descuento || 0)}</span></div>
        <div class="summary-row total"><span>${escapeHtml(t.total)}</span><span>${currencySymbol} ${formatNumber(quote.total)}</span></div>
      </div>

      <div class="footer">${escapeHtml(t.quoteMessage)} ${quoteNumber}</div>
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
