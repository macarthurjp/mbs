import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shield, Search, RefreshCw, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { getUserRoleFlags } from '../utils/roles';
import { formatEmail } from '../utils/formatContact';

type AuditLog = {
  id: number;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
  module: string | null;
  action: string | null;
  description: string | null;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
};

const auditCopy = {
  es: {
    badge: 'Auditoría',
    title: 'Registros de auditoría',
    description: 'Historial completo de acciones realizadas en el sistema.',
    refresh: 'Actualizar',
    searchPlaceholder: 'Buscar usuario, módulo, acción...',
    accessDenied: 'Acceso denegado',
    empty: 'No hay registros de auditoría.',
    date: 'Fecha',
    user: 'Usuario',
    email: 'Email',
    role: 'Rol',
    module: 'Módulo',
    action: 'Acción',
    descriptionColumn: 'Descripción',
    view: 'Ver',
    details: 'Detalles de auditoría',
    close: 'Cerrar',
    logId: 'ID del registro',
    recordId: 'ID del registro afectado',
    oldData: 'Datos anteriores',
    newData: 'Datos nuevos',
    noData: 'Sin datos',
    detailsUnavailable: 'No hay detalles para mostrar',
    actions: {
      UPDATE_USER: 'Usuario actualizado',
      CHANGE_ROLE: 'Rol actualizado',
      CREATE_USER: 'Usuario creado',
      DELETE_USER: 'Usuario eliminado',
      UPDATE_BUSINESS_SETTINGS: 'Configuración del negocio actualizada',
      UPDATE_PROFILE_NAME: 'Perfil actualizado',
      RESET_ALL_STOCK: 'Inventario reiniciado',
      DELETE_PRODUCT: 'Producto eliminado',
      MASS_UPDATE_PRICES: 'Precios actualizados',
      CREATE_SALE: 'Venta creada',
      SALE_WITH_DISCOUNT: 'Venta con descuento',
      HIGH_DISCOUNT_SALE: 'Venta con descuento alto',
      CANCEL_SALE: 'Venta anulada',
      CREATE_PURCHASE: 'Compra creada',
      UPDATE_PURCHASE: 'Compra actualizada',
      DELETE_PURCHASE: 'Compra eliminada',
      PROCESS_PARTIAL_SALE_RETURN: 'Devolución parcial procesada',
      UPDATE_PRODUCT_COST: 'Costo de producto actualizado',
      UPDATE_PRODUCT: 'Producto actualizado',
      UPDATE_PRODUCT_PRICE: 'Precio de producto actualizado',
      CREATE_PRODUCT: 'Producto creado',
      ADD_PRODUCT_STOCK: 'Stock añadido',
      UPDATE_SALES_PERMISSIONS: 'Permisos de ventas actualizados',
      UPDATE_PROFILE: 'Perfil actualizado',
      EXPORT_BUSINESS_BACKUP: 'Copia de seguridad exportada',
      CONVERT_QUOTE_TO_SALE: 'Cotización convertida en venta',
      SEND_QUOTE_WHATSAPP: 'Cotización enviada por WhatsApp',
      SEND_QUOTE_EMAIL: 'Cotización enviada por email',
      CREATE_QUOTE: 'Cotización creada',
      TRANSFORM_INVENTORY: 'Inventario transformado',
      COMPLETE_PURCHASE_COST: 'Costo de compra completado',
      VIEW_CASHBOX: 'Caja consultada'
    },
    modules: {
      USERS: 'Usuarios',
      SETTINGS: 'Configuración',
      PRODUCTS: 'Productos',
      SALES: 'Ventas',
      PURCHASES: 'Compras',
      CASHBOX: 'Caja',
      QUOTES: 'Cotizaciones',
      INVOICES: 'Facturas'
    }
  },
  en: {
    badge: 'Audit',
    title: 'Audit Logs',
    description: 'Complete history of actions performed in the system.',
    refresh: 'Refresh',
    searchPlaceholder: 'Search user, module, action...',
    accessDenied: 'Access denied',
    empty: 'No audit logs found.',
    date: 'Date',
    user: 'User',
    email: 'Email',
    role: 'Role',
    module: 'Module',
    action: 'Action',
    descriptionColumn: 'Description',
    view: 'View',
    details: 'Audit Details',
    close: 'Close',
    logId: 'Log ID',
    recordId: 'Affected record ID',
    oldData: 'Previous data',
    newData: 'New data',
    noData: 'No data',
    detailsUnavailable: 'No details to display',
    actions: {
      UPDATE_USER: 'User Update',
      CHANGE_ROLE: 'Role Update',
      CREATE_USER: 'User Created',
      DELETE_USER: 'User Deleted',
      UPDATE_BUSINESS_SETTINGS: 'Business Settings Update',
      UPDATE_PROFILE_NAME: 'Profile Update',
      RESET_ALL_STOCK: 'Stock Reset',
      DELETE_PRODUCT: 'Product Deleted',
      MASS_UPDATE_PRICES: 'Price Update',
      CREATE_SALE: 'Sale Created',
      SALE_WITH_DISCOUNT: 'Sale with Discount',
      HIGH_DISCOUNT_SALE: 'High Discount Sale',
      CANCEL_SALE: 'Sale Canceled',
      CREATE_PURCHASE: 'Purchase Created',
      UPDATE_PURCHASE: 'Purchase Updated',
      DELETE_PURCHASE: 'Purchase Deleted',
      PROCESS_PARTIAL_SALE_RETURN: 'Partial return processed',
      UPDATE_PRODUCT_COST: 'Product cost updated',
      UPDATE_PRODUCT: 'Product updated',
      UPDATE_PRODUCT_PRICE: 'Product price updated',
      CREATE_PRODUCT: 'Product created',
      ADD_PRODUCT_STOCK: 'Stock added',
      UPDATE_SALES_PERMISSIONS: 'Sales permissions updated',
      UPDATE_PROFILE: 'Profile updated',
      EXPORT_BUSINESS_BACKUP: 'Backup exported',
      CONVERT_QUOTE_TO_SALE: 'Quote converted to sale',
      SEND_QUOTE_WHATSAPP: 'Quote sent via WhatsApp',
      SEND_QUOTE_EMAIL: 'Quote sent via email',
      CREATE_QUOTE: 'Quote created',
      TRANSFORM_INVENTORY: 'Inventory transformed',
      COMPLETE_PURCHASE_COST: 'Purchase cost completed',
      VIEW_CASHBOX: 'Cashbox viewed'
    },
    modules: {
      USERS: 'Users',
      SETTINGS: 'Settings',
      PRODUCTS: 'Products',
      SALES: 'Sales',
      PURCHASES: 'Purchases',
      CASHBOX: 'Cashbox',
      QUOTES: 'Quotes',
      INVOICES: 'Invoices'
    }
  }
};

function formatAuditLabel(value: string | null | undefined, dictionary: Record<string, string>) {
  const normalized = String(value || '').trim();
  if (!normalized) return '—';

  if (dictionary[normalized]) return dictionary[normalized];

  return normalized
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatAuditValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';

  if (typeof value === 'boolean') return value ? 'Sí' : 'No';

  if (typeof value === 'number') {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2
    });
  }

  if (Array.isArray(value)) {
    return `${value.length.toLocaleString('en-US')} item${value.length === 1 ? '' : 's'}`;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  const text = String(value);
  const maybeDate = /^\d{4}-\d{2}-\d{2}T/.test(text) ? new Date(text) : null;

  if (maybeDate && !Number.isNaN(maybeDate.getTime())) {
    return maybeDate.toLocaleString();
  }

  return text;
}

function formatSaleCode(value: unknown) {
  const saleId = Number(value || 0);
  if (!Number.isFinite(saleId) || saleId <= 0) return formatAuditValue(value);

  return `V-${String(saleId).padStart(4, '0')}`;
}

function formatAuditValueForKey(key: string, value: unknown) {
  if (key === 'venta_id') return formatSaleCode(value);

  if (key.includes('porcentaje') || key.includes('limit')) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return `${numericValue.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })}%`;
    }
  }

  return formatAuditValue(value);
}

function formatAuditFieldLabel(key: string) {
  const labels: Record<string, string> = {
    venta_id: 'Venta',
    cliente_id: 'Cliente ID',
    cliente_nombre: 'Cliente',
    vendedor_id: 'Vendedor ID',
    vendedor_nombre: 'Vendedor',
    tipo_pago: 'Tipo de pago',
    subtotal: 'Subtotal',
    total: 'Total',
    descuento: 'Descuento',
    descuento_porcentaje: 'Descuento (%)',
    descuento_monto: 'Descuento monto',
    seller_discount_limit: 'Límite vendedor (%)',
    monto_recibido: 'Monto recibido',
    monto_recibido_original: 'Monto recibido original',
    moneda_pago: 'Moneda de pago',
    tasa_cambio: 'Tasa de cambio',
    aplicado_a_deuda: 'Aplicado a deuda',
    cambio: 'Cambio',
    deuda_restante: 'Deuda restante',
    saldo_pendiente: 'Saldo pendiente',
    fecha: 'Fecha',
    producto_id: 'Producto ID',
    stock: 'Stock anterior',
    old_stock: 'Stock anterior',
    new_stock: 'Stock nuevo',
    quantity_added: 'Cantidad añadida',
    cantidad_agregada: 'Cantidad añadida',
    nombre: 'Nombre',
    email: 'Email',
    role: 'Rol',
    rol: 'Rol',
    username: 'Usuario',
    full_name: 'Nombre visible',
    negocio_id: 'Negocio ID',
    affected_products: 'Productos afectados',
    adjustment_type: 'Tipo de ajuste',
    adjustment_value: 'Valor del ajuste',
    operation: 'Operación',
    productos: 'Productos'
  };

  return labels[key] || key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function AuditChangeSummary({
  oldData,
  newData,
  language
}: {
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  language: 'es' | 'en';
}) {
  const oldStock = Number(oldData?.stock ?? oldData?.old_stock);
  const newStock = Number(newData?.new_stock ?? newData?.stock);
  const quantityAdded = Number(newData?.quantity_added ?? newData?.cantidad_agregada);

  if (!Number.isFinite(oldStock) || !Number.isFinite(newStock)) return null;

  const difference = Number.isFinite(quantityAdded) ? quantityAdded : newStock - oldStock;

  return (
    <div className="rounded-[1.5rem] border border-[#eadfca] bg-gradient-to-br from-[#fffdf8] to-[#fff4c7]/55 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">
        {language === 'es' ? 'Cambio de inventario' : 'Inventory change'}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-center">
          <p className="text-2xl font-black tabular-nums text-[#71717a]">{oldStock.toLocaleString()}</p>
          <p className="text-[9px] font-black uppercase text-[#a1a1aa]">{language === 'es' ? 'Anterior' : 'Previous'}</p>
        </div>
        <div className="h-px flex-1 bg-[#d9ceb8]" />
        <span className="rounded-full bg-[#050505] px-3 py-1.5 text-xs font-black text-[#f4c542]">
          {difference >= 0 ? '+' : ''}{difference.toLocaleString()}
        </span>
        <div className="h-px flex-1 bg-[#d9ceb8]" />
        <div className="text-center">
          <p className="text-2xl font-black tabular-nums text-[#050505]">{newStock.toLocaleString()}</p>
          <p className="text-[9px] font-black uppercase text-[#8a6a16]">{language === 'es' ? 'Nuevo' : 'New'}</p>
        </div>
      </div>
    </div>
  );
}

function getAuditDataRows(data: Record<string, unknown> | null | undefined) {
  if (!data || Object.keys(data).length === 0) return [];

  const hiddenKeys = new Set<string>();

  if (data.cliente_nombre) hiddenKeys.add('cliente_id');
  if (data.vendedor_nombre) hiddenKeys.add('vendedor_id');

  const priority = [
    'venta_id',
    'vendedor_nombre',
    'cliente_nombre',
    'subtotal',
    'descuento_porcentaje',
    'descuento_monto',
    'total',
    'seller_discount_limit',
    'tipo_pago',
    'moneda_pago',
    'monto_recibido',
    'aplicado_a_deuda',
    'cambio',
    'deuda_restante',
    'fecha',
    'nombre',
    'email',
    'username',
    'full_name',
    'rol',
    'role',
    'operation',
    'adjustment_type',
    'adjustment_value',
    'affected_products'
  ];

  const entries = Object.entries(data).filter(([key]) => !hiddenKeys.has(key));
  const sortedEntries = entries.sort(([firstKey], [secondKey]) => {
    const firstIndex = priority.indexOf(firstKey);
    const secondIndex = priority.indexOf(secondKey);

    if (firstIndex === -1 && secondIndex === -1) return firstKey.localeCompare(secondKey);
    if (firstIndex === -1) return 1;
    if (secondIndex === -1) return -1;
    return firstIndex - secondIndex;
  });

  return sortedEntries.map(([key, value]) => ({
    key,
    label: formatAuditFieldLabel(key),
    value: formatAuditValueForKey(key, value),
    isLong: typeof value === 'object' && value !== null
  }));
}

function AuditDataPanel({
  title,
  data,
  emptyText
}: {
  title: string;
  data: Record<string, unknown> | null | undefined;
  emptyText: string;
}) {
  const rows = getAuditDataRows(data);

  return (
    <div className="min-w-0 rounded-2xl border border-[#ece5d7] bg-white/85 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a16]">{title}</p>

      {rows.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] px-4 py-3 text-sm font-bold text-[#71717a]">
          {emptyText}
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7]">
          {rows.map((row) => (
            <div key={row.key} className="grid gap-2 border-b border-[#ece5d7] px-4 py-3 last:border-b-0 sm:grid-cols-[190px_minmax(0,1fr)]">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8a6a16]">
                {row.label}
              </p>
              {row.isLong ? (
                <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white/80 p-3 text-xs font-semibold leading-5 text-[#3f3f46]">
                  {row.value}
                </pre>
              ) : (
                <p className="break-words text-sm font-black text-[#050505]">
                  {row.value}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  const { userProfile } = useAuth();
  const { language } = useLanguage();
  const t = auditCopy[language as keyof typeof auditCopy] || auditCopy.es;
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const roleFlags = getUserRoleFlags(userProfile);
  const isSuperAdmin = roleFlags.isSuperAdmin;
  const canView = roleFlags.canViewAuditLogs;

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);

      const negocioId = userProfile?.negocio_id;

      if (!isSuperAdmin && !negocioId) {
        setLogs([]);
        return;
      }

      let query = supabase
        .from('audit_logs')
        .select('id, created_at, user_name, user_email, user_role, module, action, description, record_id, old_data, new_data')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!isSuperAdmin) {
        query = query.eq('negocio_id', negocioId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs((data || []) as AuditLog[]);
    } catch (error) {
      console.error('Error loading audit logs', error);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, userProfile?.negocio_id]);

  useEffect(() => {
    if (canView) {
      loadLogs();
    } else {
      setLoading(false);
    }
  }, [canView, loadLogs]);

  const filteredLogs = useMemo(() => {
    const term = search.toLowerCase();

    return logs.filter((log) =>
      [
        log.user_name,
        log.user_email,
        log.user_role,
        log.module,
        log.action,
        log.description
      ]
        .map((value) => String(value || ''))
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [logs, search]);

  if (!canView) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-8 text-center">
        <h1 className="text-2xl font-black text-red-600">{t.accessDenied}</h1>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="rounded-[1.5rem] border border-[#e5dfd2] bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#fff8e1] px-3 py-1.5 text-[10px] font-black uppercase text-[#8a6a16] sm:mb-3 sm:py-2 sm:text-xs">
              <Shield size={14} />
              {t.badge}
            </div>
            <h1 className="text-3xl font-black sm:text-4xl">{t.title}</h1>
            <p className="mt-1 text-sm leading-6 text-[#71717a] sm:mt-2">
              {t.description}
            </p>
          </div>

          <Button onClick={loadLogs} className="w-full gap-2 py-2.5 sm:w-auto">
            <RefreshCw size={16} />
            {t.refresh}
          </Button>
        </div>
      </section>

      <Card className="overflow-hidden rounded-[1.5rem] sm:rounded-[2rem]">
        <CardHeader className="border-b border-[#ece5d7] bg-white/75 p-3 sm:p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[#a1a1aa]" size={18} />
            <Input
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[980px] table-fixed">
              <thead>
                <tr className="border-b">
                  <th className="w-[150px] px-4 py-3 text-left">{t.date}</th>
                  <th className="w-[220px] px-4 py-3 text-left">{t.user}</th>
                  <th className="w-[90px] px-4 py-3 text-left">{t.role}</th>
                  <th className="w-[140px] px-4 py-3 text-left">{t.module}</th>
                  <th className="w-[220px] px-4 py-3 text-left">{t.action}</th>
                  <th className="w-[80px] px-4 py-3 text-center">{t.view}</th>
                </tr>
              </thead>

              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-[#fafafa]">
                    <td className="px-4 py-3 align-top text-sm text-[#050505]">
                      <div className="font-semibold">
                        {new Date(log.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-[#71717a]">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-[#050505]">
                      <div className="max-w-[200px] truncate font-bold" title={log.user_name || formatEmail(log.user_email, '')}>
                        {log.user_name || formatEmail(log.user_email, '—')}
                      </div>
                      {log.user_email && log.user_name && (
                        <div className="max-w-[200px] truncate text-xs text-[#71717a]" title={formatEmail(log.user_email, '')}>
                          {formatEmail(log.user_email)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-[#050505]">
                      <span className="capitalize">{log.user_role || '—'}</span>
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-[#050505]">
                      <div className="max-w-[140px] truncate" title={formatAuditLabel(log.module, t.modules)}>
                        {formatAuditLabel(log.module, t.modules)}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="inline-flex whitespace-nowrap rounded-full bg-[#fff8e1] px-3 py-1 text-xs font-bold text-[#8a6a16]" title={formatAuditLabel(log.action, t.actions)}>
                        {formatAuditLabel(log.action, t.actions)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-center">
                      <Button
                        type="button"
                        variant="secondary"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-2xl p-0"
                        onClick={() => setSelectedLog(log)}
                        aria-label={t.view}
                        title={t.view}
                      >
                        <Eye size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-[#f1ebdf] lg:hidden">
            {filteredLogs.map((log) => (
              <article
                key={log.id}
                className="flex min-w-0 items-center gap-3 bg-white px-3 py-3 transition hover:bg-[#fff9e8]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff4c7] text-[#8a6a16]">
                  <Shield size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.14em] text-[#8a6a16]">
                      {formatAuditLabel(log.module, t.modules)}
                    </span>
                    <span className="truncate text-xs font-black text-[#050505]">
                      {formatAuditLabel(log.action, t.actions)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-[#71717a]">
                    {log.user_name || formatEmail(log.user_email, '—')} · {new Date(log.created_at).toLocaleString(language === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e9e2d3] bg-white text-[#050505]"
                  onClick={() => setSelectedLog(log)}
                  aria-label={t.view}
                >
                  <Eye size={15} />
                </button>
              </article>
            ))}
          </div>

          {!loading && filteredLogs.length === 0 && (
            <div className="px-4 py-12 text-center text-[#71717a]">
              {t.empty}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title={t.details}>
        {selectedLog && (
          <div className="space-y-3 sm:space-y-4">
            <div className="relative overflow-hidden rounded-[1.5rem] bg-[#050505] p-4 text-white">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.24),transparent_45%)]" />
              <div className="relative z-10 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4c542] text-[#050505]">
                  <Shield size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#f4c542]">{formatAuditLabel(selectedLog.module, t.modules)}</p>
                  <h3 className="mt-1 text-base font-black leading-snug sm:text-xl">{formatAuditLabel(selectedLog.action, t.actions)}</h3>
                  <p className="mt-1 text-xs font-semibold text-white/55">
                    {new Date(selectedLog.created_at).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="min-w-0 rounded-xl border border-[#ece5d7] bg-white p-3 sm:rounded-2xl sm:p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8a6a16] sm:text-xs">{t.user}</p>
                <p className="mt-1 truncate text-xs font-black text-[#050505] sm:text-sm">{selectedLog.user_name || formatEmail(selectedLog.user_email, '—')}</p>
              </div>
              <div className="min-w-0 rounded-xl border border-[#ece5d7] bg-white p-3 sm:rounded-2xl sm:p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8a6a16] sm:text-xs">{t.role}</p>
                <p className="mt-1 text-xs font-black capitalize text-[#050505] sm:text-sm">
                  {selectedLog.user_role === 'owner' ? (language === 'es' ? 'Dueño' : 'Owner') : selectedLog.user_role || '—'}
                </p>
              </div>
              <div className="col-span-2 min-w-0 rounded-xl border border-[#ece5d7] bg-white p-3 sm:rounded-2xl sm:p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8a6a16] sm:text-xs">{t.email}</p>
                <p className="mt-1 break-all text-xs font-black text-[#050505] sm:text-sm">{formatEmail(selectedLog.user_email, '—')}</p>
              </div>
            </div>

            {selectedLog.description && (
              <div className="rounded-xl border border-[#ece5d7] bg-[#fbfaf7] p-3 sm:rounded-2xl sm:p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8a6a16] sm:text-xs">{t.descriptionColumn}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#050505]">{selectedLog.description}</p>
              </div>
            )}

            <AuditChangeSummary oldData={selectedLog.old_data} newData={selectedLog.new_data} language={language === 'es' ? 'es' : 'en'} />

            <details className="rounded-xl border border-[#ece5d7] bg-white px-3 py-2.5 text-xs">
              <summary className="cursor-pointer font-black text-[#52525b]">
                {language === 'es' ? 'Identificadores técnicos' : 'Technical identifiers'}
              </summary>
              <div className="mt-3 space-y-2 border-t border-[#ece5d7] pt-3 font-mono text-[10px] text-[#71717a]">
                <p>{t.logId}: {selectedLog.id}</p>
                <p className="break-all">{t.recordId}: {selectedLog.record_id || '—'}</p>
              </div>
            </details>

            <details className="rounded-xl border border-[#ece5d7] bg-white px-3 py-2.5">
              <summary className="cursor-pointer text-xs font-black text-[#52525b]">{t.oldData}</summary>
              <div className="mt-3"><AuditDataPanel title={t.oldData} data={selectedLog.old_data} emptyText={t.detailsUnavailable} /></div>
            </details>
            <details className="rounded-xl border border-[#ece5d7] bg-white px-3 py-2.5">
              <summary className="cursor-pointer text-xs font-black text-[#52525b]">{t.newData}</summary>
              <div className="mt-3"><AuditDataPanel title={t.newData} data={selectedLog.new_data} emptyText={t.detailsUnavailable} /></div>
            </details>
          </div>
        )}
      </Modal>
    </div>
  );
}
