import { useCallback, useEffect, useMemo, useState } from 'react';
import { Shield, Search, RefreshCw, Eye, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
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
      DELETE_PURCHASE: 'Compra eliminada'
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
      DELETE_PURCHASE: 'Purchase Deleted'
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
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#e5dfd2] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#fff8e1] px-3 py-2 text-xs font-black uppercase text-[#8a6a16]">
              <Shield size={14} />
              {t.badge}
            </div>
            <h1 className="text-4xl font-black">{t.title}</h1>
            <p className="mt-2 text-sm text-[#71717a]">
              {t.description}
            </p>
          </div>

          <Button onClick={loadLogs} className="gap-2">
            <RefreshCw size={16} />
            {t.refresh}
          </Button>
        </div>
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-[#ece5d7] bg-white/75 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Search size={18} />
            <Input
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

          <div className="space-y-3 p-4 lg:hidden">
            {filteredLogs.map((log) => (
              <article
                key={log.id}
                className="rounded-2xl border border-[#ece5d7] bg-white/85 p-4 shadow-[0_14px_32px_rgba(15,15,15,0.04)]"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a6a16]">
                    {formatAuditLabel(log.module, t.modules)}
                  </span>
                  <span className="rounded-full bg-[#fff8e1] px-3 py-1 text-xs font-bold text-[#8a6a16]">
                    {formatAuditLabel(log.action, t.actions)}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-2xl px-3 text-xs font-black"
                  onClick={() => setSelectedLog(log)}
                >
                  <Eye size={14} />
                  {t.view}
                </Button>

                <div className="mt-4 grid gap-2 text-sm text-[#71717a] sm:grid-cols-2">
                  <div>
                    <span className="font-bold text-[#050505]">{t.date}: </span>
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-bold text-[#050505]">{t.user}: </span>
                    {log.user_name || formatEmail(log.user_email, '—')}
                  </div>
                  <div>
                    <span className="font-bold text-[#050505]">{t.role}: </span>
                    {log.user_role || '—'}
                  </div>
                </div>
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

      {selectedLog && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/35 p-4 backdrop-blur-sm sm:p-6">
          <div className="mx-auto max-w-3xl rounded-[2rem] border border-[#e5dfd2] bg-[#fbfaf7] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8a6a16]">
                  {t.badge}
                </p>
                <h2 className="text-2xl font-black text-[#050505]">
                  {t.details}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-2xl border border-[#e9e2d3] bg-white p-3 text-[#050505] shadow-sm transition hover:bg-[#fff8e1]"
                aria-label={t.close}
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#ece5d7] bg-white/85 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a16]">{t.date}</p>
                <p className="mt-1 text-sm font-bold text-[#050505]">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-[#ece5d7] bg-white/85 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a16]">{t.user}</p>
                <p className="mt-1 text-sm font-bold text-[#050505]">
                  {selectedLog.user_name || formatEmail(selectedLog.user_email, '—')}
                </p>
              </div>

              <div className="rounded-2xl border border-[#ece5d7] bg-white/85 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a16]">{t.email}</p>
                <p className="mt-1 break-all text-sm font-bold text-[#050505]">
                  {formatEmail(selectedLog.user_email, '—')}
                </p>
              </div>

              <div className="rounded-2xl border border-[#ece5d7] bg-white/85 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a16]">{t.role}</p>
                <p className="mt-1 text-sm font-bold capitalize text-[#050505]">
                  {selectedLog.user_role || '—'}
                </p>
              </div>

              <div className="rounded-2xl border border-[#ece5d7] bg-white/85 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a16]">{t.module}</p>
                <p className="mt-1 text-sm font-bold text-[#050505]">
                  {formatAuditLabel(selectedLog.module, t.modules)}
                </p>
              </div>

              <div className="rounded-2xl border border-[#ece5d7] bg-white/85 p-4 sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a16]">{t.logId}</p>
                <p className="mt-1 break-all text-sm font-bold text-[#050505]">
                  {selectedLog.id}
                </p>
              </div>

              <div className="rounded-2xl border border-[#ece5d7] bg-white/85 p-4 sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a16]">{t.recordId}</p>
                <p className="mt-1 break-all text-sm font-bold text-[#050505]">
                  {selectedLog.record_id || '—'}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#ece5d7] bg-white/85 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a16]">{t.action}</p>
              <span className="mt-2 inline-flex rounded-full bg-[#fff8e1] px-3 py-1 text-sm font-bold text-[#8a6a16]">
                {formatAuditLabel(selectedLog.action, t.actions)}
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-[#ece5d7] bg-white/85 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a16]">{t.descriptionColumn}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#050505]">
                {selectedLog.description || '—'}
              </p>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <AuditDataPanel title={t.oldData} data={selectedLog.old_data} emptyText={t.detailsUnavailable} />
              <AuditDataPanel title={t.newData} data={selectedLog.new_data} emptyText={t.detailsUnavailable} />
            </div>

            <div className="mt-5 flex justify-end">
              <Button type="button" onClick={() => setSelectedLog(null)}>
                {t.close}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
