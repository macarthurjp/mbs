import { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  Info,
  Trash2,
  XCircle,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import type { AppNotification, AppNotificationType } from '../contexts/NotificationContext';
import { supabase } from '../lib/supabase';

const notificationsCopy = {
  es: {
    title: 'Notificaciones',
    subtitle: 'Centro de alertas, avisos y actividad importante del negocio.',
    total: 'Total',
    unread: 'Sin leer',
    read: 'Leídas',
    markAllRead: 'Marcar todo leído',
    clearAll: 'Limpiar todo',
    noNotifications: 'No tienes notificaciones todavía',
    noNotificationsText: 'Cuando haya alertas importantes, respuestas de soporte, stock bajo o eventos del sistema aparecerán aquí.',
    open: 'Abrir',
    viewSale: 'Ver venta',
    viewTicket: 'Ver ticket',
    viewProduct: 'Ver producto',
    viewUsers: 'Ver usuarios',
    viewBilling: 'Ver facturación',
    viewDetails: 'Ver detalles',
    markRead: 'Marcar leído',
    clear: 'Eliminar',
    today: 'Hoy',
    yesterday: 'Ayer',
    older: 'Anteriores',
    unreadLabel: 'Sin leer',
    readLabel: 'Leída',
    info: 'Info',
    success: 'Éxito',
    warning: 'Alerta',
    error: 'Error',
    loadingTicketDetails: 'Cargando detalles del ticket...',
    ticketMissingId: 'Esta notificación no incluye un ID de ticket. Las nuevas notificaciones de soporte abrirán el ticket exacto automáticamente.',
    ticketNotFound: 'Ticket no encontrado o no tienes permiso para verlo.',
    ticketLoadError: 'No se pudieron cargar los detalles del ticket.',
    supportNotification: 'Notificación de soporte',
    supportFallback: 'Soporte',
    originalMessage: 'Mensaje original',
    created: 'Creado',
    latestSupportResponse: 'Última respuesta de soporte',
    responded: 'Respondido',
    noSupportResponse: 'Aún no hay respuesta de soporte.'
  },
  en: {
    title: 'Notifications',
    subtitle: 'Alerts, notices, and important business activity center.',
    total: 'Total',
    unread: 'Unread',
    read: 'Read',
    markAllRead: 'Mark all read',
    clearAll: 'Clear all',
    noNotifications: 'No notifications yet',
    noNotificationsText: 'Important alerts, support responses, low stock, or system events will appear here.',
    open: 'Open',
    viewSale: 'View sale',
    viewTicket: 'View ticket',
    viewProduct: 'View product',
    viewUsers: 'View users',
    viewBilling: 'View billing',
    viewDetails: 'View details',
    markRead: 'Mark read',
    clear: 'Delete',
    today: 'Today',
    yesterday: 'Yesterday',
    older: 'Older',
    unreadLabel: 'Unread',
    readLabel: 'Read',
    info: 'Info',
    success: 'Success',
    warning: 'Warning',
    error: 'Error',
    loadingTicketDetails: 'Loading ticket details...',
    ticketMissingId: 'This notification does not include a ticket ID. New support notifications will open the exact ticket automatically.',
    ticketNotFound: 'Ticket not found or you do not have permission to view it.',
    ticketLoadError: 'Could not load the ticket details.',
    supportNotification: 'Support notification',
    supportFallback: 'Support',
    originalMessage: 'Original message',
    created: 'Created',
    latestSupportResponse: 'Latest support response',
    responded: 'Responded',
    noSupportResponse: 'No support response yet.'
  }
} as const;

type SupportTicketDetail = {
  id: string;
  created_at: string;
  subject: string;
  category: string | null;
  message: string;
  status: string | null;
  priority?: string | null;
  response?: string | null;
  responded_at?: string | null;
  attachment_name?: string | null;
};

function getNotificationIcon(type: AppNotificationType) {
  if (type === 'success') return CheckCircle2;
  if (type === 'warning') return AlertTriangle;
  if (type === 'error') return XCircle;
  return Info;
}

function getNotificationStyle(type: AppNotificationType) {
  if (type === 'success') {
    return {
      badge: 'border-emerald-100 bg-emerald-50 text-emerald-700',
      icon: 'bg-emerald-50 text-emerald-700'
    };
  }

  if (type === 'warning') {
    return {
      badge: 'border-[#f4c542]/30 bg-[#fff4c7] text-[#8a6a16]',
      icon: 'bg-[#fff4c7] text-[#8a6a16]'
    };
  }

  if (type === 'error') {
    return {
      badge: 'border-red-100 bg-red-50 text-red-700',
      icon: 'bg-red-50 text-red-700'
    };
  }

  return {
    badge: 'border-blue-100 bg-blue-50 text-blue-700',
    icon: 'bg-blue-50 text-blue-700'
  };
}

function getNotificationTypeLabel(type: AppNotificationType, t: typeof notificationsCopy.es | typeof notificationsCopy.en) {
  if (type === 'success') return t.success;
  if (type === 'warning') return t.warning;
  if (type === 'error') return t.error;
  return t.info;
}

function formatNotificationTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatNotificationCode(id: string) {
  const cleanId = String(id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  if (!cleanId) {
    return 'NOT-000000';
  }

  if (/^\d+$/.test(cleanId)) {
    return `NOT-${cleanId.padStart(6, '0').slice(-6)}`;
  }

  return `NOT-${cleanId.slice(-6)}`;
}

function formatTicketCode(id: string) {
  const cleanId = String(id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  if (!cleanId) {
    return 'SUP-000000';
  }

  if (/^\d+$/.test(cleanId)) {
    return `SUP-${cleanId.padStart(6, '0').slice(-6)}`;
  }

  return `SUP-${cleanId.slice(-6)}`;
}

function groupNotifications(notifications: AppNotification[]) {
  const now = new Date();
  const todayKey = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = yesterday.toDateString();

  return notifications.reduce(
    (groups, notification) => {
      const date = new Date(notification.createdAt);
      const key = date.toDateString();

      if (key === todayKey) {
        groups.today.push(notification);
      } else if (key === yesterdayKey) {
        groups.yesterday.push(notification);
      } else {
        groups.older.push(notification);
      }

      return groups;
    },
    {
      today: [] as AppNotification[],
      yesterday: [] as AppNotification[],
      older: [] as AppNotification[]
    }
  );
}

function normalizeInternalLink(link?: string) {
  if (!link) return '';

  return link
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^\//, '')
    .trim();
}

function getSupportTicketIdFromLink(link: string) {
  if (!link.startsWith('support?')) return null;

  const query = link.split('?')[1] || '';
  const params = new URLSearchParams(query);

  return params.get('ticket');
}

function getSaleIdFromLink(link: string) {
  if (!link.startsWith('invoices?') && !link.startsWith('sales?')) return null;

  const query = link.split('?')[1] || '';
  const params = new URLSearchParams(query);

  return params.get('invoiceId') || params.get('sale') || params.get('id') || params.get('venta');
}

function getSaleIdFromNotification(notification: AppNotification, internalLink: string) {
  const saleIdFromLink = getSaleIdFromLink(internalLink);

  if (saleIdFromLink) {
    return saleIdFromLink;
  }

  const text = `${notification.title || ''} ${notification.message || ''}`;
  const saleCodeMatch = text.match(/V-(\d+)/i);

  if (saleCodeMatch?.[1]) {
    return String(Number(saleCodeMatch[1]));
  }

  return null;
}
function isSaleNotification(notification: AppNotification) {
  const link = normalizeInternalLink(notification.link);
  const category = String(notification.category || '').toLowerCase();
  const title = String(notification.title || '').toLowerCase();
  const message = String(notification.message || '').toLowerCase();

  return (
    category === 'sales' ||
    link.startsWith('invoices') ||
    link.startsWith('sales') ||
    title.includes('sale registered') ||
    title.includes('venta registrada') ||
    message.includes('registered by') ||
    message.includes('registrada por')
  );
}

function isProductNotification(notification: AppNotification) {
  const link = normalizeInternalLink(notification.link);
  const category = String(notification.category || '').toLowerCase();
  const title = String(notification.title || '').toLowerCase();
  const message = String(notification.message || '').toLowerCase();

  return (
    category === 'products' ||
    category === 'inventory' ||
    category === 'low_stock' ||
    link.startsWith('products') ||
    title.includes('product') ||
    title.includes('producto') ||
    message.includes('price') ||
    message.includes('precio') ||
    message.includes('stock')
  );
}

function isSupportNotification(notification: AppNotification, internalLink = normalizeInternalLink(notification.link)) {
  const category = String(notification.category || '').toLowerCase();
  const title = String(notification.title || '').toLowerCase();
  const message = String(notification.message || '').toLowerCase();

  return (
    Boolean(getSupportTicketIdFromLink(internalLink)) ||
    category === 'support' ||
    category === 'support_ticket' ||
    category === 'support_tickets' ||
    internalLink.startsWith('support?') ||
    internalLink.startsWith('support-tickets') ||
    title.includes('support') ||
    message.includes('support ticket') ||
    message.includes('ticket de soporte')
  );
}

function isUserNotification(notification: AppNotification) {
  const category = String(notification.category || '').toLowerCase();
  const link = normalizeInternalLink(notification.link);

  return category === 'users' || category === 'user' || link.startsWith('users');
}

function isBillingNotification(notification: AppNotification) {
  const category = String(notification.category || '').toLowerCase();
  const link = normalizeInternalLink(notification.link);

  return (
    category === 'subscription' ||
    category === 'billing' ||
    category === 'subscription_billing' ||
    link.startsWith('settings')
  );
}

function getNotificationActionLabel(notification: AppNotification, t: typeof notificationsCopy.es | typeof notificationsCopy.en) {
  const link = normalizeInternalLink(notification.link);

  if (isSaleNotification(notification)) {
    return t.viewSale;
  }

  if (isProductNotification(notification)) {
    return t.viewProduct;
  }

  if (isSupportNotification(notification, link)) {
    return t.viewTicket;
  }

  if (isUserNotification(notification)) return t.viewUsers;
  if (isBillingNotification(notification)) return t.viewBilling;

  return t.viewDetails;
}
export default function NotificationsPage() {
  const { language } = useLanguage();
  const t = notificationsCopy[language];
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotification,
    clearAllNotifications
  } = useNotification();

  const readCount = notifications.length - unreadCount;
  const groups = groupNotifications(notifications);

  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketModalLoading, setTicketModalLoading] = useState(false);
  const [ticketModalError, setTicketModalError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketDetail | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);

  async function openNotification(notification: AppNotification) {
    markNotificationRead(notification.id);

    const internalLink = normalizeInternalLink(notification.link);
    const supportTicketId = internalLink ? getSupportTicketIdFromLink(internalLink) : null;

    if (isSaleNotification(notification)) {
      const saleId = getSaleIdFromNotification(notification, internalLink);

      if (saleId) {
        const normalizedSaleId = String(saleId);

        sessionStorage.setItem('matmax_open_invoice_sale', normalizedSaleId);
        sessionStorage.setItem('matmax_pending_invoice_id', normalizedSaleId);

        window.dispatchEvent(
          new CustomEvent('matmax_navigate', {
            detail: `invoices?invoiceId=${normalizedSaleId}`
          })
        );

        window.setTimeout(() => {
          sessionStorage.setItem('matmax_open_invoice_sale', normalizedSaleId);
          sessionStorage.setItem('matmax_pending_invoice_id', normalizedSaleId);

          window.requestAnimationFrame(() => {
            window.dispatchEvent(
              new CustomEvent('matmax:open-invoice', {
                detail: normalizedSaleId
              })
            );
          });
        }, 320);

        return;
      }

      window.dispatchEvent(
        new CustomEvent('matmax_navigate', {
          detail: 'invoices'
        })
      );
      return;
    }

    if (isProductNotification(notification)) {
      window.dispatchEvent(
        new CustomEvent('matmax_navigate', {
          detail: 'products'
        })
      );
      return;
    }

    if (isSupportNotification(notification, internalLink)) {
      setTicketModalOpen(true);
      setSelectedNotification(notification);
      setSelectedTicket(null);
      setTicketModalError('');

      if (!supportTicketId) {
        setTicketModalError(t.ticketMissingId);
        return;
      }

      try {
        setTicketModalLoading(true);

        const { data, error } = await supabase
          .from('support_tickets')
          .select('id, created_at, subject, category, message, status, priority, response, responded_at, attachment_name')
          .eq('id', supportTicketId)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setTicketModalError(t.ticketNotFound);
          return;
        }

        setSelectedTicket(data as SupportTicketDetail);
      } catch (error) {
        console.error('Error loading support ticket from notification:', error);
        setTicketModalError(t.ticketLoadError);
      } finally {
        setTicketModalLoading(false);
      }

      return;
    }

    if (!internalLink) return;

    window.dispatchEvent(
      new CustomEvent('matmax_navigate', {
        detail: internalLink
      })
    );
  }

  function renderNotification(notification: AppNotification) {
    const Icon = getNotificationIcon(notification.type);
    const styles = getNotificationStyle(notification.type);
    const notificationCode = formatNotificationCode(notification.id);

    return (
      <div
        key={notification.id}
        className={`group relative overflow-hidden rounded-[1.5rem] border p-4 shadow-[0_14px_34px_rgba(15,15,15,0.045)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(15,15,15,0.08)] sm:p-5 ${
          notification.read
            ? 'border-[#e9e2d3] bg-white/88'
            : 'border-[#f4c542]/35 bg-[#fffdf8]'
        }`}
      >
        {!notification.read && (
          <div className="pointer-events-none absolute inset-y-4 left-0 w-1 rounded-r-full bg-[#f4c542]" />
        )}

        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${styles.icon}`}>
              <Icon className="h-5 w-5 shrink-0" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${styles.badge}`}>
                  {getNotificationTypeLabel(notification.type, t)}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${notification.read ? 'bg-[#f4f1e8] text-[#71717a]' : 'bg-[#050505] text-[#f4c542]'}`}>
                  {notification.read ? t.readLabel : t.unreadLabel}
                </span>
                <span className="rounded-full border border-[#e9e2d3] bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#71717a]">
                  {notificationCode}
                </span>
              </div>

              <h3 className="break-words text-base font-black leading-snug text-[#050505] sm:text-lg">
                {notification.title}
              </h3>

              <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-[#71717a]">
                {notification.message}
              </p>

              <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#a1a1aa]">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {formatNotificationTime(notification.createdAt)}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:min-w-[132px]">
            {(notification.link || isProductNotification(notification)) && (
              <button
                type="button"
                onClick={() => openNotification(notification)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#050505] bg-[#050505] px-3 py-2 text-xs font-black text-[#f4c542] transition hover:-translate-y-0.5 hover:bg-[#111111]"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                {getNotificationActionLabel(notification, t)}
              </button>
            )}

            {!notification.read && (
              <button
                type="button"
                onClick={() => markNotificationRead(notification.id)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
              >
                <CheckCheck className="h-3.5 w-3.5 shrink-0" />
                {t.markRead}
              </button>
            )}

            <button
              type="button"
              onClick={() => clearNotification(notification.id)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              {t.clear}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderGroup(title: string, items: AppNotification[]) {
    if (items.length === 0) return null;

    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-[#8a6a16]">
            {title}
          </h2>
          <span className="rounded-full border border-[#e9e2d3] bg-white px-3 py-1 text-xs font-black text-[#71717a]">
            {items.length.toLocaleString('en-US')}
          </span>
        </div>
        <div className="space-y-3">
          {items.map(renderNotification)}
        </div>
      </section>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden text-[#08080b] sm:space-y-8">
      <section className="relative min-w-0 overflow-hidden rounded-[2rem] border border-[#e9e2d3]/80 bg-[#fffdf8]/85 p-5 shadow-[0_24px_70px_rgba(15,15,15,0.07)] backdrop-blur-2xl sm:p-7 xl:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,197,66,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.88),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f4c542]/60 to-transparent" />

        <div className="relative z-10 flex min-w-0 flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#eadfca] bg-white/75 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6a16] shadow-sm backdrop-blur-xl">
              <Bell size={14} />
              MatMax Business Suite
            </div>
            <h1 className="mb-3 text-4xl font-black tracking-tight text-[#050505] sm:text-5xl xl:text-[4rem]">
              {t.title}
            </h1>
            <p className="max-w-3xl text-sm font-bold uppercase tracking-[0.18em] text-[#71717a] sm:text-base">
              {t.subtitle}
            </p>
          </div>

          <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 xl:w-[520px]">
            <NotificationMetric title={t.total} value={notifications.length} />
            <NotificationMetric title={t.unread} value={unreadCount} dark />
            <NotificationMetric title={t.read} value={readCount} />
          </div>
        </div>
      </section>

      <Card className="overflow-hidden border-[#e9e2d3] bg-white/92 shadow-[0_22px_65px_rgba(15,15,15,0.06)] backdrop-blur-2xl">
        <CardContent className="p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-black text-[#050505]">
                {t.title}
              </h2>
              <p className="mt-1 text-sm font-semibold text-[#71717a]">
                {unreadCount.toLocaleString('en-US')} {t.unread.toLowerCase()}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={markAllNotificationsRead}
                disabled={unreadCount === 0}
                className="w-full sm:w-auto"
              >
                <CheckCheck className="h-4 w-4 shrink-0" />
                {t.markAllRead}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={clearAllNotifications}
                disabled={notifications.length === 0}
                className="w-full border-red-100 bg-red-50 text-red-600 hover:bg-red-100 sm:w-auto"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                {t.clearAll}
              </Button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-[#e9e2d3] bg-[#fbfaf7] px-5 py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-[#050505] text-[#f4c542] shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
                <Bell className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-black text-[#050505]">
                {t.noNotifications}
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-relaxed text-[#71717a]">
                {t.noNotificationsText}
              </p>
            </div>
          ) : (
            <div className="space-y-7">
              {renderGroup(t.today, groups.today)}
              {renderGroup(t.yesterday, groups.yesterday)}
              {renderGroup(t.older, groups.older)}
            </div>
          )}
        </CardContent>
      </Card>

      {ticketModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[#e9e2d3] bg-white shadow-[0_28px_90px_rgba(0,0,0,0.25)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#e9e2d3] bg-[#fffdf8] p-5">
              <div className="min-w-0">
                <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-[#8a6a16]">
                  {language === 'es' ? 'Ticket de soporte' : 'Support Ticket'}
                </p>
                <h3 className="break-words text-xl font-black text-[#050505]">
                  {selectedTicket?.subject || selectedNotification?.title || t.supportNotification}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTicketModalOpen(false);
                  setSelectedTicket(null);
                  setSelectedNotification(null);
                  setTicketModalError('');
                }}
                className="shrink-0 rounded-2xl border border-[#e9e2d3] bg-white px-4 py-2 text-sm font-black text-[#050505] transition hover:bg-[#fbfaf7]"
              >
                {language === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              {ticketModalLoading ? (
                <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4 text-sm font-bold text-[#71717a]">
                  {t.loadingTicketDetails}
                </div>
              ) : ticketModalError ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
                    {ticketModalError}
                  </div>

                  {selectedNotification && (
                    <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4">
                      <p className="text-sm font-black text-[#050505]">{selectedNotification.title}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-[#71717a]">
                        {selectedNotification.message}
                      </p>
                    </div>
                  )}
                </div>
              ) : selectedTicket ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#e9e2d3] bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#8a6a16]">
                      {formatTicketCode(selectedTicket.id)}
                    </span>
                    <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-blue-700">
                      {selectedTicket.category || t.supportFallback}
                    </span>
                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                      {selectedTicket.status || 'open'}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4">
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[#8a6a16]">
                      {t.originalMessage}
                    </p>
                    <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-[#3f3f46]">
                      {selectedTicket.message}
                    </p>
                    <p className="mt-3 text-xs font-bold text-[#a1a1aa]">
                      {t.created}: {formatNotificationTime(selectedTicket.created_at)}
                    </p>
                  </div>

                  {selectedTicket.attachment_name && (
                    <div className="rounded-2xl border border-[#e9e2d3] bg-white p-4 text-sm font-bold text-[#8a6a16]">
                      📎 {selectedTicket.attachment_name}
                    </div>
                  )}

                  {selectedTicket.response ? (
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                      <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-green-700">
                        {t.latestSupportResponse}
                      </p>
                      <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-green-900">
                        {selectedTicket.response}
                      </p>
                      {selectedTicket.responded_at && (
                        <p className="mt-3 text-xs font-bold text-green-700/70">
                          {t.responded}: {formatNotificationTime(selectedTicket.responded_at)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[#e9e2d3] bg-white p-4 text-sm font-bold text-[#71717a]">
                      {t.noSupportResponse}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationMetric({
  title,
  value,
  dark = false
}: {
  title: string;
  value: number;
  dark?: boolean;
}) {
  return (
    <div className={`relative min-w-0 overflow-hidden rounded-[1.5rem] border p-4 shadow-sm backdrop-blur-xl ${dark ? 'border-[#050505] bg-[#050505] text-white' : 'border-[#e9e2d3] bg-white/78 text-[#050505]'}`}>
      <p className={`mb-2 text-[10px] font-black uppercase tracking-[0.2em] ${dark ? 'text-[#f4c542]' : 'text-[#8a6a16]'}`}>
        {title}
      </p>
      <p className={`break-words text-3xl font-black leading-none tracking-tight tabular-nums ${dark ? 'text-[#f4c542]' : 'text-[#050505]'}`}>
        {value.toLocaleString('en-US')}
      </p>
    </div>
  );
}
