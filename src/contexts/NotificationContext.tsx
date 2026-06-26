/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect
} from 'react';
import { Toast, ToastType } from '../components/ui/Toast';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getUserRoleFlags } from '../utils/roles';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export type AppNotificationType = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: AppNotificationType;
  read: boolean;
  createdAt: string;
  link?: string;
  category?: string;
}

type NotificationRow = {
  id?: unknown;
  title?: unknown;
  message?: unknown;
  type?: unknown;
  read?: unknown;
  created_at?: unknown;
  link?: unknown;
  category?: unknown;
  audience?: unknown;
  user_id?: unknown;
  negocio_id?: unknown;
};

type NotificationProfile = {
  rol?: unknown;
  role?: unknown;
  tipo?: unknown;
  negocio_id?: unknown;
} | null | undefined;

const DEFAULT_NOTIFICATION_SETTINGS = {
  support_notifications: true,
  sales_notifications: true,
  inventory_notifications: true,
  low_stock_notifications: true,
  accounts_receivable_notifications: true,
  subscription_notifications: true
};

function getNotificationPreferenceKey(item: NotificationRow): keyof typeof DEFAULT_NOTIFICATION_SETTINGS | null {
  const category = String(item?.category || '').toLowerCase();
  const link = String(item?.link || '').toLowerCase();
  const title = String(item?.title || '').toLowerCase();
  const message = String(item?.message || '').toLowerCase();
  const text = `${category} ${link} ${title} ${message}`;

  if (
    category === 'support' ||
    category === 'support_ticket' ||
    category === 'support_tickets' ||
    link.startsWith('support') ||
    link.startsWith('support-tickets') ||
    text.includes('support ticket') ||
    text.includes('ticket de soporte')
  ) {
    return 'support_notifications';
  }

  if (
    category === 'sales' ||
    category === 'sale' ||
    category === 'ventas' ||
    link.startsWith('sales') ||
    text.includes('sale') ||
    text.includes('venta')
  ) {
    return 'sales_notifications';
  }

  if (
    category === 'products' ||
    category === 'product' ||
    category === 'productos' ||
    category === 'inventory' ||
    category === 'inventario' ||
    link.startsWith('products') ||
    link.startsWith('inventory') ||
    text.includes('product') ||
    text.includes('producto') ||
    text.includes('price') ||
    text.includes('precio') ||
    text.includes('inventory') ||
    text.includes('inventario')
  ) {
    return 'inventory_notifications';
  }

  if (
    category === 'low_stock' ||
    category === 'stock_bajo' ||
    text.includes('low stock') ||
    text.includes('stock bajo')
  ) {
    return 'low_stock_notifications';
  }

  if (
    category === 'accounts_receivable' ||
    category === 'accounts-receivable' ||
    category === 'cuentas_por_cobrar' ||
    link.startsWith('accounts-receivable') ||
    text.includes('accounts receivable') ||
    text.includes('cuentas por cobrar') ||
    text.includes('debt') ||
    text.includes('deuda')
  ) {
    return 'accounts_receivable_notifications';
  }

  if (
    category === 'subscription' ||
    category === 'billing' ||
    category === 'subscription_billing' ||
    category === 'suscripcion' ||
    link.startsWith('settings') ||
    text.includes('subscription') ||
    text.includes('billing') ||
    text.includes('suscripción') ||
    text.includes('facturación') ||
    text.includes('stripe') ||
    text.includes('trial')
  ) {
    return 'subscription_notifications';
  }

  return null;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface NotificationContextType {
  showToast: (message: string, type: ToastType) => void;
  showNotification: (message: string, type: ToastType) => void;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  notifications: AppNotification[];
  unreadCount: number;
  pushNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const MAX_TOASTS = 4;
const MAX_NOTIFICATIONS = 50;

function normalizeNotificationItem(item: NotificationRow): AppNotification {
  return {
    id: String(item.id),
    title: String(item.title || ''),
    message: String(item.message || ''),
    type: (String(item.type || 'info')) as AppNotificationType,
    read: Boolean(item.read),
    createdAt: item.created_at ? String(item.created_at) : new Date().toISOString(),
    link: item.link ? String(item.link) : undefined,
    category: item.category ? String(item.category) : undefined
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<Record<string, boolean>>({});

  const { user, userProfile } = useAuth();
  const roleFlags = getUserRoleFlags(userProfile);
  const profile = userProfile as NotificationProfile;
  const normalizedProfileRole = String(profile?.rol || profile?.role || profile?.tipo || '').trim().toLowerCase();
  const isSuperAdmin =
    roleFlags.isSuperAdmin ||
    normalizedProfileRole === 'superadmin' ||
    normalizedProfileRole === 'super_admin' ||
    normalizedProfileRole === 'super-admin';

  const canSeeAdminNotifications =
    roleFlags.isOwner ||
    roleFlags.isAdmin ||
    normalizedProfileRole === 'owner' ||
    normalizedProfileRole === 'admin' ||
    normalizedProfileRole === 'administrator' ||
    normalizedProfileRole === 'administrador';

  const canSeeSalesTeamNotifications =
    roleFlags.isOwner ||
    roleFlags.isAdmin ||
    roleFlags.isSeller ||
    normalizedProfileRole === 'owner' ||
    normalizedProfileRole === 'admin' ||
    normalizedProfileRole === 'administrator' ||
    normalizedProfileRole === 'administrador' ||
    normalizedProfileRole === 'seller' ||
    normalizedProfileRole === 'vendedor' ||
    normalizedProfileRole === 'sales' ||
    normalizedProfileRole === 'sales_team' ||
    normalizedProfileRole === 'sales-team' ||
    normalizedProfileRole === 'ventas';

  const negocioId = String(profile?.negocio_id || '');

  const notificationsEnabled = useCallback(
    (key: keyof typeof DEFAULT_NOTIFICATION_SETTINGS) => {
      const value = notificationSettings[key];
      return value === undefined ? true : value;
    },
    [notificationSettings]
  );

  const isNotificationEnabledBySettings = useCallback(
    (item: NotificationRow, settings: Record<string, boolean> = notificationSettings) => {
      const preferenceKey = getNotificationPreferenceKey(item);

      if (!preferenceKey) return true;

      const value = settings[preferenceKey];
      return value === undefined ? true : value;
    },
    [notificationSettings]
  );

  const canSeeNotification = useCallback(
    (item: NotificationRow) => {
      const audience = String(item?.audience || '').toLowerCase();
      const notificationUserId = item?.user_id ? String(item.user_id) : '';
      const notificationNegocioId = item?.negocio_id ? String(item.negocio_id) : '';

      if (isSuperAdmin) {
        if (notificationUserId && notificationUserId !== user?.id) return false;
        if (audience === 'user' && notificationUserId !== user?.id) return false;

        return (
          audience === 'admin' ||
          audience === 'sales_team' ||
          audience === 'sales-team' ||
          audience === 'sales team' ||
          audience === 'seller' ||
          audience === 'vendedor' ||
          audience === 'superadmin' ||
          audience === 'super_admin' ||
          audience === 'platform' ||
          notificationUserId === user?.id
        );
      }

      if (notificationUserId) {
        return notificationUserId === user?.id;
      }

      if (audience === 'admin') {
        if (!canSeeAdminNotifications) return false;
        if (!notificationNegocioId || !negocioId) return false;
        return notificationNegocioId === negocioId;
      }

      if (
        audience === 'sales_team' ||
        audience === 'sales-team' ||
        audience === 'sales team' ||
        audience === 'seller' ||
        audience === 'vendedor'
      ) {
        if (!canSeeSalesTeamNotifications) return false;
        if (!notificationNegocioId || !negocioId) return false;

        return notificationNegocioId === negocioId;
      }

      if (
        audience === 'user' ||
        audience === 'superadmin' ||
        audience === 'super_admin' ||
        audience === 'platform'
      ) {
        return false;
      }

      if (!isNotificationEnabledBySettings(item)) {
        return false;
      }

      if (notificationNegocioId && negocioId) {
        return notificationNegocioId === negocioId;
      }

      return true;
    },
    [
      isSuperAdmin,
      canSeeAdminNotifications,
      canSeeSalesTeamNotifications,
      negocioId,
      user?.id,
      isNotificationEnabledBySettings
    ]
  );

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      return next.slice(-MAX_TOASTS);
    });
  }, []);
  const showNotification = showToast;

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    function handleNotificationSettingsUpdated(event: Event) {
      const detail = (event as CustomEvent<Record<string, boolean>>).detail || {};

      setNotificationSettings({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...detail
      });
    }

    window.addEventListener('matmax:notification-settings-updated', handleNotificationSettingsUpdated);

    return () => {
      window.removeEventListener('matmax:notification-settings-updated', handleNotificationSettingsUpdated);
    };
  }, []);


  useEffect(() => {
    let mounted = true;

    async function loadNotificationSettings() {
      if (!user?.id) {
        setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
        return DEFAULT_NOTIFICATION_SETTINGS;
      }

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading notification settings:', error);
        setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
        return DEFAULT_NOTIFICATION_SETTINGS;
      }

      if (!data) {
        setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
        return DEFAULT_NOTIFICATION_SETTINGS;
      }

      const loadedSettings = {
        support_notifications: Boolean(data.support_notifications ?? true),
        sales_notifications: Boolean(data.sales_notifications ?? true),
        inventory_notifications: Boolean(data.inventory_notifications ?? true),
        low_stock_notifications: Boolean(data.low_stock_notifications ?? true),
        accounts_receivable_notifications: Boolean(data.accounts_receivable_notifications ?? true),
        subscription_notifications: Boolean(data.subscription_notifications ?? true)
      };

      setNotificationSettings(loadedSettings);
      return loadedSettings;
    }

    async function loadNotifications(settingsOverride: Record<string, boolean>) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_NOTIFICATIONS);

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      if (!mounted) return;

      setNotifications(
        (data || [])
          .filter((item: NotificationRow) => canSeeNotification(item) && isNotificationEnabledBySettings(item, settingsOverride))
          .map(normalizeNotificationItem)
      );
    }

    async function initializeNotifications() {
      const loadedSettings = await loadNotificationSettings();
      await loadNotifications(loadedSettings);
    }

    initializeNotifications();

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const item = payload.new as NotificationRow;

          if (!canSeeNotification(item) || !isNotificationEnabledBySettings(item)) return;

          setNotifications((prev) => [
            normalizeNotificationItem(item),
            ...prev
          ].slice(0, MAX_NOTIFICATIONS));

          showToast(String(item.title || 'New notification'), String(item.type || 'info') as ToastType);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [showToast, canSeeNotification, isNotificationEnabledBySettings, user?.id]);

  useEffect(() => {
    let mounted = true;

    async function reloadNotificationsFromSettings() {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_NOTIFICATIONS);

      if (error) {
        console.error('Error reloading notifications:', error);
        return;
      }

      if (!mounted) return;

      setNotifications(
        (data || [])
          .filter((item: NotificationRow) => canSeeNotification(item) && isNotificationEnabledBySettings(item))
          .map(normalizeNotificationItem)
      );
    }

    reloadNotificationsFromSettings();

    return () => {
      mounted = false;
    };
  }, [notificationSettings, canSeeNotification, isNotificationEnabledBySettings]);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: { title: '', message: '' },
    resolve: null
  });

  const pushNotification = useCallback((notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
    const preferenceKey = getNotificationPreferenceKey(notification);

    if (preferenceKey && !notificationsEnabled(preferenceKey)) {
      return;
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    setNotifications((prev) => {
      const next: AppNotification[] = [
        {
          ...notification,
          id,
          read: false,
          createdAt: new Date().toISOString()
        },
        ...prev
      ];

      return next.slice(0, MAX_NOTIFICATIONS);
    });

    showToast(notification.title, notification.type);
  }, [showToast, notificationsEnabled]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );

    supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Error marking notification as read:', error);
        }
      });
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    const unreadIds = notifications
      .filter((notification) => !notification.read)
      .map((notification) => notification.id);

    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    );

    if (unreadIds.length === 0) return;

    supabase
      .from('notifications')
      .update({ read: true })
      .in('id', unreadIds)
      .then(({ error }) => {
        if (error) {
          console.error('Error marking all notifications as read:', error);
        }
      });
  }, [notifications]);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));

    supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Error deleting notification:', error);
        }
      });
  }, []);

  const clearAllNotifications = useCallback(() => {
    const ids = notifications.map((notification) => notification.id);

    setNotifications([]);

    if (ids.length === 0) return;

    supabase
      .from('notifications')
      .delete()
      .in('id', ids)
      .then(({ error }) => {
        if (error) {
          console.error('Error clearing notifications:', error);
        }
      });
  }, [notifications]);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(true);
    }

    setConfirmState({
      isOpen: false,
      options: { title: '', message: '' },
      resolve: null
    });
  }, [confirmState]);

  const handleCancel = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(false);
    }

    setConfirmState({
      isOpen: false,
      options: { title: '', message: '' },
      resolve: null
    });
  }, [confirmState]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <NotificationContext.Provider
      value={{
        showToast,
        showNotification,
        showConfirm,
        notifications,
        unreadCount,
        pushNotification,
        markNotificationRead,
        markAllNotificationsRead,
        clearNotification,
        clearAllNotifications
      }}
    >
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-full max-w-[420px] flex-col gap-3 px-2 sm:right-5 sm:top-5 sm:px-0">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className="pointer-events-auto transition-all duration-300"
            style={{
              transform: `translateY(${index * 2}px) scale(${1 - index * 0.015})`,
              opacity: 1 - index * 0.06
            }}
          >
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.options.title}
        message={confirmState.options.message}
        confirmText={confirmState.options.confirmText}
        cancelText={confirmState.options.cancelText}
        variant={confirmState.options.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }

  return context;
}
