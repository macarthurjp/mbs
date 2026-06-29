import { useEffect, useMemo, useState, type ElementType } from 'react';
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  Headset,
  LayoutDashboard,
  LogOut,
  LockKeyhole,
  Package,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  Users,
  Wallet,
  X
} from 'lucide-react';
import { getUserRoleFlags } from '../../utils/roles';
import { useNotification } from '../../contexts/NotificationContext';
import type { AppNotification } from '../../contexts/NotificationContext';
import { supabase } from '../../lib/supabase';
import { formatEmail } from '../../utils/formatContact';

export type AppPage =
  | 'dashboard'
  | 'products'
  | 'clients'
  | 'sales'
  | 'quotes'
  | 'cashbox'
  | 'purchases'
  | 'invoices'
  | 'reports'
  | 'accounts-receivable'
  | 'notifications'
  | 'settings'
  | 'users'
  | 'audit-logs'
  | 'support-tickets'
  | 'superadmin';

type SidebarProps = {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  isOpen?: boolean;
  onClose?: () => void;
  businessName?: string;
  plan?: string | null;
  userEmail?: string | null;
  onLogout?: () => void;
  isSuperAdmin?: boolean;
  canManageUsers?: boolean;
  userRole?: string | null;
  language?: AppLanguage;
  onToggleLanguage?: () => void;
};

type AppLanguage = 'es' | 'en';

const sidebarCopy = {
  es: {
    closeMenu: 'Cerrar menú',
    closeSidebar: 'Cerrar sidebar',
    activeBusiness: 'Negocio activo',
    active: 'Activo',
    tagline: 'Gestión - Precisión - Elegancia',
    businessAccount: 'Cuenta empresarial',
    description: 'Plataforma integral para ventas, inventario, clientes y facturación.',
    platformDescription: 'Administra suscripciones, negocios, usuarios y métricas SaaS.',
    logout: 'Cerrar sesión',
    languageButton: 'EN',
    switchLanguage: 'Cambiar idioma a inglés',
    notifications: 'Notificaciones',
    unreadNotifications: 'notificaciones sin leer',
    lockScreen: 'Bloquear pantalla',
    navigation: {
      dashboard: { label: 'Dashboard', description: 'Resumen general' },
      sales: { label: 'Ventas', description: 'Facturación diaria' },
      quotes: { label: 'Cotizaciones', description: 'Presupuestos y propuestas' },
      products: { label: 'Productos', description: 'Inventario' },
      clients: { label: 'Clientes', description: 'Base de clientes' },
      cashbox: { label: 'Caja', description: 'Entradas y salidas' },
      purchases: { label: 'Compras', description: 'Abastecimiento' },
      invoices: { label: 'Facturas', description: 'Documentos' },
      reports: { label: 'Reportes', description: 'Analíticas' },
      'accounts-receivable': { label: 'Cuentas por cobrar', description: 'Crédito y deudas' },
      notifications: { label: 'Notificaciones', description: 'Alertas y actividad' },
      settings: { label: 'Configuración', description: 'Negocio y pagos' },
      users: { label: 'Usuarios', description: 'Administrar accesos' },
      'audit-logs': { label: 'Auditoría', description: 'Historial de acciones' },
      'support-tickets': { label: 'Soporte', description: 'Tickets de clientes' },
      superadmin: { label: 'Negocios', description: 'Gestión de clientes SaaS' },
    },
    superAdminNavigation: {
      dashboard: { label: 'Dashboard SaaS', description: 'Métricas de plataforma' },
      superadmin: { label: 'Negocios', description: 'Negocios y accesos' },
      users: { label: 'Usuarios', description: 'Usuarios de plataforma' },
      'audit-logs': { label: 'Auditoría', description: 'Historial global' },
      'support-tickets': { label: 'Soporte', description: 'Tickets de clientes' },
      notifications: { label: 'Notificaciones', description: 'Alertas y actividad' },
      settings: { label: 'Configuración', description: 'Ajustes de plataforma' },
    },
  },
  en: {
    closeMenu: 'Close menu',
    closeSidebar: 'Close sidebar',
    activeBusiness: 'Active business',
    active: 'Active',
    tagline: 'Management - Precision - Elegance',
    businessAccount: 'Business account',
    description: 'All-in-one platform for sales, inventory, clients, and invoicing.',
    platformDescription: 'Manage subscriptions, businesses, users and SaaS metrics.',
    logout: 'Log out',
    languageButton: 'ES',
    switchLanguage: 'Switch language to Spanish',
    notifications: 'Notifications',
    unreadNotifications: 'unread notifications',
    lockScreen: 'Lock screen',
    navigation: {
      dashboard: { label: 'Dashboard', description: 'Overview' },
      sales: { label: 'Sales', description: 'Daily billing' },
      quotes: { label: 'Quotes', description: 'Estimates and proposals' },
      products: { label: 'Products', description: 'Inventory' },
      clients: { label: 'Clients', description: 'Client database' },
      cashbox: { label: 'Cashbox', description: 'Cash in and out' },
      purchases: { label: 'Purchases', description: 'Supply management' },
      invoices: { label: 'Invoices', description: 'Documents' },
      reports: { label: 'Reports', description: 'Analytics' },
      'accounts-receivable': { label: 'Accounts receivable', description: 'Credit and debt' },
      notifications: { label: 'Notifications', description: 'Alerts and activity' },
      settings: { label: 'Settings', description: 'Business and payments' },
      users: { label: 'Users', description: 'Manage access' },
      'audit-logs': { label: 'Audit logs', description: 'Action history' },
      'support-tickets': { label: 'Support', description: 'Customer tickets' },
      superadmin: { label: 'Businesses', description: 'SaaS customer management' },
    },
    superAdminNavigation: {
      dashboard: { label: 'SaaS Dashboard', description: 'Platform metrics' },
      superadmin: { label: 'Businesses', description: 'Businesses and access' },
      users: { label: 'Users', description: 'Platform users' },
      'audit-logs': { label: 'Audit logs', description: 'Global history' },
      'support-tickets': { label: 'Support', description: 'Customer tickets' },
      notifications: { label: 'Notifications', description: 'Alerts and activity' },
      settings: { label: 'Settings', description: 'Platform settings' },
    },
  },
} as const;

const LANGUAGE_STORAGE_KEY = 'matmax_language';
const LANGUAGE_CHANGE_EVENT = 'matmax_language_change';

function getSavedLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'es';

  const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return savedLanguage === 'en' ? 'en' : 'es';
}

const navigationItems: {
  id: AppPage;
  icon: ElementType;
}[] = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'sales', icon: ShoppingCart },
  { id: 'quotes', icon: ClipboardList },
  { id: 'products', icon: Package },
  { id: 'clients', icon: Users },
  { id: 'cashbox', icon: Wallet },
  { id: 'purchases', icon: Boxes },
  { id: 'invoices', icon: FileText },
  { id: 'reports', icon: BarChart3 },
  { id: 'accounts-receivable', icon: CreditCard },
  { id: 'notifications', icon: Bell },
  { id: 'settings', icon: Settings },
  { id: 'users', icon: Users },
  { id: 'audit-logs', icon: ClipboardList },
  { id: 'superadmin', icon: Shield }
];


const superAdminNavigationItems: {
  id: AppPage;
  icon: ElementType;
}[] = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'superadmin', icon: Shield },
  { id: 'users', icon: Users },
  { id: 'audit-logs', icon: ClipboardList },
  { id: 'support-tickets', icon: Headset },
  { id: 'notifications', icon: Bell },
  { id: 'settings', icon: Settings }
];

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

function isSaleNotification(notification: AppNotification | null | undefined) {
  const internalLink = normalizeInternalLink(notification?.link);
  const category = String(notification?.category || '').toLowerCase();
  const title = String(notification?.title || '').toLowerCase();
  const message = String(notification?.message || '').toLowerCase();

  return (
    category === 'sales' ||
    internalLink.startsWith('invoices') ||
    internalLink.startsWith('sales') ||
    title.includes('sale registered') ||
    title.includes('venta registrada') ||
    message.includes('registered by') ||
    message.includes('registrada por')
  );
}

function isSupportNotification(notification: AppNotification | null | undefined) {
  const internalLink = normalizeInternalLink(notification?.link);
  const category = String(notification?.category || '').toLowerCase();
  const title = String(notification?.title || '').toLowerCase();
  const message = String(notification?.message || '').toLowerCase();

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

function isProductNotification(notification: AppNotification | null | undefined) {
  const internalLink = normalizeInternalLink(notification?.link);
  const category = String(notification?.category || '').toLowerCase();
  const title = String(notification?.title || '').toLowerCase();
  const message = String(notification?.message || '').toLowerCase();

  return (
    category === 'products' ||
    category === 'inventory' ||
    category === 'low_stock' ||
    internalLink.startsWith('products') ||
    title.includes('product') ||
    title.includes('producto') ||
    message.includes('stock') ||
    message.includes('price') ||
    message.includes('precio')
  );
}

function isUserNotification(notification: AppNotification | null | undefined) {
  const internalLink = normalizeInternalLink(notification?.link);
  const category = String(notification?.category || '').toLowerCase();
  return category === 'users' || category === 'user' || internalLink.startsWith('users');
}

function isBillingNotification(notification: AppNotification | null | undefined) {
  const internalLink = normalizeInternalLink(notification?.link);
  const category = String(notification?.category || '').toLowerCase();
  return (
    category === 'subscription' ||
    category === 'billing' ||
    category === 'subscription_billing' ||
    internalLink.startsWith('settings')
  );
}

function getNotificationPreviewBadge(notification: AppNotification | null | undefined, language: AppLanguage) {
  if (isSaleNotification(notification)) {
    return language === 'es' ? 'Venta registrada' : 'Sale notification';
  }

  if (isProductNotification(notification)) return language === 'es' ? 'Inventario' : 'Inventory';
  if (isSupportNotification(notification)) return language === 'es' ? 'Soporte' : 'Support';
  if (isUserNotification(notification)) return language === 'es' ? 'Usuarios' : 'Users';
  if (isBillingNotification(notification)) return language === 'es' ? 'Suscripción' : 'Subscription';

  return language === 'es' ? 'Notificación' : 'Notification';
}

function getNotificationPreviewAction(notification: AppNotification | null | undefined, language: AppLanguage) {
  if (isSaleNotification(notification)) {
    return language === 'es' ? 'Ver venta' : 'View sale';
  }

  if (isProductNotification(notification)) return language === 'es' ? 'Ver producto' : 'View product';
  if (isSupportNotification(notification)) return language === 'es' ? 'Ver ticket' : 'View ticket';
  if (isUserNotification(notification)) return language === 'es' ? 'Ver usuarios' : 'View users';
  if (isBillingNotification(notification)) return language === 'es' ? 'Ver facturación' : 'View billing';

  return language === 'es' ? 'Ver detalles' : 'View details';
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

function formatTicketTime(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatPlanLabel(plan: string | null | undefined) {
  const normalizedPlan = String(plan || '').trim().toLowerCase();
  if (!normalizedPlan || normalizedPlan === 'trial' || normalizedPlan === 'basic') return 'Basic';
  return normalizedPlan.charAt(0).toUpperCase() + normalizedPlan.slice(1);
}

export default function Sidebar({
  currentPage,
  onNavigate,
  isOpen = true,
  onClose,
  businessName = 'MatMax Business Suite',
  plan = 'Basic',
  userEmail,
  onLogout,
  isSuperAdmin = false,
  canManageUsers = false,
  userRole = null,
  language: externalLanguage,
  onToggleLanguage
}: SidebarProps) {
  const roleFlags = getUserRoleFlags({ rol: userRole });
  const planLabel = formatPlanLabel(plan);
  const isOwner = roleFlags.isOwner;
  const isSeller = roleFlags.isSeller;
  const effectiveIsSuperAdmin = isSuperAdmin || roleFlags.isSuperAdmin;
  const effectiveCanManageUsers = canManageUsers || roleFlags.canManageUsers || effectiveIsSuperAdmin;
  const canAccessSettings = roleFlags.canAccessSettings || effectiveIsSuperAdmin;

  const [internalLanguage, setInternalLanguage] = useState<AppLanguage>(() => getSavedLanguage());
  const language = externalLanguage || internalLanguage;
  const [viewportWidth, setViewportWidth] = useState(0);
  const [isLargeViewport, setIsLargeViewport] = useState(false);
  const t = sidebarCopy[language];
  const { notifications, unreadCount, markNotificationRead } = useNotification();
  const [isNotificationPopupOpen, setIsNotificationPopupOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [isTicketModalVisible, setIsTicketModalVisible] = useState(false);
  const [ticketModalLoading, setTicketModalLoading] = useState(false);
  const [ticketModalError, setTicketModalError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketDetail | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const notificationPreview = notifications.find((notification) => !notification.read) || notifications[0] || null;
  const notificationPopupLeft = viewportWidth >= 1024
    ? viewportWidth >= 1800
      ? 354
      : viewportWidth >= 1600
        ? 344
        : viewportWidth >= 1440
          ? 329
          : 316
    : 16;

  const visibleNavigationItems = useMemo(() => {
    if (effectiveIsSuperAdmin) {
      return superAdminNavigationItems.filter((item) => {
        if (item.id === 'settings') {
          return canAccessSettings;
        }

        if (item.id === 'users') {
          return effectiveCanManageUsers;
        }

        if (item.id === 'audit-logs') {
          return roleFlags.canViewAuditLogs || effectiveIsSuperAdmin;
        }

        if (item.id === 'support-tickets') {
          return effectiveIsSuperAdmin;
        }

        return true;
      });
    }

    return navigationItems.filter((item) => {
      if (item.id === 'settings') {
        return canAccessSettings;
      }

      if (item.id === 'superadmin') {
        return false;
      }

      if (isSeller && (item.id === 'purchases' || item.id === 'invoices' || item.id === 'reports' || item.id === 'accounts-receivable')) {
        return false;
      }

      if (item.id === 'users') {
        return effectiveCanManageUsers;
      }

      if (item.id === 'audit-logs') {
        return isOwner;
      }

      return true;
    });
  }, [canAccessSettings, effectiveCanManageUsers, isOwner, isSeller, effectiveIsSuperAdmin, roleFlags.canViewAuditLogs]);

  const navigationCopy = effectiveIsSuperAdmin ? t.superAdminNavigation : t.navigation;
  const sidebarBusinessLabel = effectiveIsSuperAdmin
    ? language === 'es'
      ? 'Plataforma activa'
      : 'Active platform'
    : t.activeBusiness;
  const sidebarBusinessDescription = effectiveIsSuperAdmin
    ? t.platformDescription
    : t.description;
  const sidebarAccountLabel = effectiveIsSuperAdmin
    ? language === 'es'
      ? 'Cuenta de plataforma'
      : 'Platform account'
    : t.businessAccount;

  const isElasticOpen = true;
  const isPreparingStretch = false;

  const sidebarWidth = viewportWidth >= 1800
    ? 'w-[330px]'
    : viewportWidth >= 1600
      ? 'w-[320px]'
      : viewportWidth >= 1440
        ? 'w-[305px]'
        : 'w-[292px]';

  const elasticSidebarMinHeight = '100dvh';

  function toggleLanguage() {
    if (onToggleLanguage) {
      onToggleLanguage();
      return;
    }

    setInternalLanguage((currentLanguage) => {
      const nextLanguage = currentLanguage === 'es' ? 'en' : 'es';

      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
      window.dispatchEvent(
        new CustomEvent<AppLanguage>(LANGUAGE_CHANGE_EVENT, {
          detail: nextLanguage,
        })
      );

      return nextLanguage;
    });
  }

  useEffect(() => {
    function handleLanguageChange(event: Event) {
      const customEvent = event as CustomEvent<AppLanguage>;
      const nextLanguage = customEvent.detail === 'en' ? 'en' : 'es';
      setInternalLanguage(nextLanguage);
    }

    function handleStorageChange(event: StorageEvent) {
      if (event.key !== LANGUAGE_STORAGE_KEY) return;
      setInternalLanguage(event.newValue === 'en' ? 'en' : 'es');
    }

    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function updateViewportMode() {
      const width = window.innerWidth;
      setViewportWidth(width);
      setIsLargeViewport(width >= 1600);
    }

    updateViewportMode();
    window.addEventListener('resize', updateViewportMode);

    return () => {
      window.removeEventListener('resize', updateViewportMode);
    };
  }, []);

  function handleNavigate(page: AppPage) {
    onNavigate(page);
    window.dispatchEvent(
      new CustomEvent('matmax_navigate', {
        detail: page
      })
    );
    onClose?.();
  }

  async function openNotificationTicket(notification: AppNotification) {
    markNotificationRead(notification.id);

    const internalLink = normalizeInternalLink(notification.link);

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
      } else {
        window.dispatchEvent(
          new CustomEvent('matmax_navigate', {
            detail: 'invoices'
          })
        );
      }

      setIsNotificationPopupOpen(false);
      return;
    }

    const supportTicketId = internalLink ? getSupportTicketIdFromLink(internalLink) : null;

    if (!isSupportNotification(notification)) {
      if (internalLink) {
        handleNavigate(internalLink as AppPage);
      }
      setIsNotificationPopupOpen(false);
      return;
    }

    setIsTicketModalVisible(false);
    setTicketModalOpen(true);
    setSelectedNotification(notification);
    setSelectedTicket(null);
    setTicketModalError('');
    setIsNotificationPopupOpen(false);

    window.requestAnimationFrame(() => {
      setIsTicketModalVisible(true);
    });

    if (!supportTicketId) {
      setTicketModalError(language === 'es' ? 'Esta notificación no incluye un ID de ticket. Las nuevas notificaciones de soporte abrirán el ticket exacto automáticamente.' : 'This notification does not include a ticket ID. New support notifications will open the exact ticket automatically.');
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
        setTicketModalError(language === 'es' ? 'Ticket no encontrado o no tienes permiso para verlo.' : 'Ticket not found or you do not have permission to view it.');
        return;
      }

      setSelectedTicket(data as SupportTicketDetail);
    } catch (error) {
      console.error('Error loading support ticket from sidebar notification:', error);
      setTicketModalError(language === 'es' ? 'No se pudieron cargar los detalles del ticket.' : 'Could not load the ticket details.');
    } finally {
      setTicketModalLoading(false);
    }
  }

  function closeTicketModal() {
    setIsTicketModalVisible(false);

    window.setTimeout(() => {
      setTicketModalOpen(false);
      setSelectedTicket(null);
      setSelectedNotification(null);
      setTicketModalError('');
    }, 220);
  }

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label={t.closeMenu}
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#050505]/58 backdrop-blur-md lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-[100dvh] max-w-[92vw] transform overflow-hidden border-r border-[#ece5d7] bg-[#fbfaf7]/92 shadow-[0_30px_90px_rgba(0,0,0,0.14)] backdrop-blur-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:static lg:h-auto lg:translate-x-0 lg:overflow-visible lg:shadow-none ${sidebarWidth} ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ minHeight: elasticSidebarMinHeight }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,197,66,0.12),transparent_38%)]" />

        <div className="relative z-10 flex h-[100dvh] min-h-0 flex-col lg:h-auto">
          <div className={`flex items-center justify-between gap-3 border-b border-[#ece5d7] bg-white/45 px-4 backdrop-blur-xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] sm:px-5 ${isElasticOpen ? 'py-4 sm:py-5' : 'py-4 sm:py-5'}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1b1b1b] bg-[#050505] text-[#f4c542] shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                <Building2 size={24} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-black text-[#050505]">MatMax</h1>
                <p className="truncate text-xs font-bold uppercase tracking-[0.2em] text-[#8a6a16]">
                  Business Suite
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-2xl border border-[#ece5d7] bg-white/85 p-2 text-[#71717a] shadow-sm backdrop-blur-xl transition hover:border-[#f4c542]/40 hover:bg-[#fff9e8] hover:text-[#050505] lg:hidden"
              aria-label={t.closeSidebar}
            >
              <X size={20} />
            </button>
          </div>

          <div className={`px-4 transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:px-5 ${isElasticOpen ? 'py-3.5 sm:py-4' : isPreparingStretch ? 'py-3 sm:py-3.5' : 'py-3.5 sm:py-4'}`}>
            <div className={`rounded-[1.7rem] border border-[#ece5d7] bg-white/78 shadow-[0_18px_48px_rgba(15,15,15,0.06)] backdrop-blur-xl transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${isElasticOpen ? 'p-3.5' : isPreparingStretch ? 'p-3' : 'p-3.5'}`}>
              <p className="mb-1 text-xs font-black uppercase tracking-[0.22em] text-[#8a6a16]">
                {sidebarBusinessLabel}
              </p>
              <h2 className="truncate text-base font-black text-[#050505]">
                {effectiveIsSuperAdmin ? 'MatMax SaaS Control Center' : businessName}
              </h2>
              {(isElasticOpen || (!isPreparingStretch && isLargeViewport)) && (
                <p className="mt-2 line-clamp-2 text-xs font-semibold leading-relaxed text-[#71717a]">
                  {sidebarBusinessDescription}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-[#fff4c7] px-3 py-1 text-xs font-black text-[#5f4700] shadow-sm">
                  <CreditCard className="shrink-0" size={13} />
                  {planLabel}
                </span>
                <span className="rounded-full bg-[#050505] px-3 py-1 text-xs font-black text-[#f4c542]">
                  {t.active}
                </span>

                <button
                  type="button"
                  onClick={() => setIsNotificationPopupOpen((current) => !current)}
                  className="relative inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-[#ece5d7] bg-white/90 px-2 text-xs font-black text-[#8a6a16] shadow-sm transition hover:border-[#f4c542]/50 hover:bg-[#fff9e8] hover:text-[#050505]"
                  aria-label={`${unreadCount} ${t.unreadNotifications}`}
                  title={t.notifications}
                >
                  <Bell className="h-3.5 w-3.5 shrink-0" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#050505] bg-[#f4c542] px-1 text-[10px] font-black leading-none text-[#050505] shadow-[0_8px_18px_rgba(244,197,66,0.28)]">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('matmax_lock_screen'))}
                  className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-[#ece5d7] bg-white/90 px-2 text-xs font-black text-[#8a6a16] shadow-sm transition hover:border-[#f4c542]/50 hover:bg-[#fff9e8] hover:text-[#050505]"
                  aria-label={t.lockScreen}
                  title={t.lockScreen}
                >
                  <LockKeyhole className="h-3.5 w-3.5 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="rounded-full border border-[#ece5d7] bg-white/90 px-3 py-1 text-xs font-black text-[#8a6a16] shadow-sm transition hover:border-[#f4c542]/50 hover:bg-[#fff9e8] hover:text-[#050505]"
                  aria-label={t.switchLanguage}
                  title={t.switchLanguage}
                >
                  {t.languageButton}
                </button>
              </div>
            </div>
          </div>

          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 pb-4 scrollbar-hide lg:flex-none lg:overflow-visible">
            {visibleNavigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                const itemCopy = navigationCopy[item.id as keyof typeof navigationCopy];
                if (!itemCopy) return null;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`group relative flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-2xl px-3 text-left transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:px-4 ${isElasticOpen ? 'py-2.5' : isPreparingStretch ? 'py-1.5' : 'py-2.5'} ${
                    isActive
                      ? 'bg-[#050505] text-white shadow-[0_18px_40px_rgba(0,0,0,0.24)]'
                      : 'text-[#52525b] hover:bg-white/90 hover:text-[#050505] hover:shadow-[0_16px_36px_rgba(15,15,15,0.06)]'
                  }`}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.08),transparent_42%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <span
                    className={`relative z-10 flex items-center justify-center rounded-xl transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${isElasticOpen ? 'h-9 w-9' : isPreparingStretch ? 'h-8 w-8' : 'h-9 w-9'} ${
                      isActive
                        ? 'bg-[#f4c542] text-[#050505]'
                        : 'bg-[#f6f4ee] text-[#71717a] group-hover:bg-[#fff4c7] group-hover:text-[#8a6a16] group-hover:shadow-[0_10px_24px_rgba(244,197,66,0.18)]'
                    }`}
                  >
                    <Icon size={isElasticOpen ? 19 : 19} />
                  </span>
                  <span className="relative z-10 min-w-0 flex-1">
                    <span className={`${isElasticOpen || isPreparingStretch || isLargeViewport ? 'text-[15px]' : 'text-sm'} block truncate font-black transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]`}>{itemCopy.label}</span>
                    <span
                      className={`block text-xs font-medium transition-all duration-500 ${
                        isElasticOpen || isPreparingStretch || isLargeViewport ? 'mt-0.5 max-h-8 opacity-100' : 'max-h-4 truncate opacity-85'
                      } ${
                        isActive ? 'text-white/55' : 'text-[#a1a1aa] group-hover:text-[#8a6a16]'
                      }`}
                    >
                      {itemCopy.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto shrink-0 overflow-hidden border-t border-[#ece5d7] bg-white/30 p-3 backdrop-blur-xl sm:p-3.5">
            <div className={`rounded-[1.7rem] border border-[#1b1b1b] bg-[#050505] text-white shadow-[0_24px_70px_rgba(0,0,0,0.34)] transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${isElasticOpen ? 'p-3.5' : isPreparingStretch ? 'p-3' : 'p-3.5'}`}>
              <div className={`${isElasticOpen ? 'mb-3' : 'mb-3'} flex min-w-0 items-center gap-3 transition-all duration-[900ms]`}>
                <div className={`${isElasticOpen ? 'h-10 w-10 rounded-2xl' : 'h-10 w-10 rounded-2xl'} flex items-center justify-center bg-[#f4c542] text-[#050505] transition-all duration-[900ms]`}>
                  <Receipt size={20} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{t.tagline}</p>
                  <p className="truncate text-xs font-medium text-white/45">
                    {userEmail ? formatEmail(userEmail) : sidebarAccountLabel}
                  </p>
                </div>
              </div>

              <p className="line-clamp-2 text-xs leading-relaxed text-white/55 xl:line-clamp-3">
                {sidebarBusinessDescription}
              </p>

              <button
                type="button"
                onClick={onLogout}
                className={`${isElasticOpen ? 'mt-3.5 py-2.5' : isPreparingStretch ? 'mt-3 py-2.5' : 'mt-3.5 py-2.5'} flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-black text-white backdrop-blur-xl transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-[#f4c542] hover:text-[#050505] hover:shadow-[0_18px_40px_rgba(244,197,66,0.24)]`}
              >
                <LogOut className="shrink-0" size={17} />
                {t.logout}
              </button>
            </div>
          </div>
        </div>
      </aside>
      {isNotificationPopupOpen && notificationPreview && (
        <div
          className="fixed top-24 z-[110] max-h-[calc(100dvh-7rem)] w-[min(390px,calc(100vw-2rem))] overflow-y-auto rounded-[1.35rem] border border-[#e9e2d3] bg-white shadow-[0_24px_70px_rgba(0,0,0,0.18)] max-lg:left-4 max-lg:right-4 max-lg:top-24 max-lg:w-auto lg:top-[170px]"
          style={{ left: notificationPopupLeft }}
        >
          <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
            <div className="min-w-0">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[#8a6a16]">
                {language === 'es' ? 'Notificación' : 'Notification'}
              </p>
              <span className="inline-flex max-w-full rounded-lg bg-[#f4f1ff] px-3 py-1 text-xs font-black text-[#6d5aa8]">
                {getNotificationPreviewBadge(notificationPreview, language)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsNotificationPopupOpen(false)}
              className="shrink-0 rounded-full p-1.5 text-[#050505] transition hover:bg-[#fbfaf7]"
              aria-label="Close notification preview"
            >
              <X size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => openNotificationTicket(notificationPreview)}
            className="flex w-full min-w-0 flex-col px-5 pb-5 text-left transition hover:bg-[#fbfaf7]"
          >
            <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
              <p className="min-w-0 text-base font-black leading-snug text-[#050505]">
                {notificationPreview.message}
              </p>
              {!notificationPreview.read && (
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#6d5aa8]" />
              )}
            </div>

            <p className="mb-2 text-sm font-semibold text-[#050505]">
              From: SuperAdmin
            </p>

            <div className="rounded-xl bg-[#f6f3fb] p-4 text-sm font-semibold leading-relaxed text-[#52525b]">
              {notificationPreview.title}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <span className="inline-flex items-center justify-center rounded-xl border border-[#e9e2d3] bg-white px-4 py-3 text-sm font-black text-[#050505]">
                {language === 'es' ? 'Marcar como leída' : 'Mark as read'}
              </span>
              <span className="inline-flex items-center justify-center rounded-xl bg-[#f4c542] px-4 py-3 text-sm font-black text-[#050505] shadow-[0_14px_30px_rgba(244,197,66,0.22)]">
                {getNotificationPreviewAction(notificationPreview, language)}
              </span>
            </div>
          </button>
        </div>
      )}
      {ticketModalOpen && (
        <div
          className={`fixed inset-0 z-[120] flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isTicketModalVisible ? 'bg-black/40 opacity-100' : 'bg-black/0 opacity-0'
          }`}
        >
          <div
            className={`max-h-[90vh] w-full max-w-2xl transform-gpu overflow-hidden rounded-[2rem] border border-[#e9e2d3] bg-white shadow-[0_28px_90px_rgba(0,0,0,0.25)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${
              isTicketModalVisible
                ? 'translate-y-0 scale-100 opacity-100 blur-0'
                : 'translate-y-5 scale-[0.985] opacity-0 blur-[1px] sm:translate-y-7 sm:scale-[0.975]'
            }`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#e9e2d3] bg-[#fffdf8] p-5">
              <div className="min-w-0">
                <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-[#8a6a16]">
                  {language === 'es' ? 'Ticket de soporte' : 'Support Ticket'}
                </p>
                <h3 className="break-words text-xl font-black text-[#050505]">
                  {selectedTicket?.subject || selectedNotification?.title || (language === 'es' ? 'Notificación de soporte' : 'Support notification')}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeTicketModal}
                className="shrink-0 rounded-2xl border border-[#e9e2d3] bg-white px-4 py-2 text-sm font-black text-[#050505] transition hover:bg-[#fbfaf7]"
              >
                {language === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              {ticketModalLoading ? (
                <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4 text-sm font-bold text-[#71717a]">
                  {language === 'es' ? 'Cargando detalles del ticket...' : 'Loading ticket details...'}
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
                      {selectedTicket.category || (language === 'es' ? 'Soporte' : 'Support')}
                    </span>
                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                      {selectedTicket.status || 'open'}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4">
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[#8a6a16]">
                      {language === 'es' ? 'Mensaje original' : 'Original message'}
                    </p>
                    <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-[#3f3f46]">
                      {selectedTicket.message}
                    </p>
                    <p className="mt-3 text-xs font-bold text-[#a1a1aa]">
                      {language === 'es' ? 'Creado' : 'Created'}: {formatTicketTime(selectedTicket.created_at)}
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
                        {language === 'es' ? 'Última respuesta de soporte' : 'Latest support response'}
                      </p>
                      <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-green-900">
                        {selectedTicket.response}
                      </p>
                      {selectedTicket.responded_at && (
                        <p className="mt-3 text-xs font-bold text-green-700/70">
                          {language === 'es' ? 'Respondido' : 'Responded'}: {formatTicketTime(selectedTicket.responded_at)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[#e9e2d3] bg-white p-4 text-sm font-bold text-[#71717a]">
                      {language === 'es' ? 'Aún no hay respuesta de soporte.' : 'No support response yet.'}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
