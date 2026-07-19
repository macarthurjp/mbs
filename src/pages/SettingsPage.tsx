import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Package,
  AlertTriangle,
  Bell,
  Shield,
  Building2,
  Save,
  Pencil,
  X,
  Upload,
  Trash2,
  CreditCard,
  ExternalLink,
  RefreshCcw,
  Database,
  Download
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getUserRoleFlags } from '../utils/roles';
import { logAudit } from '../utils/audit';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { getEffectivePlan, normalizeSubscriptionStatus } from '../utils/subscriptionPlan';
import {
  DEFAULT_PHONE_INPUT_VALUE,
  normalizePhoneForStorage,
  sanitizePhoneInput
} from '../utils/formatContact';

type Negocio = {
  id: string;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  email: string | null;
  website: string | null;
  tax_id: string | null;
  timezone: string | null;
  moneda: string | null;
  moneda_secundaria: string | null;
  tasa_cambio: number | null;
  tasa_actualizada_en: string | null;
  logo_url: string | null;
  estado: string | null;
  plan: string | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  seller_discount_limit: number | null;
  email_alias?: string | null;
  email_from_name?: string | null;
  email_reply_to?: string | null;
};

type NotificationSettings = {
  id?: string;
  user_id: string;
  support_notifications: boolean;
  sales_notifications: boolean;
  inventory_notifications: boolean;
  low_stock_notifications: boolean;
  accounts_receivable_notifications: boolean;
  subscription_notifications: boolean;
};

type BackupRow = Record<string, unknown>;

type BackupTableExport = {
  label: string;
  fileName: string;
  rows: BackupRow[];
  count: number;
  skipped?: boolean;
  error?: string;
};

type BusinessBackupTable = {
  table: string;
  fileName: string;
  label: string;
  field: string;
};

type PlatformBackupRecord = {
  id: string;
  created_at: string;
  file_name: string;
  size_bytes: number | null;
  storage_bucket: string | null;
  storage_path: string | null;
  status: string | null;
  error: string | null;
};

const BUSINESS_BACKUP_TABLES: BusinessBackupTable[] = [
  { table: 'clientes', fileName: 'clientes.json', label: 'Clientes', field: 'negocio_id' },
  { table: 'ventas', fileName: 'ventas.json', label: 'Ventas', field: 'negocio_id' },
  { table: 'pagos', fileName: 'pagos.json', label: 'Pagos', field: 'negocio_id' },
  { table: 'cotizaciones', fileName: 'cotizaciones.json', label: 'Cotizaciones', field: 'negocio_id' },
  { table: 'usuarios', fileName: 'usuarios.json', label: 'Usuarios', field: 'negocio_id' },
  { table: 'suscripciones', fileName: 'suscripciones.json', label: 'Suscripciones', field: 'negocio_id' },
  { table: 'notifications', fileName: 'notificaciones.json', label: 'Notificaciones', field: 'negocio_id' },
  { table: 'support_tickets', fileName: 'tickets_soporte.json', label: 'Tickets de soporte', field: 'negocio_id' },
  { table: 'cashbox_closures', fileName: 'cierres_caja.json', label: 'Cierres de caja', field: 'negocio_id' },
  { table: 'inventory_transformations', fileName: 'transformaciones_inventario.json', label: 'Transformaciones de inventario', field: 'negocio_id' },
  { table: 'sale_returns', fileName: 'devoluciones_ventas.json', label: 'Devoluciones de ventas', field: 'negocio_id' },
  { table: 'sale_return_items', fileName: 'items_devoluciones_ventas.json', label: 'Items de devoluciones', field: 'negocio_id' },
  { table: 'audit_logs', fileName: 'auditoria.json', label: 'Auditoria', field: 'negocio_id' }
];

const PLATFORM_BACKUP_TABLES: Omit<BusinessBackupTable, 'field'>[] = [
  { table: 'negocios', fileName: 'negocios.json', label: 'Negocios' },
  { table: 'usuarios', fileName: 'usuarios.json', label: 'Usuarios' },
  { table: 'clientes', fileName: 'clientes.json', label: 'Clientes' },
  { table: 'ventas', fileName: 'ventas.json', label: 'Ventas' },
  { table: 'venta_items', fileName: 'venta_items.json', label: 'Items de ventas' },
  { table: 'pagos', fileName: 'pagos.json', label: 'Pagos' },
  { table: 'cotizaciones', fileName: 'cotizaciones.json', label: 'Cotizaciones' },
  { table: 'cotizacion_detalles', fileName: 'cotizacion_detalles.json', label: 'Detalles de cotizaciones' },
  { table: 'suscripciones', fileName: 'suscripciones.json', label: 'Suscripciones' },
  { table: 'notifications', fileName: 'notificaciones.json', label: 'Notificaciones' },
  { table: 'support_tickets', fileName: 'tickets_soporte.json', label: 'Tickets de soporte' },
  { table: 'cashbox_closures', fileName: 'cierres_caja.json', label: 'Cierres de caja' },
  { table: 'inventory_transformations', fileName: 'transformaciones_inventario.json', label: 'Transformaciones de inventario' },
  { table: 'sale_returns', fileName: 'devoluciones_ventas.json', label: 'Devoluciones de ventas' },
  { table: 'sale_return_items', fileName: 'items_devoluciones_ventas.json', label: 'Items de devoluciones' },
  { table: 'audit_logs', fileName: 'auditoria.json', label: 'Auditoria' }
];

const DEFAULT_NOTIFICATION_SETTINGS = {
  support_notifications: true,
  sales_notifications: true,
  inventory_notifications: true,
  low_stock_notifications: true,
  accounts_receivable_notifications: true,
  subscription_notifications: true
};

const SAAS_EMAIL_DOMAIN = import.meta.env.VITE_SAAS_EMAIL_DOMAIN || 'mbs.app';
const RESERVED_EMAIL_ALIASES = new Set([
  'admin',
  'administrator',
  'billing',
  'contact',
  'facturas',
  'hello',
  'help',
  'info',
  'invoices',
  'mail',
  'noreply',
  'no-reply',
  'postmaster',
  'root',
  'security',
  'support',
  'ventas',
  'webmaster',
]);

function normalizeEmailAlias(value: string) {
  const alias = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .replace(/[.-]{2,}/g, '-')
    .slice(0, 63);

  if (!alias) return '';
  if (alias.length < 3) return `${alias}-co`;
  return alias;
}

function getDefaultEmailAlias(businessName: string) {
  const alias = normalizeEmailAlias(businessName) || 'business';
  return RESERVED_EMAIL_ALIASES.has(alias) ? `${alias}-business` : alias;
}


const DEV_FALLBACK_NEGOCIO_ID = import.meta.env.DEV
  ? String(import.meta.env.VITE_DEV_FALLBACK_NEGOCIO_ID || '')
  : '';

const settingsCopy = {
  es: {
    loading: 'Cargando configuración...',
    missingTitle: 'Usuario sin negocio asignado',
    missingText: 'El login funciona, pero este usuario todavía no tiene un negocio asignado.',
    title: 'Configuración',
    subtitle: 'Datos del negocio, inventario y suscripción',
    restrictedTitle: 'Acceso restringido',
    restrictedSellerText: 'Los vendedores no tienen acceso al módulo de configuración.',
    refresh: 'Actualizar',
    businessData: 'Datos del Negocio',
    businessDataDescription: 'Estos datos se usarán en facturas, reportes y configuración general del POS.',
    businessCollapsedHint: 'Vista compacta. Pulsa Editar datos para abrir la configuración completa del negocio.',
    userProfile: 'Perfil de Usuario',
    userProfileDescription: 'Este nombre se usará como vendedor y en la información visible de la cuenta.',
    userName: 'Nombre del usuario',
    userNamePlaceholder: 'Ej. Mac Arthur Jean Pierre',
    userEmail: 'Correo electrónico',
    userEmailPlaceholder: 'usuario@correo.com',
    saveUserName: 'Guardar perfil',
    editUserName: 'Editar perfil',
    cancelUserNameEdit: 'Cancelar edición',
    userNameRequired: 'El nombre del usuario es obligatorio',
    userNameSaved: 'Nombre actualizado correctamente',
    userNameSaveError: 'Error al actualizar el nombre',
    authSyncError: 'No se pudo sincronizar el perfil con Authentication.',
    emailLoginWarningTitle: 'Este correo también será tu login',
    emailLoginWarningText: 'Si cambias el email y luego cierras sesión, tendrás que volver a iniciar sesión con el nuevo correo.',
    businessName: 'Nombre del negocio',
    phone: 'Teléfono',
    address: 'Dirección',
    currency: 'Moneda',
    exchangeRateSettings: 'Tasa del día',
    exchangeRateDescription: 'Configura una moneda alternativa para recibir pagos y convertirlos a la moneda principal del sistema.',
    mainCurrency: 'Moneda principal',
    secondaryCurrency: 'Moneda de pago alternativa',
    exchangeRate: 'Tasa de cambio',
    exchangeRateHint: 'Ejemplo: si la moneda principal es HTG y recibes USD, escribe cuántos HTG equivale 1 USD.',
    exchangeRateUpdatedAt: 'Tasa actualizada',
    exchangeRateToday: 'Usar fecha/hora actual',
    salesPermissions: 'Permisos de ventas',
    salesPermissionsDescription: 'Define los límites que aplican a los vendedores al registrar ventas.',
    sellerDiscountLimit: 'Descuento máximo para vendedores (%)',
    sellerDiscountLimitDescription: 'Porcentaje máximo de descuento que puede aplicar un vendedor en una venta.',
    sellerDiscountLimitPlaceholder: '15',
    editSalesPermissions: 'Editar permisos',
    cancelSalesPermissionsEdit: 'Cancelar edición',
    salesPermissionsSaved: 'Permisos de venta actualizados correctamente',
    salesPermissionsSaveError: 'Error al guardar los permisos de venta',
    ownerOrAdminOnly: 'Solo el owner o un administrador puede modificar estos permisos.',
    businessLogo: 'Logo del negocio',
    logoPreview: 'Vista previa del logo',
    uploadLogo: 'Seleccionar logo',
    changeLogo: 'Cambiar logo',
    removeLogo: 'Quitar logo',
    selectedLogo: 'Logo seleccionado',
    currentLogo: 'Logo actual',
    noLogo: 'Sin logo configurado',
    logoHint: 'PNG o JPG recomendado. Tamaño sugerido: 512×512px.',
    ownerOnly: 'Solo el owner puede modificar estos datos.',
    editBusiness: 'Editar datos',
    cancelEdit: 'Cancelar edición',
    businessNamePlaceholder: 'Ej. PROYECTO GESTION DE VENTAS',
    phonePlaceholder: 'Ej. +1 (809) 555-1234',
    addressPlaceholder: 'Calle, ciudad, país',
    saving: 'Guardando...',
    saveChanges: 'Guardar Cambios',
    subscriptionBilling: 'Suscripción y Facturación',
    subscriptionDescription: 'Administra tarjeta, facturas, renovación y cancelación desde Stripe Billing Portal.',
    plan: 'Plan',
    status: 'Estado',
    trialEnds: 'Trial vence',
    stripeCustomer: 'Cliente Stripe',
    connected: 'Conectado',
    notConnected: 'No conectado',
    openingPortal: 'Abriendo portal...',
    manageSubscription: 'Administrar Suscripción',
    inventoryManagement: 'Gestión de Inventario',
    inventoryDescription: 'Opciones para administrar el stock de productos del negocio actual.',
    resetStockButton: 'Resetear Todo el Stock a 0',
    notifications: 'Notificaciones',
    notificationsDescription: 'Alertas de bajo stock, clientes con deuda y cierres de caja.',
    notificationPreferences: 'Preferencias de notificaciones',
    notificationPreferencesDescription: 'Activa o desactiva las alertas que quieres recibir en el centro de notificaciones.',
    supportNotifications: 'Tickets de soporte',
    salesNotifications: 'Ventas',
    inventoryNotifications: 'Inventario',
    lowStockNotifications: 'Stock bajo',
    accountsReceivableNotifications: 'Cuentas por cobrar',
    subscriptionNotifications: 'Suscripción y facturación',
    notificationSettingsSaved: 'Preferencias de notificaciones actualizadas correctamente',
    notificationSettingsError: 'Error al guardar las preferencias de notificaciones',
    security: 'Seguridad',
    securityDescription: 'Administración de roles, permisos y usuarios.',
    comingSoon: 'Próximamente',
    resetStockTitle: 'Resetear Todo el Stock',
    resetStockMessage: 'Esta acción pondrá el stock de TODOS los productos de este negocio en 0. Esta operación no se puede deshacer. ¿Estás seguro de continuar?',
    resetting: 'Reseteando...',
    confirmResetStock: 'Sí, Resetear Todo',
    cancel: 'Cancelar',
    loadError: 'Error al cargar la configuración',
    businessNameRequired: 'El nombre del negocio es obligatorio',
    businessNotFound: 'No se encontró el negocio del usuario',
    businessSaved: 'Configuración del negocio actualizada correctamente',
    saveError: 'Error al guardar la configuración',
    stripeNotConnected: 'Este negocio todavía no tiene cliente Stripe conectado',
    billingUrlMissing: 'No se recibió la URL del portal de facturación',
    billingPortalError: 'No se pudo abrir el portal de suscripción',
    stockResetSuccess: 'Stock reseteado correctamente',
    stockResetError: 'Error al resetear el stock',
    active: 'Activo',
    trial: 'Basic',
    statusActiveLabel: 'Activo',
    planBasicLabel: 'Basic',
    businessEmail: 'Correo del negocio',
    businessEmailDescription: 'Este alias se usará para enviar facturas y cotizaciones desde el dominio del SaaS.',
    businessEmailAlias: 'Alias de correo',
    businessEmailAliasHint: 'Solo letras, números, puntos o guiones. Debe ser único.',
    businessEmailFromName: 'Nombre remitente',
    businessEmailReplyTo: 'Responder a',
    businessEmailPreview: 'Remitente visible',
    businessEmailAliasRequired: 'El alias de correo es obligatorio',
    businessEmailAliasReserved: 'Este alias está reservado para la plataforma',
    website: 'Sitio web',
    taxId: 'Tax ID',
    timezone: 'Zona horaria',
    businessBackup: 'Respaldo del negocio',
    businessBackupDescription: 'Crea un archivo ZIP con los datos del negocio actual para guardarlo localmente o subirlo a Google Drive.',
    createBackup: 'Crear backup ahora',
    creatingBackup: 'Creando backup...',
    backupIncludes: 'Incluye clientes, productos, ventas, pagos, compras, cotizaciones, usuarios, auditoría y configuración del negocio.',
    backupSaved: 'Backup generado correctamente',
    backupError: 'No se pudo generar el backup',
    backupOwnerAdminOnly: 'Solo el owner o un administrador puede crear backups.',
    lastBackup: 'Último backup',
    noBackupYet: 'Aún no se ha generado en esta sesión',
    platformBackup: 'Backup de plataforma',
    platformBackupDescription: 'Crea un ZIP global con los datos que el Super Admin puede leer en todos los negocios del SaaS.',
    platformBackupIncludes: 'Incluye negocios, usuarios, clientes, productos, ventas, pagos, cotizaciones, suscripciones, soporte, notificaciones y auditoría.',
    createPlatformBackup: 'Crear backup de plataforma',
    platformBackupSaved: 'Backup de plataforma generado correctamente',
    platformBackupError: 'No se pudo generar el backup de plataforma',
    platformBackupStored: 'Backup descargado y guardado en Storage',
    platformBackupStorageWarning: 'El ZIP se descargó, pero no se pudo guardar en el historial. Aplica la migración de backups.',
    backupHistory: 'Historial',
    noBackupHistory: 'Sin backups guardados todavía',
    downloadingBackup: 'Preparando descarga...',
    downloadBackup: 'Descargar',
  },
  en: {
    loading: 'Loading settings...',
    missingTitle: 'User has no assigned business',
    missingText: 'Login works, but this user does not have an assigned business yet.',
    title: 'Settings',
    subtitle: 'Business details, inventory, and subscription',
    restrictedTitle: 'Restricted access',
    restrictedSellerText: 'Sellers do not have access to the settings module.',
    refresh: 'Refresh',
    businessData: 'Business Details',
    businessDataDescription: 'These details will be used on invoices, reports, and general POS settings.',
    businessCollapsedHint: 'Compact view. Click Edit details to open the full business configuration.',
    userProfile: 'User Profile',
    userProfileDescription: 'This name will be used as seller name and visible account information.',
    userName: 'User name',
    userNamePlaceholder: 'Ex. Mac Arthur Jean Pierre',
    userEmail: 'Email',
    userEmailPlaceholder: 'user@email.com',
    saveUserName: 'Save profile',
    editUserName: 'Edit profile',
    cancelUserNameEdit: 'Cancel edit',
    userNameRequired: 'User name is required',
    userNameSaved: 'Name updated successfully',
    userNameSaveError: 'Error updating name',
    authSyncError: 'Could not synchronize the profile with Authentication.',
    emailLoginWarningTitle: 'This email is also your login',
    emailLoginWarningText: 'If you change the email and later log out, you will need to sign in again with the new email.',
    businessName: 'Business name',
    phone: 'Phone',
    address: 'Address',
    currency: 'Currency',
    exchangeRateSettings: 'Daily exchange rate',
    exchangeRateDescription: 'Configure an alternative payment currency and convert it to the system main currency.',
    mainCurrency: 'Main currency',
    secondaryCurrency: 'Alternative payment currency',
    exchangeRate: 'Exchange rate',
    exchangeRateHint: 'Example: if the main currency is HTG and you receive USD, enter how many HTG equals 1 USD.',
    exchangeRateUpdatedAt: 'Rate updated',
    exchangeRateToday: 'Use current date/time',
    salesPermissions: 'Sales permissions',
    salesPermissionsDescription: 'Define the limits applied to sellers when registering sales.',
    sellerDiscountLimit: 'Maximum seller discount (%)',
    sellerDiscountLimitDescription: 'Maximum discount percentage a seller can apply to a sale.',
    sellerDiscountLimitPlaceholder: '15',
    editSalesPermissions: 'Edit permissions',
    cancelSalesPermissionsEdit: 'Cancel edit',
    salesPermissionsSaved: 'Sales permissions updated successfully',
    salesPermissionsSaveError: 'Error saving sales permissions',
    ownerOrAdminOnly: 'Only the owner or an administrator can modify these permissions.',
    businessLogo: 'Business logo',
    logoPreview: 'Logo preview',
    uploadLogo: 'Select logo',
    changeLogo: 'Change logo',
    removeLogo: 'Remove logo',
    selectedLogo: 'Selected logo',
    currentLogo: 'Current logo',
    noLogo: 'No logo configured',
    logoHint: 'PNG or JPG recommended. Suggested size: 512×512px.',
    ownerOnly: 'Only the owner can modify these details.',
    editBusiness: 'Edit details',
    cancelEdit: 'Cancel edit',
    businessNamePlaceholder: 'Ex. SALES MANAGEMENT PROJECT',
    phonePlaceholder: 'Ex. +1 (809) 555-1234',
    addressPlaceholder: 'Street, city, country',
    saving: 'Saving...',
    saveChanges: 'Save Changes',
    subscriptionBilling: 'Subscription and Billing',
    subscriptionDescription: 'Manage card, invoices, renewal, and cancellation from Stripe Billing Portal.',
    plan: 'Plan',
    status: 'Status',
    trialEnds: 'Trial ends',
    stripeCustomer: 'Stripe Customer',
    connected: 'Connected',
    notConnected: 'Not connected',
    openingPortal: 'Opening portal...',
    manageSubscription: 'Manage Subscription',
    inventoryManagement: 'Inventory Management',
    inventoryDescription: 'Options to manage product stock for the current business.',
    resetStockButton: 'Reset All Stock to 0',
    notifications: 'Notifications',
    notificationsDescription: 'Low stock alerts, clients with debt, and cashbox closings.',
    notificationPreferences: 'Notification preferences',
    notificationPreferencesDescription: 'Turn on or off the alerts you want to receive in the notification center.',
    supportNotifications: 'Support tickets',
    salesNotifications: 'Sales',
    inventoryNotifications: 'Inventory',
    lowStockNotifications: 'Low stock',
    accountsReceivableNotifications: 'Accounts receivable',
    subscriptionNotifications: 'Subscription and billing',
    notificationSettingsSaved: 'Notification preferences updated successfully',
    notificationSettingsError: 'Error saving notification preferences',
    security: 'Security',
    securityDescription: 'Manage roles, permissions, and users.',
    comingSoon: 'Coming Soon',
    resetStockTitle: 'Reset All Stock',
    resetStockMessage: 'This action will set the stock of ALL products for this business to 0. This operation cannot be undone. Are you sure you want to continue?',
    resetting: 'Resetting...',
    confirmResetStock: 'Yes, Reset All',
    cancel: 'Cancel',
    loadError: 'Error loading settings',
    businessNameRequired: 'Business name is required',
    businessNotFound: 'The user business was not found',
    businessSaved: 'Business settings updated successfully',
    saveError: 'Error saving settings',
    stripeNotConnected: 'This business does not have a connected Stripe customer yet',
    billingUrlMissing: 'Billing portal URL was not received',
    billingPortalError: 'Could not open the subscription portal',
    stockResetSuccess: 'Stock reset successfully',
    stockResetError: 'Error resetting stock',
    active: 'Active',
    trial: 'Basic',
    statusActiveLabel: 'Active',
    planBasicLabel: 'Basic',
    businessEmail: 'Business Email',
    businessEmailDescription: 'This alias will be used to send invoices and quotes from the SaaS domain.',
    businessEmailAlias: 'Email alias',
    businessEmailAliasHint: 'Only letters, numbers, dots, or hyphens. It must be unique.',
    businessEmailFromName: 'Sender name',
    businessEmailReplyTo: 'Reply to',
    businessEmailPreview: 'Visible sender',
    businessEmailAliasRequired: 'Email alias is required',
    businessEmailAliasReserved: 'This alias is reserved for the platform',
    website: 'Website',
    taxId: 'Tax ID',
    timezone: 'Timezone',
    businessBackup: 'Business Backup',
    businessBackupDescription: 'Create a ZIP file with the current business data to save locally or upload to Google Drive.',
    createBackup: 'Create backup now',
    creatingBackup: 'Creating backup...',
    backupIncludes: 'Includes clients, products, sales, payments, purchases, quotes, users, audit logs, and business settings.',
    backupSaved: 'Backup generated successfully',
    backupError: 'Could not generate backup',
    backupOwnerAdminOnly: 'Only the owner or an administrator can create backups.',
    lastBackup: 'Last backup',
    noBackupYet: 'Not generated in this session yet',
    platformBackup: 'Platform Backup',
    platformBackupDescription: 'Create a global ZIP with the data the Super Admin can read across all SaaS businesses.',
    platformBackupIncludes: 'Includes businesses, users, clients, products, sales, payments, quotes, subscriptions, support, notifications, and audit logs.',
    createPlatformBackup: 'Create platform backup',
    platformBackupSaved: 'Platform backup generated successfully',
    platformBackupError: 'Could not generate platform backup',
    platformBackupStored: 'Backup downloaded and saved to Storage',
    platformBackupStorageWarning: 'The ZIP was downloaded, but it could not be saved to history. Apply the backups migration.',
    backupHistory: 'History',
    noBackupHistory: 'No saved backups yet',
    downloadingBackup: 'Preparing download...',
    downloadBackup: 'Download',
  }
} as const;

export default function SettingsPage() {
  const { user, userProfile, refreshProfile } = useAuth();
  const { showToast } = useNotification();
  const { language } = useLanguage();
  const t = settingsCopy[language];
  const roleFlags = getUserRoleFlags(userProfile);
  const normalizedCurrentRole = roleFlags.role;
  const isOwner = normalizedCurrentRole === 'owner' || normalizedCurrentRole === 'dueño' || normalizedCurrentRole === 'dueno';
  const isAdmin = roleFlags.isAdmin;
  const isSuperAdmin = roleFlags.isSuperAdmin;
  const canAccessSettingsPage = !!user && !roleFlags.isSeller;
  const canEditBusinessSettings = isOwner;
  const canManageSalesPermissions = isOwner || isAdmin;
  const canManageBilling = isOwner;
  const canManageInventorySettings = isOwner;
  const canCreateBusinessBackup = !isSuperAdmin && (isOwner || isAdmin);

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

  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [isEditingBusiness, setIsEditingBusiness] = useState(false);
  const [billingPortalLoading, setBillingPortalLoading] = useState(false);
  const [isResetStockModalOpen, setIsResetStockModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [missingNegocio, setMissingNegocio] = useState(false);
  const [savingSalesPermissions, setSavingSalesPermissions] = useState(false);
  const [isEditingSalesPermissions, setIsEditingSalesPermissions] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [lastBackup, setLastBackup] = useState<{ fileName: string; createdAt: string; size: number } | null>(null);
  const [businessBackupHistory, setBusinessBackupHistory] = useState<Array<{ fileName: string; createdAt: string; size: number }>>([]);
  const [isCreatingPlatformBackup, setIsCreatingPlatformBackup] = useState(false);
  const [lastPlatformBackup, setLastPlatformBackup] = useState<{ fileName: string; createdAt: string; size: number } | null>(null);
  const [platformBackupHistory, setPlatformBackupHistory] = useState<PlatformBackupRecord[]>([]);
  const [downloadingPlatformBackupId, setDownloadingPlatformBackupId] = useState<string | null>(null);

  const [businessForm, setBusinessForm] = useState({
    nombre: '',
    telefono: DEFAULT_PHONE_INPUT_VALUE,
    direccion: '',
    email: '',
    email_alias: '',
    email_from_name: '',
    email_reply_to: '',
    website: '',
    tax_id: '',
    timezone: 'Europe/Luxembourg',
    moneda: '$',
    moneda_secundaria: 'USD',
    tasa_cambio: '',
    tasa_actualizada_en: '',
    logo_url: ''
  });

  const [salesPermissionsForm, setSalesPermissionsForm] = useState({
    seller_discount_limit: '15'
  });

  const [profileForm, setProfileForm] = useState({
    nombre: '',
    email: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [savedNotificationSettings, setSavedNotificationSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false);
  const [isEditingNotificationSettings, setIsEditingNotificationSettings] = useState(false);

  async function getFunctionErrorMessage(error: unknown) {
    const fallbackMessage = error instanceof Error ? error.message : t.authSyncError;
    const maybeContext = (error as { context?: unknown })?.context;

    if (maybeContext && typeof (maybeContext as Response).json === 'function') {
      try {
        const body = await (maybeContext as Response).json();
        const parsedError = (body as { error?: string; message?: string })?.error || (body as { message?: string })?.message;

        if (parsedError) {
          return parsedError;
        }
      } catch (parseError) {
        console.error('Error parsing function error response:', parseError);
      }
    }

    return fallbackMessage;
  }

  function normalizeSellerDiscountLimit(value: unknown) {
    const numericValue = Number(value ?? 15);
    if (!Number.isFinite(numericValue)) return 15;
    return Math.min(100, Math.max(0, numericValue));
  }

  function formatPercent(value: unknown) {
    return normalizeSellerDiscountLimit(value).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

function formatPlanLabel(plan: string | null | undefined) {
  const normalizedPlan = String(plan || '').trim().toLowerCase();

if (!normalizedPlan || normalizedPlan === 'trial' || normalizedPlan === 'basic') {
  return t.planBasicLabel;
}

  return normalizedPlan.charAt(0).toUpperCase() + normalizedPlan.slice(1);
}

function formatStatusLabel(status: string | null | undefined) {
  const normalizedStatus = String(status || '').trim().toLowerCase();

  if (!normalizedStatus || normalizedStatus === 'activo' || normalizedStatus === 'active') {
  return t.statusActiveLabel;
}

  return normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
}

  const loadNotificationSettings = useCallback(async () => {
    if (!user?.id) {
      setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('id, user_id, support_notifications, sales_notifications, inventory_notifications, low_stock_notifications, accounts_receivable_notifications, subscription_notifications')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
        setSavedNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
        return;
      }

      const currentSettings = data as NotificationSettings;
      const normalizedSettings = {
        support_notifications: currentSettings.support_notifications ?? true,
        sales_notifications: currentSettings.sales_notifications ?? true,
        inventory_notifications: currentSettings.inventory_notifications ?? true,
        low_stock_notifications: currentSettings.low_stock_notifications ?? true,
        accounts_receivable_notifications: currentSettings.accounts_receivable_notifications ?? true,
        subscription_notifications: currentSettings.subscription_notifications ?? true
      };

      setNotificationSettings(normalizedSettings);
      setSavedNotificationSettings(normalizedSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
      setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
    }
  }, [user?.id]);

  const loadPlatformBackupHistory = useCallback(async () => {
    if (!isSuperAdmin) {
      setPlatformBackupHistory([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('platform_backups')
        .select('id, created_at, file_name, size_bytes, storage_bucket, storage_path, status, error')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setPlatformBackupHistory((data || []) as PlatformBackupRecord[]);
    } catch (error) {
      console.warn('Platform backup history is not available yet:', error);
      setPlatformBackupHistory([]);
    }
  }, [isSuperAdmin]);

  async function handleSaveNotificationSettings() {
    if (!user?.id) return;

    try {
      setSavingNotificationSettings(true);

      const payload = {
        user_id: user.id,
        ...notificationSettings,
        updated_at: new Date().toISOString()
      };

      const { data: existingSettings, error: existingSettingsError } = await supabase
        .from('notification_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingSettingsError) throw existingSettingsError;

      if (existingSettings?.id) {
        const { error } = await supabase
          .from('notification_settings')
          .update(payload)
          .eq('id', existingSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_settings')
          .insert(payload);

        if (error) throw error;
      }

      showToast(t.notificationSettingsSaved, 'success');
      setSavedNotificationSettings(notificationSettings);
      setIsEditingNotificationSettings(false);
      window.dispatchEvent(
        new CustomEvent('matmax:notification-settings-updated', {
          detail: notificationSettings
        })
      );
    } catch (error) {
      console.error('Error saving notification settings:', error);
      showToast(t.notificationSettingsError, 'error');
    } finally {
      setSavingNotificationSettings(false);
    }
  }

  function toggleNotificationSetting(key: keyof typeof DEFAULT_NOTIFICATION_SETTINGS) {
    if (!isEditingNotificationSettings || savingNotificationSettings) return;

    setNotificationSettings((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  function resetBusinessForm(currentBusiness: Negocio | null = negocio) {
    setBusinessForm({
      nombre: currentBusiness?.nombre || '',
      telefono: currentBusiness?.telefono || DEFAULT_PHONE_INPUT_VALUE,
      direccion: currentBusiness?.direccion || '',
      email: currentBusiness?.email || '',
      email_alias: currentBusiness?.email_alias || getDefaultEmailAlias(currentBusiness?.nombre || ''),
      email_from_name: currentBusiness?.email_from_name || currentBusiness?.nombre || '',
      email_reply_to: currentBusiness?.email_reply_to || currentBusiness?.email || '',
      website: (currentBusiness?.website || '').replace(/^https?:\/\//, ''),
      tax_id: currentBusiness?.tax_id || '',
      timezone: currentBusiness?.timezone || 'Europe/Luxembourg',
      moneda: currentBusiness?.moneda || '$',
      moneda_secundaria: currentBusiness?.moneda_secundaria || 'USD',
      tasa_cambio: currentBusiness?.tasa_cambio ? String(currentBusiness.tasa_cambio) : '',
      tasa_actualizada_en: currentBusiness?.tasa_actualizada_en || '',
      logo_url: currentBusiness?.logo_url || ''
    });
    setSalesPermissionsForm({
      seller_discount_limit: String(normalizeSellerDiscountLimit(currentBusiness?.seller_discount_limit))
    });
    setLogoFile(null);
    setRemoveLogo(false);
  }


  const resolveNegocioId = useCallback(async () => {
    if (userProfile?.negocio_id) return userProfile.negocio_id;
    if (negocio?.id) return negocio.id;
    if (isSuperAdmin && DEV_FALLBACK_NEGOCIO_ID) return DEV_FALLBACK_NEGOCIO_ID;
    if (!user?.id) return null;

    const { data } = await supabase
      .from('usuarios')
      .select('negocio_id')
      .eq('id', user.id)
      .maybeSingle();

    if (data?.negocio_id) return data.negocio_id;

    if (import.meta.env.DEV && DEV_FALLBACK_NEGOCIO_ID && user.id === import.meta.env.VITE_DEV_FALLBACK_USER_ID) {
      return DEV_FALLBACK_NEGOCIO_ID;
    }

    return null;
  }, [isSuperAdmin, negocio?.id, user?.id, userProfile?.negocio_id]);

  const loadBusinessSettings = useCallback(async () => {
    try {
      setLoading(true);

      if (!user) {
        setNegocio(null);
        setMissingNegocio(false);
        return;
      }

      setProfileForm({
        nombre: String(userProfile?.nombre || userProfile?.full_name || userProfile?.username || user?.email || ''),
        email: String(userProfile?.email || user?.email || '')
      });

      const negocioId = await resolveNegocioId();

      if (!negocioId) {
        setNegocio(null);
        setMissingNegocio(!isSuperAdmin);
        return;
      }

      const { data, error } = await supabase
        .from('negocios')
        .select('*')
        .eq('id', negocioId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        if (DEV_FALLBACK_NEGOCIO_ID && negocioId === DEV_FALLBACK_NEGOCIO_ID) {
          const fallbackBusiness: Negocio = {
            id: DEV_FALLBACK_NEGOCIO_ID,
            nombre: 'Sistema POS',
            telefono: DEFAULT_PHONE_INPUT_VALUE,
            direccion: '',
            email: '',
            email_alias: 'sistema-pos',
            email_from_name: 'Sistema POS',
            email_reply_to: '',
            website: '',
            tax_id: '',
            timezone: 'Europe/Luxembourg',
            moneda: '$',
            moneda_secundaria: 'USD',
            tasa_cambio: null,
            tasa_actualizada_en: null,
            logo_url: '',
            estado: 'activo',
            plan: 'basic',
            trial_ends_at: null,
            stripe_customer_id: null,
            stripe_subscription_id: null,
            seller_discount_limit: 15
          };

          setNegocio(fallbackBusiness);
          setBusinessForm({
            nombre: fallbackBusiness.nombre,
            telefono: fallbackBusiness.telefono || DEFAULT_PHONE_INPUT_VALUE,
            direccion: fallbackBusiness.direccion || '',
            email: fallbackBusiness.email || '',
            email_alias: fallbackBusiness.email_alias || getDefaultEmailAlias(fallbackBusiness.nombre),
            email_from_name: fallbackBusiness.email_from_name || fallbackBusiness.nombre || '',
            email_reply_to: fallbackBusiness.email_reply_to || fallbackBusiness.email || '',
            website: (fallbackBusiness.website || '').replace(/^https?:\/\//, ''),
            tax_id: fallbackBusiness.tax_id || '',
            timezone: fallbackBusiness.timezone || 'Europe/Luxembourg',
            moneda: fallbackBusiness.moneda || '$',
            moneda_secundaria: fallbackBusiness.moneda_secundaria || 'USD',
            tasa_cambio: fallbackBusiness.tasa_cambio ? String(fallbackBusiness.tasa_cambio) : '',
            tasa_actualizada_en: fallbackBusiness.tasa_actualizada_en || '',
            logo_url: fallbackBusiness.logo_url || ''
          });
          setSalesPermissionsForm({
            seller_discount_limit: String(normalizeSellerDiscountLimit(fallbackBusiness.seller_discount_limit))
          });
          setMissingNegocio(false);
          return;
        }

        setNegocio(null);
        setMissingNegocio(!isSuperAdmin);
        return;
      }

      const currentBusiness = data as Negocio;
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('suscripciones')
        .select('estado, plan')
        .eq('negocio_id', currentBusiness.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscriptionError) {
        console.warn('Error loading subscription for settings:', subscriptionError);
      }

      const effectiveBusiness: Negocio = {
        ...currentBusiness,
        plan: getEffectivePlan({
          businessPlan: currentBusiness.plan,
          subscriptionPlan: subscriptionData?.plan,
          subscriptionStatus: subscriptionData?.estado,
        }),
        estado:
          normalizeSubscriptionStatus(subscriptionData?.estado) ||
          normalizeSubscriptionStatus(currentBusiness.estado) ||
          currentBusiness.estado,
      };

      setNegocio(effectiveBusiness);
      setBusinessForm({
        nombre: effectiveBusiness.nombre || '',
        telefono: effectiveBusiness.telefono || DEFAULT_PHONE_INPUT_VALUE,
        direccion: effectiveBusiness.direccion || '',
        email: effectiveBusiness.email || '',
        email_alias: effectiveBusiness.email_alias || getDefaultEmailAlias(effectiveBusiness.nombre || ''),
        email_from_name: effectiveBusiness.email_from_name || effectiveBusiness.nombre || '',
        email_reply_to: effectiveBusiness.email_reply_to || effectiveBusiness.email || '',
        website: (effectiveBusiness.website || '').replace(/^https?:\/\//, ''),
        tax_id: effectiveBusiness.tax_id || '',
        timezone: effectiveBusiness.timezone || 'Europe/Luxembourg',
        moneda: effectiveBusiness.moneda || '$',
        moneda_secundaria: effectiveBusiness.moneda_secundaria || 'USD',
        tasa_cambio: effectiveBusiness.tasa_cambio ? String(effectiveBusiness.tasa_cambio) : '',
        tasa_actualizada_en: effectiveBusiness.tasa_actualizada_en || '',
        logo_url: effectiveBusiness.logo_url || ''
      });
      setSalesPermissionsForm({
        seller_discount_limit: String(normalizeSellerDiscountLimit(effectiveBusiness.seller_discount_limit))
      });
      setMissingNegocio(false);
    } catch (error) {
      console.error('Error loading business settings:', error);
      showToast(t.loadError, 'error');
    } finally {
      setLoading(false);
    }
  }, [
    isSuperAdmin,
    resolveNegocioId,
    showToast,
    t.loadError,
    user,
    userProfile?.email,
    userProfile?.full_name,
    userProfile?.nombre,
    userProfile?.username
  ]);

  useEffect(() => {
    loadBusinessSettings();
    loadNotificationSettings();
    loadPlatformBackupHistory();
  }, [loadBusinessSettings, loadNotificationSettings, loadPlatformBackupHistory, normalizedCurrentRole]);

  async function uploadLogoToSupabase(file: File, negocioId: string) {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const safeExt = fileExt.replace(/[^a-z0-9]/g, '') || 'png';
    const fileName = `logo-${Date.now()}.${safeExt}`;
    const filePath = `${negocioId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('negocios')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || `image/${safeExt}`
      });

    if (uploadError) {
      console.error('Logo upload error:', uploadError);
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage
      .from('negocios')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  }

  async function handleSaveBusiness(e: FormEvent) {
    e.preventDefault();

    if (!canEditBusinessSettings) {
      showToast(t.ownerOnly, 'error');
      return;
    }

    if (!businessForm.nombre.trim()) {
      showToast(t.businessNameRequired, 'error');
      return;
    }

    const normalizedEmailAlias = normalizeEmailAlias(businessForm.email_alias || businessForm.nombre);
    if (!normalizedEmailAlias) {
      showToast(t.businessEmailAliasRequired, 'error');
      return;
    }

    if (RESERVED_EMAIL_ALIASES.has(normalizedEmailAlias)) {
      showToast(t.businessEmailAliasReserved, 'error');
      return;
    }

    try {
      setSavingBusiness(true);
      const negocioId = await resolveNegocioId();

      if (!negocioId) {
        showToast(t.businessNotFound, 'error');
        return;
      }

      let finalLogoUrl = removeLogo ? '' : businessForm.logo_url;

      if (logoFile && !removeLogo) {
        finalLogoUrl = await uploadLogoToSupabase(logoFile, negocioId);
      }

      const normalizedWebsite = businessForm.website?.trim()
        ? `https://${businessForm.website.replace(/^https?:\/\//, '').trim()}`
        : null;

      const cleanExchangeRate = Number(businessForm.tasa_cambio || 0);
      const normalizedExchangeRate = Number.isFinite(cleanExchangeRate) && cleanExchangeRate > 0 ? cleanExchangeRate : null;
      const normalizedExchangeRateUpdatedAt = normalizedExchangeRate
        ? businessForm.tasa_actualizada_en || new Date().toISOString()
        : null;

      const payload = {
        nombre: businessForm.nombre.trim(),
        telefono: normalizePhoneForStorage(businessForm.telefono),
        direccion: businessForm.direccion.trim() || null,
        email: businessForm.email.trim().toLowerCase() || null,
        email_alias: normalizedEmailAlias,
        email_from_name: businessForm.email_from_name.trim() || businessForm.nombre.trim(),
        email_reply_to: businessForm.email_reply_to.trim().toLowerCase() || businessForm.email.trim().toLowerCase() || null,
        website: normalizedWebsite,
        tax_id: businessForm.tax_id.trim() || null,
        timezone: businessForm.timezone.trim() || 'Europe/Luxembourg',
        moneda: businessForm.moneda.trim() || '$',
        moneda_secundaria: businessForm.moneda_secundaria.trim() || null,
        tasa_cambio: normalizedExchangeRate,
        tasa_actualizada_en: normalizedExchangeRateUpdatedAt,
        logo_url: finalLogoUrl?.trim() ? finalLogoUrl : null
      };

      const previousBusiness = negocio;

      const { data, error } = await supabase
        .from('negocios')
        .update(payload)
        .eq('id', negocioId)
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (user?.id) {
        await logAudit({
          negocio_id: negocioId,
          user_id: user.id,
          user_name: loggedUserName,
          user_email: loggedUserEmail || undefined,
          user_role: loggedUserRole || undefined,
          action: 'UPDATE_BUSINESS_SETTINGS',
          module: 'SETTINGS',
          record_id: negocioId,
          description: `Configuración del negocio actualizada por ${loggedUserName}`,
          old_data: previousBusiness ? {
            id: previousBusiness.id,
            nombre: previousBusiness.nombre,
            telefono: previousBusiness.telefono,
            direccion: previousBusiness.direccion,
            email: previousBusiness.email,
            email_alias: previousBusiness.email_alias,
            email_from_name: previousBusiness.email_from_name,
            email_reply_to: previousBusiness.email_reply_to,
            website: previousBusiness.website,
            tax_id: previousBusiness.tax_id,
            timezone: previousBusiness.timezone,
            moneda: previousBusiness.moneda,
            moneda_secundaria: previousBusiness.moneda_secundaria,
            tasa_cambio: previousBusiness.tasa_cambio,
            tasa_actualizada_en: previousBusiness.tasa_actualizada_en,
            logo_url: previousBusiness.logo_url
          } : null,
          new_data: data as Record<string, unknown>
        });
      }

      const updatedBusiness = data as Negocio;
      setNegocio(updatedBusiness);
        setBusinessForm({
          nombre: updatedBusiness.nombre || '',
        telefono: updatedBusiness.telefono || DEFAULT_PHONE_INPUT_VALUE,
        direccion: updatedBusiness.direccion || '',
        email: updatedBusiness.email || '',
        email_alias: updatedBusiness.email_alias || getDefaultEmailAlias(updatedBusiness.nombre || ''),
        email_from_name: updatedBusiness.email_from_name || updatedBusiness.nombre || '',
        email_reply_to: updatedBusiness.email_reply_to || updatedBusiness.email || '',
        website: (updatedBusiness.website || '').replace(/^https?:\/\//, ''),
        tax_id: updatedBusiness.tax_id || '',
        timezone: updatedBusiness.timezone || 'Europe/Luxembourg',
        moneda: updatedBusiness.moneda || '$',
        moneda_secundaria: updatedBusiness.moneda_secundaria || 'USD',
        tasa_cambio: updatedBusiness.tasa_cambio ? String(updatedBusiness.tasa_cambio) : '',
        tasa_actualizada_en: updatedBusiness.tasa_actualizada_en || '',
        logo_url: updatedBusiness.logo_url || ''
      });
      setSalesPermissionsForm({
        seller_discount_limit: String(normalizeSellerDiscountLimit(updatedBusiness.seller_discount_limit))
      });
      setLogoFile(null);
      setRemoveLogo(false);
      setIsEditingBusiness(false);

      showToast(t.businessSaved, 'success');
    } catch (error) {
      console.error('Error saving business settings:', error);
      showToast(t.saveError, 'error');
    } finally {
      setSavingBusiness(false);
    }
  }

  async function handleSaveSalesPermissions(e: FormEvent) {
    e.preventDefault();

    if (!canManageSalesPermissions) {
      showToast(t.ownerOrAdminOnly, 'error');
      return;
    }

    try {
      setSavingSalesPermissions(true);
      const negocioId = await resolveNegocioId();

      if (!negocioId) {
        showToast(t.businessNotFound, 'error');
        return;
      }

      const normalizedLimit = normalizeSellerDiscountLimit(salesPermissionsForm.seller_discount_limit);
      const previousBusiness = negocio;

      const { data, error } = await supabase
        .from('negocios')
        .update({ seller_discount_limit: normalizedLimit })
        .eq('id', negocioId)
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (user?.id) {
        await logAudit({
          negocio_id: negocioId,
          user_id: user.id,
          user_name: loggedUserName,
          user_email: loggedUserEmail || undefined,
          user_role: loggedUserRole || undefined,
          action: 'UPDATE_SALES_PERMISSIONS',
          module: 'SETTINGS',
          record_id: negocioId,
          description: `Permisos de venta actualizados por ${loggedUserName}`,
          old_data: {
            seller_discount_limit: previousBusiness?.seller_discount_limit ?? 15
          },
          new_data: {
            seller_discount_limit: normalizedLimit
          }
        });
      }

      const updatedBusiness = data as Negocio;
      setNegocio(updatedBusiness);
      setSalesPermissionsForm({
        seller_discount_limit: String(normalizeSellerDiscountLimit(updatedBusiness.seller_discount_limit))
      });
      setIsEditingSalesPermissions(false);
      showToast(t.salesPermissionsSaved, 'success');
    } catch (error) {
      console.error('Error saving sales permissions:', error);
      showToast(t.salesPermissionsSaveError, 'error');
    } finally {
      setSavingSalesPermissions(false);
    }
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();

    const cleanName = profileForm.nombre.trim();
    const cleanEmail = profileForm.email.trim().toLowerCase();

    if (!cleanName) {
      showToast(t.userNameRequired, 'error');
      return;
    }

    if (!cleanEmail) {
      showToast(t.userNameSaveError, 'error');
      return;
    }

    if (!user?.id) return;

    try {
      setSavingProfile(true);

      const oldProfileName = String(userProfile?.nombre || userProfile?.full_name || userProfile?.username || user?.email || '');
      const oldProfileEmail = String(userProfile?.email || user?.email || '').trim().toLowerCase();

      const { data: authSyncData, error: authSyncError } = await supabase.functions.invoke('update-user', {
        body: {
          userId: user.id,
          email: cleanEmail,
          full_name: cleanName,
          role: loggedUserRole
        }
      });

      if (authSyncError) {
        const functionErrorMessage = await getFunctionErrorMessage(authSyncError);
        throw new Error(functionErrorMessage || t.authSyncError);
      }

      if (authSyncData?.error) {
        throw new Error(authSyncData.error || t.authSyncError);
      }

      const { error } = await supabase
        .from('usuarios')
        .update({
          full_name: cleanName,
          email: cleanEmail
        })
        .eq('id', user.id);

      if (error) throw error;

      const negocioId = await resolveNegocioId();
      if (negocioId) {
        await logAudit({
          negocio_id: negocioId,
          user_id: user.id,
          user_name: cleanName,
          user_email: cleanEmail || undefined,
          user_role: loggedUserRole || undefined,
          action: 'UPDATE_PROFILE',
          module: 'SETTINGS',
          record_id: user.id,
          description: `Perfil de usuario actualizado por ${loggedUserName}`,
          old_data: {
            full_name: oldProfileName,
            email: oldProfileEmail
          },
          new_data: {
            full_name: cleanName,
            email: cleanEmail
          }
        });
      }

      setProfileForm({ nombre: cleanName, email: cleanEmail });
      setIsEditingProfile(false);
      if (cleanEmail !== oldProfileEmail) {
        await supabase.auth.refreshSession();
      }
      await refreshProfile();
      await loadBusinessSettings();

if (cleanEmail !== oldProfileEmail) {
  showToast(`${t.userNameSaved}. ${t.emailLoginWarningText}`, 'success');
} else {
  showToast(t.userNameSaved, 'success');
}
    } catch (error) {
      console.error('Error saving user profile:', error);
      showToast(error instanceof Error ? error.message : t.userNameSaveError, 'error');
    } finally {
      setSavingProfile(false);
    }
  }
  async function handleOpenBillingPortal() {
    if (!canManageBilling) {
      showToast(t.ownerOnly, 'error');
      return;
    }
    if (!negocio?.stripe_customer_id) {
      showToast(t.stripeNotConnected, 'error');
      return;
    }

    try {
      setBillingPortalLoading(true);

      const { data, error } = await supabase.functions.invoke('create-billing-portal-session', {
        body: {
          negocio_id: negocio.id,
          return_url: window.location.href
        }
      });

      if (error) throw error;

      const portalUrl = data?.url || data?.portal_url;

      if (!portalUrl) {
        throw new Error(t.billingUrlMissing);
      }

      window.open(portalUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening Billing Portal:', error);
      showToast(t.billingPortalError, 'error');
    } finally {
      setBillingPortalLoading(false);
    }
  }

  function formatBackupSize(size: number) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  function getSafeBackupSlug(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'negocio';
  }

  function formatBackupError(error: unknown) {
    if (!error) return 'Error desconocido';
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;

    if (typeof error === 'object') {
      const errorRecord = error as Record<string, unknown>;
      const parts = [
        errorRecord.message,
        errorRecord.details,
        errorRecord.hint,
        errorRecord.code ? `code: ${errorRecord.code}` : null
      ]
        .filter(Boolean)
        .map(String);

      if (parts.length > 0) return parts.join(' | ');

      try {
        return JSON.stringify(errorRecord);
      } catch {
        return 'Objeto de error no serializable';
      }
    }

    return String(error);
  }

  async function fetchBackupTable(config: BusinessBackupTable, negocioId: string): Promise<BackupTableExport> {
    const rows: BackupRow[] = [];
    const pageSize = 1000;
    let from = 0;

    try {
      while (true) {
        const { data, error } = await supabase
          .from(config.table)
          .select('*')
          .eq(config.field, negocioId)
          .range(from, from + pageSize - 1);

        if (error) throw error;

        const pageRows = (data || []) as BackupRow[];
        rows.push(...pageRows);

        if (pageRows.length < pageSize) break;
        from += pageSize;
      }

      return {
        label: config.label,
        fileName: config.fileName,
        rows,
        count: rows.length
      };
    } catch (error) {
      return {
        label: config.label,
        fileName: config.fileName,
        rows: [],
        count: 0,
        skipped: true,
        error: formatBackupError(error)
      };
    }
  }

  async function fetchFullBackupTable(config: Omit<BusinessBackupTable, 'field'>): Promise<BackupTableExport> {
    const rows: BackupRow[] = [];
    const pageSize = 1000;
    let from = 0;

    try {
      while (true) {
        const { data, error } = await supabase
          .from(config.table)
          .select('*')
          .range(from, from + pageSize - 1);

        if (error) throw error;

        const pageRows = (data || []) as BackupRow[];
        rows.push(...pageRows);

        if (pageRows.length < pageSize) break;
        from += pageSize;
      }

      return {
        label: config.label,
        fileName: config.fileName,
        rows,
        count: rows.length
      };
    } catch (error) {
      return {
        label: config.label,
        fileName: config.fileName,
        rows: [],
        count: 0,
        skipped: true,
        error: formatBackupError(error)
      };
    }
  }

  function createBackupReadme(params: {
    type: 'business_backup' | 'platform_backup';
    generatedAt: string;
    generatedBy: string;
    fileCount: number;
  }) {
    const title = params.type === 'platform_backup' ? 'MatMax Platform Backup' : 'MatMax Business Backup';

    return [
      title,
      '',
      `Generated at: ${params.generatedAt}`,
      `Generated by: ${params.generatedBy}`,
      `JSON files: ${params.fileCount}`,
      '',
      'How to read this backup:',
      '- Open _metadata.json first.',
      '- Every module is stored as a separate JSON file.',
      '- Each file contains records, skipped, error, and data.',
      '- If skipped is true, the table was unavailable, missing, or blocked by permissions.',
      '',
      'Google Drive:',
      '- Upload this ZIP file to the backup folder in Google Drive.',
      '- Keep several dated backups instead of replacing the same file.',
      '',
      'Restore note:',
      '- This ZIP is an export backup, not an automatic restore package yet.',
      '- Restoring should be done carefully by a technical admin after reviewing the JSON files.'
    ].join('\n');
  }

  async function downloadBackupZip(params: {
    rootFolder: string;
    fileName: string;
    metadata: Record<string, unknown>;
    files: Array<{ name: string; content: string }>;
  }) {
    const { createZipBlob } = await import('../utils/createZip');
    const zipBlob = createZipBlob([
      {
        name: `${params.rootFolder}/README_BACKUP.txt`,
        content: createBackupReadme({
          type: String(params.metadata.type) === 'platform_backup' ? 'platform_backup' : 'business_backup',
          generatedAt: String(params.metadata.generated_at || ''),
          generatedBy: loggedUserName,
          fileCount: params.files.length
        })
      },
      {
        name: `${params.rootFolder}/_metadata.json`,
        content: JSON.stringify(params.metadata, null, 2)
      },
      ...params.files
    ]);

    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = params.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    return zipBlob;
  }

  async function savePlatformBackupToStorage(params: {
    zipBlob: Blob;
    fileName: string;
    storagePath: string;
    metadata: Record<string, unknown>;
  }) {
    const bucket = 'platform-backups';
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(params.storagePath, params.zipBlob, {
        contentType: 'application/zip',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { error: insertError } = await supabase
      .from('platform_backups')
      .insert({
        created_by: user?.id || null,
        backup_type: 'platform',
        status: 'success',
        storage_bucket: bucket,
        storage_path: params.storagePath,
        file_name: params.fileName,
        size_bytes: params.zipBlob.size,
        metadata: params.metadata
      });

    if (insertError) throw insertError;
  }

  async function handleDownloadStoredPlatformBackup(record: PlatformBackupRecord) {
    if (!record.storage_bucket || !record.storage_path) return;

    try {
      setDownloadingPlatformBackupId(record.id);
      const { data, error } = await supabase.storage
        .from(record.storage_bucket)
        .createSignedUrl(record.storage_path, 60);

      if (error) throw error;

      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = record.file_name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading platform backup:', error);
      showToast(t.platformBackupError, 'error');
    } finally {
      setDownloadingPlatformBackupId(null);
    }
  }

  async function fetchBackupRowsByIds(
    table: string,
    field: string,
    values: Array<string | number>,
    fileName: string,
    label: string
  ): Promise<BackupTableExport> {
    const uniqueValues = Array.from(new Set(values.filter((value) => value !== null && value !== undefined && value !== '')));

    if (uniqueValues.length === 0) {
      return { label, fileName, rows: [], count: 0 };
    }

    try {
      const rows: BackupRow[] = [];

      for (let index = 0; index < uniqueValues.length; index += 200) {
        const chunk = uniqueValues.slice(index, index + 200);
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .in(field, chunk);

        if (error) throw error;
        rows.push(...((data || []) as BackupRow[]));
      }

      return { label, fileName, rows, count: rows.length };
    } catch (error) {
      return {
        label,
        fileName,
        rows: [],
        count: 0,
        skipped: true,
        error: formatBackupError(error)
      };
    }
  }

  async function fetchPurchasesBackup(negocioId: string): Promise<BackupTableExport> {
    try {
      const { data, error } = await supabase.rpc('get_compras_for_business', {
        p_negocio_id: negocioId
      });

      if (error) throw error;

      const rows = (data || []) as BackupRow[];
      return {
        label: 'Compras',
        fileName: 'compras.json',
        rows,
        count: rows.length
      };
    } catch (error) {
      return {
        label: 'Compras',
        fileName: 'compras.json',
        rows: [],
        count: 0,
        skipped: true,
        error: formatBackupError(error)
      };
    }
  }

  async function fetchProductsBackup(negocioId: string): Promise<BackupTableExport> {
    try {
      const { data, error } = await supabase
        .rpc('get_productos_for_business', {
          p_negocio_id: negocioId
        })
        .order('created_at', { ascending: true });

      if (error) throw error;

      const rows = (data || []) as BackupRow[];
      return {
        label: 'Productos',
        fileName: 'productos.json',
        rows,
        count: rows.length
      };
    } catch (error) {
      return {
        label: 'Productos',
        fileName: 'productos.json',
        rows: [],
        count: 0,
        skipped: true,
        error: formatBackupError(error)
      };
    }
  }

  async function fetchRpcBackupForBusinesses(
    negocioIds: string[],
    rpcName: 'get_productos_for_business' | 'get_compras_for_business',
    fileName: string,
    label: string
  ): Promise<BackupTableExport> {
    const rows: BackupRow[] = [];
    const errors: string[] = [];

    for (const negocioId of Array.from(new Set(negocioIds.filter(Boolean)))) {
      const { data, error } = await supabase.rpc(rpcName, {
        p_negocio_id: negocioId
      });

      if (error) {
        errors.push(`${negocioId}: ${formatBackupError(error)}`);
        continue;
      }

      rows.push(...((data || []) as BackupRow[]));
    }

    return {
      label,
      fileName,
      rows,
      count: rows.length,
      skipped: errors.length > 0 && rows.length === 0,
      error: errors.length > 0 ? errors.join(' || ') : undefined
    };
  }

  async function handleCreateBusinessBackup() {
    if (!canCreateBusinessBackup) {
      showToast(t.backupOwnerAdminOnly, 'error');
      return;
    }

    try {
      setIsCreatingBackup(true);
      const negocioId = await resolveNegocioId();

      if (!negocioId) {
        showToast(t.businessNotFound, 'error');
        return;
      }

      const generatedAt = new Date().toISOString();
      const businessSlug = getSafeBackupSlug(negocio?.nombre || businessForm.nombre || 'negocio');
      const stamp = generatedAt.replace(/[:.]/g, '-');
      const rootFolder = `matmax-backup-${businessSlug}-${stamp}`;
      const fileName = `${rootFolder}.zip`;

      const { data: businessData, error: businessError } = await supabase
        .from('negocios')
        .select('*')
        .eq('id', negocioId)
        .maybeSingle();

      if (businessError) throw businessError;

      const tableExports = await Promise.all(
        BUSINESS_BACKUP_TABLES.map((config) => fetchBackupTable(config, negocioId))
      );

      const ventasExport = tableExports.find((item) => item.fileName === 'ventas.json');
      const cotizacionesExport = tableExports.find((item) => item.fileName === 'cotizaciones.json');
      const ventaIds = (ventasExport?.rows || []).map((row) => row.id as string | number);
      const cotizacionIds = (cotizacionesExport?.rows || []).map((row) => row.id as string | number);

      const [ventaItemsExport, quoteItemsExport, purchasesExport, productsExport] = await Promise.all([
        fetchBackupRowsByIds('venta_items', 'venta_id', ventaIds, 'venta_items.json', 'Items de ventas'),
        fetchBackupRowsByIds('cotizacion_detalles', 'cotizacion_id', cotizacionIds, 'cotizacion_detalles.json', 'Detalles de cotizaciones'),
        fetchPurchasesBackup(negocioId),
        fetchProductsBackup(negocioId)
      ]);

      const allExports = [
        ...tableExports,
        productsExport,
        ventaItemsExport,
        quoteItemsExport,
        purchasesExport
      ];
      const skippedExports = allExports.filter((item) => item.skipped);

      const metadata = {
        app: 'MatMax Business Suite',
        type: 'business_backup',
        version: 1,
        generated_at: generatedAt,
        negocio_id: negocioId,
        business_name: negocio?.nombre || businessForm.nombre || businessData?.nombre || null,
        generated_by: {
          user_id: user?.id || null,
          name: loggedUserName,
          email: loggedUserEmail || null,
          role: loggedUserRole || null
        },
        summary: {
          total_tables: allExports.length,
          exported_tables: allExports.filter((item) => !item.skipped).length,
          skipped_tables: skippedExports.length,
          total_records: allExports.reduce((sum, item) => sum + item.count, 0)
        },
        tables: allExports.map(({ label, fileName: exportFileName, count, skipped, error }) => ({
          label,
          file: exportFileName,
          records: count,
          skipped: Boolean(skipped),
          error: error || null
        })),
        skipped_tables: skippedExports.map((item) => ({
          label: item.label,
          file: item.fileName,
          error: item.error || null
        })),
        notes: [
          'Este ZIP contiene datos exportados desde Supabase para el negocio actual.',
          'Las tablas marcadas como skipped no estaban disponibles, no existian o fueron bloqueadas por permisos RLS.',
          'Para Google Drive, sube este archivo ZIP manualmente a la carpeta de respaldo del negocio.'
        ]
      };

      const zipFiles = [
        {
          name: `${rootFolder}/negocio.json`,
          content: JSON.stringify(businessData || negocio || {}, null, 2)
        },
        ...allExports.map((item) => ({
          name: `${rootFolder}/${item.fileName}`,
          content: JSON.stringify({
            label: item.label,
            exported_at: generatedAt,
            records: item.count,
            skipped: Boolean(item.skipped),
            error: item.error || null,
            data: item.rows
          }, null, 2)
        }))
      ];

      const zipBlob = await downloadBackupZip({
        rootFolder,
        fileName,
        metadata,
        files: zipFiles
      });

      setLastBackup({
        fileName,
        createdAt: generatedAt,
        size: zipBlob.size
      });
      setBusinessBackupHistory((current) => [
        {
          fileName,
          createdAt: generatedAt,
          size: zipBlob.size
        },
        ...current
      ].slice(0, 30));

      if (user?.id) {
        await logAudit({
          negocio_id: negocioId,
          user_id: user.id,
          user_name: loggedUserName,
          user_email: loggedUserEmail || undefined,
          user_role: loggedUserRole || undefined,
          action: 'EXPORT_BUSINESS_BACKUP',
          module: 'SETTINGS',
          record_id: negocioId,
          description: `Backup del negocio generado por ${loggedUserName}`,
          old_data: null,
          new_data: {
            file_name: fileName,
            size: zipBlob.size,
            tables: metadata.tables
          }
        });
      }

      showToast(t.backupSaved, 'success');
    } catch (error) {
      console.error('Error creating business backup:', error);
      showToast(t.backupError, 'error');
    } finally {
      setIsCreatingBackup(false);
    }
  }

  async function handleCreatePlatformBackup() {
    if (!isSuperAdmin) {
      showToast(t.restrictedTitle, 'error');
      return;
    }

    try {
      setIsCreatingPlatformBackup(true);

      const generatedAt = new Date().toISOString();
      const stamp = generatedAt.replace(/[:.]/g, '-');
      const rootFolder = `matmax-platform-backup-${stamp}`;
      const fileName = `${rootFolder}.zip`;
      const storagePath = `manual/${fileName}`;

      const tableExports = await Promise.all(
        PLATFORM_BACKUP_TABLES.map((config) => fetchFullBackupTable(config))
      );
      const businessExport = tableExports.find((item) => item.fileName === 'negocios.json');
      const negocioIds = (businessExport?.rows || [])
        .map((row) => String(row.id || ''))
        .filter(Boolean);

      const [productsExport, purchasesExport] = await Promise.all([
        fetchRpcBackupForBusinesses(negocioIds, 'get_productos_for_business', 'productos.json', 'Productos'),
        fetchRpcBackupForBusinesses(negocioIds, 'get_compras_for_business', 'compras.json', 'Compras')
      ]);

      const allExports = [
        ...tableExports,
        productsExport,
        purchasesExport
      ];
      const skippedExports = allExports.filter((item) => item.skipped);

      const metadata = {
        app: 'MatMax Business Suite',
        type: 'platform_backup',
        version: 1,
        generated_at: generatedAt,
        generated_by: {
          user_id: user?.id || null,
          name: loggedUserName,
          email: loggedUserEmail || null,
          role: loggedUserRole || null
        },
        summary: {
          total_tables: allExports.length,
          exported_tables: allExports.filter((item) => !item.skipped).length,
          skipped_tables: skippedExports.length,
          total_records: allExports.reduce((sum, item) => sum + item.count, 0)
        },
        tables: allExports.map(({ label, fileName: exportFileName, count, skipped, error }) => ({
          label,
          file: exportFileName,
          records: count,
          skipped: Boolean(skipped),
          error: error || null
        })),
        skipped_tables: skippedExports.map((item) => ({
          label: item.label,
          file: item.fileName,
          error: item.error || null
        })),
        notes: [
          'Este ZIP contiene un respaldo global creado desde la cuenta Super Admin.',
          'El backup respeta los permisos RLS disponibles para el Super Admin en el frontend.',
          'Las tablas marcadas como skipped no estaban disponibles, no existian o fueron bloqueadas por permisos.',
          'Para Google Drive, sube este archivo ZIP manualmente a la carpeta de respaldo de plataforma.'
        ]
      };

      const zipFiles = allExports.map((item) => ({
        name: `${rootFolder}/${item.fileName}`,
        content: JSON.stringify({
          label: item.label,
          exported_at: generatedAt,
          records: item.count,
          skipped: Boolean(item.skipped),
          error: item.error || null,
          data: item.rows
        }, null, 2)
      }));

      const zipBlob = await downloadBackupZip({
        rootFolder,
        fileName,
        metadata,
        files: zipFiles
      });

      setLastPlatformBackup({
        fileName,
        createdAt: generatedAt,
        size: zipBlob.size
      });

      try {
        await savePlatformBackupToStorage({
          zipBlob,
          fileName,
          storagePath,
          metadata
        });
        await loadPlatformBackupHistory();
        showToast(t.platformBackupStored, 'success');
      } catch (storageError) {
        console.warn('Platform backup storage/history is not available yet:', storageError);
        showToast(t.platformBackupStorageWarning, 'error');
      }
    } catch (error) {
      console.error('Error creating platform backup:', error);
      showToast(t.platformBackupError, 'error');
    } finally {
      setIsCreatingPlatformBackup(false);
    }
  }

  async function handleResetAllStock() {
    if (!canManageInventorySettings) {
      showToast(t.ownerOnly, 'error');
      return;
    }

    try {
      setIsResetting(true);

      const negocioId = await resolveNegocioId();

      if (!negocioId) {
        showToast(t.businessNotFound, 'error');
        return;
      }

      const { data: productsBeforeReset, error: productsLoadError } = await supabase
        .from('productos')
        .select('id, nombre, stock')
        .eq('negocio_id', negocioId);

      if (productsLoadError) throw productsLoadError;

      const { error } = await supabase
        .from('productos')
        .update({ stock: 0 })
        .eq('negocio_id', negocioId);

      if (error) throw error;

      if (user?.id) {
        await logAudit({
          negocio_id: negocioId,
          user_id: user.id,
          user_name: loggedUserName,
          user_email: loggedUserEmail || undefined,
          user_role: loggedUserRole || undefined,
          action: 'RESET_ALL_STOCK',
          module: 'SETTINGS',
          record_id: negocioId,
          description: `Stock de todos los productos reseteado por ${loggedUserName}`,
          old_data: {
            productos: productsBeforeReset || []
          },
          new_data: {
            stock: 0,
            affected_products: productsBeforeReset?.length || 0
          }
        });
      }

      showToast(t.stockResetSuccess, 'success');
      setIsResetStockModalOpen(false);
    } catch (error) {
      console.error('Error resetting stock:', error);
      showToast(t.stockResetError, 'error');
    } finally {
      setIsResetting(false);
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

  if (missingNegocio && !isSuperAdmin) {
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

  if (!canAccessSettingsPage) {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#fbfaf7] p-4 sm:p-6">
        <div className="w-full max-w-xl rounded-[2rem] border border-[#e9e2d3] bg-white/90 p-5 text-center shadow-matmax-soft sm:p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542]">
            <Shield size={26} />
          </div>
          <h1 className="mb-3 text-xl font-serif font-bold text-[#050505] sm:text-2xl">
            {t.restrictedTitle}
          </h1>
          <p className="text-sm text-[#71717a] sm:text-base">
            {t.restrictedSellerText}
          </p>
        </div>
      </div>
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
              <Shield size={14} />
              {isSuperAdmin ? 'MatMax SaaS Control Center' : 'MatMax Business Suite'}
            </div>
            <h1 className="mb-3 text-4xl font-black tracking-tight text-[#050505] sm:text-5xl xl:text-[4rem]">
              {t.title}
            </h1>
            <p className="max-w-3xl text-sm font-bold uppercase tracking-[0.18em] text-[#71717a] sm:text-base">
              {isSuperAdmin ? (language === 'es' ? 'Perfil, facturación y seguridad de la plataforma' : 'Profile, billing, and platform security') : t.subtitle}
            </p>
          </div>

          <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:w-[560px]">
            <div className="relative min-w-0 overflow-visible rounded-[1.5rem] border border-[#e9e2d3] bg-white/78 p-4 shadow-sm backdrop-blur-xl">
              <div className="relative flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542] shadow-[0_16px_36px_rgba(0,0,0,0.2)]">
                  <Building2 className="h-5 w-5 shrink-0" />
                </div>
                <div className="min-w-0 flex-1 overflow-visible">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#8a6a16]">{t.businessData}</p>
                  <p className="whitespace-normal break-words text-base font-black leading-tight text-[#050505] [overflow-wrap:anywhere] sm:text-lg xl:text-xl">
                    {isSuperAdmin ? 'MatMax SaaS Control Center' : negocio?.nombre || businessForm.nombre || 'MatMax Business'}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={loadBusinessSettings}
              className="relative min-w-0 overflow-hidden rounded-[1.5rem] border border-[#050505] bg-[#050505] p-4 text-left text-white shadow-[0_18px_44px_rgba(15,15,15,0.12)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-[#111111]"
            >
              <div className="relative flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f4c542] text-[#050505] shadow-[0_16px_36px_rgba(244,197,66,0.2)]">
                  <Save className="h-5 w-5 shrink-0" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#f4c542]">{t.refresh}</p>
                  <p className="line-clamp-2 break-words text-lg font-black leading-tight text-white [overflow-wrap:anywhere]">
                    {isSuperAdmin ? (language === 'es' ? 'plataforma' : 'platform') : formatStatusLabel(negocio?.estado)}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>

      <Card className="overflow-hidden border-[#e9e2d3] bg-white/92 shadow-[0_22px_65px_rgba(15,15,15,0.06)] backdrop-blur-2xl">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
                <div className="w-fit rounded-2xl bg-[#fff4c7] p-3 text-[#8a6a16] shadow-sm">
                  <Shield className="shrink-0" size={26} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="mb-2 text-2xl font-black tracking-tight text-[#050505]">
                    {t.userProfile}
                  </h3>
                  <p className="text-sm text-[#71717a]">
                    {t.userProfileDescription}
                  </p>
                </div>
              </div>

              {!isEditingProfile ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full shrink-0 lg:w-auto"
                  onClick={() => setIsEditingProfile(true)}
                >
                  <Pencil className="shrink-0" size={16} />
                  {t.editUserName}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full shrink-0 lg:w-auto"
                  onClick={() => {
                    setProfileForm({
                      nombre: String(userProfile?.nombre || userProfile?.full_name || userProfile?.username || user?.email || ''),
                      email: String(userProfile?.email || user?.email || '')
                    });
                    setIsEditingProfile(false);
                  }}
                  disabled={savingProfile}
                >
                  <X className="shrink-0" size={16} />
                  {t.cancelUserNameEdit}
                </Button>
              )}
            </div>

            <div className="grid w-full min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <Input
                label={t.userName}
                value={profileForm.nombre}
                onChange={(e) => setProfileForm({ ...profileForm, nombre: e.target.value })}
                placeholder={t.userNamePlaceholder}
                disabled={!isEditingProfile || savingProfile}
              />

              <Input
                label={t.userEmail}
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                placeholder={t.userEmailPlaceholder}
                disabled={!isEditingProfile || savingProfile}
              />
              {isEditingProfile &&
                profileForm.email.trim().toLowerCase() !== String(userProfile?.email || user?.email || '').trim().toLowerCase() && (
                  <div className="rounded-2xl border border-[#f4c542]/35 bg-[#fff9e8] px-4 py-3 text-sm font-semibold leading-relaxed text-[#8a6a16] lg:col-span-3">
                    <p className="font-black text-[#050505]">{t.emailLoginWarningTitle}</p>
                    <p className="mt-1">{t.emailLoginWarningText}</p>
                  </div>
                )}

              {isEditingProfile && (
                <Button
                  type="submit"
                  className="w-full lg:mt-6 lg:w-auto"
                  disabled={savingProfile || !profileForm.nombre.trim() || !profileForm.email.trim()}
                >
                  <Save className="shrink-0" size={18} />
                  {savingProfile ? t.saving : t.saveUserName}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
      
      {!isSuperAdmin && (
        <Card className="overflow-hidden border-[#e9e2d3] bg-white/92 shadow-[0_22px_65px_rgba(15,15,15,0.06)] backdrop-blur-2xl">
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSaveBusiness} className="space-y-5">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
              <div className="w-fit rounded-2xl bg-[#050505] p-3 text-[#f4c542] shadow-matmax-dark">
                <Building2 className="shrink-0" size={26} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="mb-2 text-2xl font-black tracking-tight text-[#050505]">
                      {t.businessData}
                    </h3>
                    <p className="text-sm text-[#71717a]">
                      {t.businessDataDescription}
                    </p>
                  </div>

                  {canEditBusinessSettings && negocio ? (
                    !isEditingBusiness ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full shrink-0 sm:w-auto"
                        onClick={() => setIsEditingBusiness(true)}
                      >
                        <Pencil className="shrink-0" size={16} />
                        {t.editBusiness}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full shrink-0 sm:w-auto"
                        onClick={() => {
                          resetBusinessForm();
                          setIsEditingBusiness(false);
                        }}
                      >
                        <X className="shrink-0" size={16} />
                        {t.cancelEdit}
                      </Button>
                    )
                  ) : (
                    <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] px-4 py-3 text-sm font-black text-[#71717a]">
                      {t.ownerOnly}
                    </div>
                  )}
                </div>

                {!isEditingBusiness && (
                  <div className="grid min-w-0 grid-cols-1 gap-4 rounded-[2rem] border border-[#e9e2d3] bg-[#fbfaf7] p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[1.35rem] border border-[#e9e2d3] bg-white/85 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.businessName}</p>
                      <p className="mt-2 break-words text-base font-black text-[#050505]">{businessForm.nombre || '—'}</p>
                    </div>
                    <div className="rounded-[1.35rem] border border-[#e9e2d3] bg-white/85 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.currency}</p>
                      <p className="mt-2 text-base font-black text-[#050505]">{businessForm.moneda || '—'}</p>
                    </div>
                    <div className="rounded-[1.35rem] border border-[#e9e2d3] bg-white/85 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.exchangeRateSettings}</p>
                      <p className="mt-2 text-base font-black text-[#050505]">{businessForm.moneda_secundaria || '—'} · {businessForm.tasa_cambio || '—'}</p>
                    </div>
                    <div className="rounded-[1.35rem] border border-[#e9e2d3] bg-white/85 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.businessEmail}</p>
                      <p className="mt-2 break-words text-base font-black text-[#050505]">
                        {(businessForm.email_alias || getDefaultEmailAlias(businessForm.nombre))}@{SAAS_EMAIL_DOMAIN}
                      </p>
                    </div>
                    <p className="sm:col-span-2 xl:col-span-4 text-sm font-semibold leading-relaxed text-[#71717a]">
                      {t.businessCollapsedHint}
                    </p>
                  </div>
                )}

                <div className={`grid min-w-0 grid-cols-1 gap-4 overflow-hidden transition-all duration-500 ease-out md:grid-cols-2 ${isEditingBusiness ? 'max-h-[2600px] opacity-100' : 'max-h-0 pointer-events-none opacity-0'}`}>
                  
                  <Input
                    label={t.businessName}
                    value={businessForm.nombre}
                    onChange={(e) => setBusinessForm({ ...businessForm, nombre: e.target.value })}
                    placeholder={t.businessNamePlaceholder}
                    disabled={!isEditingBusiness || !canEditBusinessSettings || savingBusiness}
                    required
                  />

                  <Input
                    label={t.phone}
                    value={businessForm.telefono}
                    onChange={(e) => setBusinessForm({ ...businessForm, telefono: sanitizePhoneInput(e.target.value) })}
                    onKeyDown={(e) => {
                      const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
                      const isNumber = /^[0-9]$/.test(e.key);
                      const isPlus = e.key === '+' && !businessForm.telefono.includes('+') && businessForm.telefono.length === 0;

                      if (!isNumber && !isPlus && !allowedKeys.includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    inputMode="tel"
                    placeholder={t.phonePlaceholder}
                    disabled={!isEditingBusiness || !canEditBusinessSettings || savingBusiness}
                  />

                  <Input
                    label={t.address}
                    value={businessForm.direccion}
                    onChange={(e) => setBusinessForm({ ...businessForm, direccion: e.target.value })}
                    placeholder={t.addressPlaceholder}
                    disabled={!isEditingBusiness || !canEditBusinessSettings || savingBusiness}
                  />

                  {/* Business Email input */}
                  <Input
                    label={t.businessEmail}
                    type="email"
                    value={businessForm.email}
                    onChange={(e) => setBusinessForm({ ...businessForm, email: e.target.value })}
                    placeholder="business@email.com"
                    disabled={!isEditingBusiness || !canEditBusinessSettings || savingBusiness}
                  />

                  <div className="md:col-span-2 rounded-[1.35rem] border border-[#e9e2d3] bg-[#fbfaf7] p-4">
                    <div className="mb-4">
                      <p className="text-sm font-black text-[#050505]">{t.businessEmail}</p>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-[#71717a]">
                        {t.businessEmailDescription}
                      </p>
                    </div>

                    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-sm font-bold text-[#3f3f46]">
                          {t.businessEmailAlias}
                        </label>
                        <div className="flex min-w-0 overflow-hidden rounded-lg border border-[#e9e2d3] bg-white focus-within:border-[#f4c542] focus-within:ring-2 focus-within:ring-[#f4c542]/20">
                          <input
                            type="text"
                            value={businessForm.email_alias}
                            onChange={(e) => setBusinessForm({ ...businessForm, email_alias: normalizeEmailAlias(e.target.value) })}
                            placeholder={getDefaultEmailAlias(businessForm.nombre)}
                            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-semibold outline-none"
                            disabled={!isEditingBusiness || !canEditBusinessSettings || savingBusiness}
                          />
                          <div className="flex shrink-0 items-center border-l border-[#e9e2d3] bg-[#f8f6ef] px-3 text-sm font-black text-[#71717a]">
                            @{SAAS_EMAIL_DOMAIN}
                          </div>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-[#71717a]">{t.businessEmailAliasHint}</p>
                      </div>

                      <Input
                        label={t.businessEmailFromName}
                        value={businessForm.email_from_name}
                        onChange={(e) => setBusinessForm({ ...businessForm, email_from_name: e.target.value })}
                        placeholder={businessForm.nombre || t.businessNamePlaceholder}
                        disabled={!isEditingBusiness || !canEditBusinessSettings || savingBusiness}
                      />

                      <Input
                        label={t.businessEmailReplyTo}
                        type="email"
                        value={businessForm.email_reply_to}
                        onChange={(e) => setBusinessForm({ ...businessForm, email_reply_to: e.target.value })}
                        placeholder={businessForm.email || 'business@email.com'}
                        disabled={!isEditingBusiness || !canEditBusinessSettings || savingBusiness}
                      />

                      <div className="md:col-span-2 rounded-2xl border border-[#e9e2d3] bg-white px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">
                          {t.businessEmailPreview}
                        </p>
                        <p className="mt-2 break-words text-sm font-black text-[#050505]">
                          {businessForm.email_from_name || businessForm.nombre || 'Business'} &lt;{businessForm.email_alias || getDefaultEmailAlias(businessForm.nombre)}@{SAAS_EMAIL_DOMAIN}&gt;
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Website input replacement */}
                  <div className="flex min-w-0 flex-col">
                    <label className="mb-1 text-sm font-bold">
                      {t.website}
                    </label>

                    <div className="flex min-w-0 overflow-hidden rounded-lg border bg-white focus-within:border-[#f4c542] focus-within:ring-2 focus-within:ring-[#f4c542]/20">
                      <div className="flex shrink-0 items-center border-r bg-[#f8f6ef] px-3 text-sm font-semibold text-[#71717a]">
                        https://
                      </div>

                      <input
                        type="text"
                        value={businessForm.website || ''}
                        onChange={(e) =>
                          setBusinessForm({
                            ...businessForm,
                            website: e.target.value.replace(/^https?:\/\//, '')
                          })
                        }
                        placeholder="kaliko.com"
                        className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none"
                        disabled={!isEditingBusiness || !canEditBusinessSettings || savingBusiness}
                      />
                    </div>
                  </div>

                  {/* Tax ID and Timezone fields */}
                  <Input
                    label={t.taxId}
                    value={businessForm.tax_id}
                    onChange={(e) => setBusinessForm({ ...businessForm, tax_id: e.target.value })}
                    placeholder="LU12345678"
                    disabled={!isEditingBusiness || !canEditBusinessSettings || savingBusiness}
                  />

                  <div className="flex flex-col">
                    <label className="mb-1 text-sm font-bold">{t.timezone}</label>
                    <select
                      className="w-full rounded-lg border bg-white p-2 text-sm font-semibold text-[#050505] outline-none transition disabled:cursor-not-allowed disabled:bg-[#f4f1e8] disabled:text-[#71717a] focus:border-[#f4c542] focus:ring-2 focus:ring-[#f4c542]/20"
                      value={businessForm.timezone}
                      onChange={(e) => setBusinessForm({ ...businessForm, timezone: e.target.value })}
                      disabled={!isEditingBusiness || !canEditBusinessSettings || savingBusiness}
                    >
                      <option value="Europe/Luxembourg">Europe/Luxembourg</option>
                      <option value="Europe/Paris">Europe/Paris</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="America/Santo_Domingo">America/Santo_Domingo</option>
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="mb-1 text-sm font-bold">{t.currency}</label>
                    <select
                      className="w-full rounded-lg border bg-white p-2 text-sm font-semibold text-[#050505] outline-none transition disabled:cursor-not-allowed disabled:bg-[#f4f1e8] disabled:text-[#71717a] focus:border-[#f4c542] focus:ring-2 focus:ring-[#f4c542]/20"
                      value={businessForm.moneda}
                      onChange={(e) => setBusinessForm({ ...businessForm, moneda: e.target.value })}
                      disabled={!isEditingBusiness || !canEditBusinessSettings || savingBusiness}
                    >
                      <option value="€">€ Euro</option>
                      <option value="$">$ Dollar</option>
                      <option value="HTG">HTG Gourde Haitiano</option>
                      <option value="RD$">RD$ Peso Dominicano</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 rounded-[2rem] border border-[#e9e2d3] bg-gradient-to-br from-[#fffdf8] via-white to-[#fbfaf7] p-5 shadow-[0_18px_50px_rgba(15,15,15,0.055)]">
                    <div className="mb-4 flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542]">
                        <RefreshCcw size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base font-black text-[#050505]">{t.exchangeRateSettings}</h4>
                        <p className="mt-1 text-sm font-semibold leading-relaxed text-[#71717a]">{t.exchangeRateDescription}</p>
                      </div>
                    </div>

                    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
                      <div className="flex h-[112px] min-w-0 flex-col justify-between rounded-[1.35rem] border border-[#e9e2d3] bg-white/90 p-4 shadow-sm">
                        <label className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.mainCurrency}</label>
                        <div className="flex min-h-[46px] items-center rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] px-4 text-base font-black text-[#050505]">
                          {businessForm.moneda || '$'}
                        </div>
                      </div>

                      <div className="flex h-[112px] min-w-0 flex-col justify-between rounded-[1.35rem] border border-[#e9e2d3] bg-white/90 p-4 shadow-sm">
                        <label className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.secondaryCurrency}</label>
                        <select
                          className="min-h-[46px] w-full rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] px-4 text-base font-black text-[#050505] outline-none transition disabled:cursor-not-allowed disabled:bg-[#f4f1e8] disabled:text-[#71717a] focus:border-[#f4c542] focus:ring-2 focus:ring-[#f4c542]/20"
                          value={businessForm.moneda_secundaria}
                          onChange={(e) => setBusinessForm({ ...businessForm, moneda_secundaria: e.target.value })}
                          disabled={!isEditingBusiness || !canEditBusinessSettings || savingBusiness}
                        >
                          <option value="USD">USD Dollar</option>
                          <option value="EUR">EUR Euro</option>
                          <option value="HTG">HTG Gourde Haitiano</option>
                          <option value="DOP">DOP Peso Dominicano</option>
                          <option value="CAD">CAD Dollar</option>
                          <option value="MXN">MXN Peso Mexicano</option>
                        </select>
                      </div>

                      <div className="flex h-[112px] min-w-0 flex-col justify-between rounded-[1.35rem] border border-[#e9e2d3] bg-white/90 p-4 shadow-sm">
                        <label className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.exchangeRate}</label>
                        <input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={businessForm.tasa_cambio}
                          onChange={(e) => setBusinessForm({ ...businessForm, tasa_cambio: e.target.value, tasa_actualizada_en: new Date().toISOString() })}
                          placeholder="0.0000"
                          disabled={!isEditingBusiness || !canEditBusinessSettings || savingBusiness}
                          className="min-h-[46px] w-full rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] px-4 text-base font-black text-[#050505] outline-none transition placeholder:text-[#a1a1aa] disabled:cursor-not-allowed disabled:bg-[#f4f1e8] disabled:text-[#71717a] focus:border-[#f4c542] focus:ring-2 focus:ring-[#f4c542]/20"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-[#e9e2d3] bg-white/80 p-3 text-sm text-[#71717a] sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-semibold leading-relaxed">{t.exchangeRateHint}</p>
                      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                        <span className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6a16]">
                          {t.exchangeRateUpdatedAt}: {businessForm.tasa_actualizada_en ? new Date(businessForm.tasa_actualizada_en).toLocaleString() : '—'}
                        </span>
                        {isEditingBusiness && (
                          <button
                            type="button"
                            onClick={() => setBusinessForm({ ...businessForm, tasa_actualizada_en: new Date().toISOString() })}
                            disabled={!canEditBusinessSettings || savingBusiness}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e9e2d3] bg-[#fbfaf7] px-3 py-2 text-xs font-black text-[#050505] transition hover:bg-[#fff9e8] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <RefreshCcw size={14} />
                            {t.exchangeRateToday}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 md:col-span-2">
                    <label className="text-sm font-bold">{t.businessLogo}</label>

                    <div className="relative overflow-hidden rounded-[2rem] border border-[#ece4d3] bg-gradient-to-br from-white via-[#fffdf8] to-[#f8f3e7] shadow-[0_24px_64px_rgba(15,15,15,0.07)]">
                      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#f4c542]/20 blur-2xl" />
                      <div className="relative z-10 flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                          {businessForm.logo_url && !removeLogo ? (
                            <div className="relative shrink-0">
                              <div className="absolute inset-0 rounded-[1.4rem] bg-[#f4c542]/20 blur-xl" />
                              <img
                                src={businessForm.logo_url}
                                alt={t.logoPreview}
                                className="relative h-20 w-20 rounded-[1.4rem] border border-[#efe6d6] bg-white object-contain p-2 shadow-[0_10px_30px_rgba(15,15,15,0.08)]"
                              />
                            </div>
                          ) : (
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.4rem] border border-dashed border-[#d8ccb4] bg-white text-xs font-black uppercase tracking-[0.2em] text-[#8a6a16]">
                              Logo
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="mb-1 text-lg font-black text-[#050505]">
                              {logoFile ? t.selectedLogo : businessForm.logo_url && !removeLogo ? t.currentLogo : t.noLogo}
                            </p>

                            <p className="max-w-full text-sm font-semibold leading-snug text-[#71717a]">
                              {logoFile?.name || t.logoHint}
                            </p>

                            {businessForm.logo_url && !removeLogo && (
                              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                Premium Brand Identity
                              </div>
                            )}

                            {removeLogo && (
                              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-red-700">
                                <Trash2 className="shrink-0" size={13} />
                                {t.removeLogo}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex w-full flex-col gap-3 lg:w-auto sm:flex-row sm:items-center">
                          <label className={`inline-flex w-full sm:w-auto cursor-pointer items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black transition-all ${isEditingBusiness && canEditBusinessSettings && !savingBusiness ? 'border-[#050505] bg-[#050505] text-[#f4c542] shadow-[0_16px_34px_rgba(0,0,0,0.16)] hover:-translate-y-0.5 hover:bg-[#111111]' : 'cursor-not-allowed border-[#e9e2d3] bg-[#f4f1e8] text-[#71717a]'}`}>
                            <Upload className="shrink-0" size={17} />
                            {businessForm.logo_url ? t.changeLogo : t.uploadLogo}

                            <input
                              type="file"
                              accept="image/*"
                              disabled={!isEditingBusiness || !canEditBusinessSettings || savingBusiness}
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setLogoFile(file);
                                setRemoveLogo(false);

                                if (file) {
                                  const preview = URL.createObjectURL(file);
                                  setBusinessForm({ ...businessForm, logo_url: preview });
                                }
                              }}
                              className="sr-only"
                            />
                          </label>

                          <button
                            type="button"
                            disabled={!isEditingBusiness || !canEditBusinessSettings || savingBusiness || (!businessForm.logo_url && !logoFile)}
                            onClick={() => {
                              setLogoFile(null);
                              setRemoveLogo(true);
                              setBusinessForm({
                                ...businessForm,
                                logo_url: ''
                              });
                            }}
                            className={`inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black transition-all ${isEditingBusiness && canEditBusinessSettings && !savingBusiness && (businessForm.logo_url || logoFile) ? 'border-red-200 bg-red-50 text-red-600 shadow-[0_12px_26px_rgba(220,38,38,0.08)] hover:-translate-y-0.5 hover:bg-red-100' : 'cursor-not-allowed border-[#e9e2d3] bg-[#f4f1e8] text-[#a1a1aa]'}`}
                          >
                            <Trash2 className="shrink-0" size={17} />
                            {t.removeLogo}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {isEditingBusiness && negocio && (
                  <div className="flex justify-end pt-5">
                    <Button type="submit" className="w-full sm:w-auto" disabled={savingBusiness}>
                      <Save className="shrink-0" size={18} />
                      {savingBusiness ? t.saving : t.saveChanges}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!isSuperAdmin && (
        <Card className="overflow-hidden border-[#e9e2d3] bg-white/92 shadow-[0_22px_65px_rgba(15,15,15,0.06)] backdrop-blur-2xl">
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSaveSalesPermissions} className="space-y-5">
              <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="w-fit rounded-2xl bg-[#fff4c7] p-3 text-[#8a6a16] shadow-sm">
                    <Shield className="shrink-0" size={26} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="mb-2 text-2xl font-black tracking-tight text-[#050505]">
                      {t.salesPermissions}
                    </h3>
                    <p className="text-sm text-[#71717a]">
                      {t.salesPermissionsDescription}
                    </p>
                  </div>
                </div>

                {canManageSalesPermissions && negocio ? (
                  !isEditingSalesPermissions ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full shrink-0 lg:w-auto"
                      onClick={() => setIsEditingSalesPermissions(true)}
                    >
                      <Pencil className="shrink-0" size={16} />
                      {t.editSalesPermissions}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full shrink-0 lg:w-auto"
                      onClick={() => {
                        setSalesPermissionsForm({
                          seller_discount_limit: String(normalizeSellerDiscountLimit(negocio?.seller_discount_limit))
                        });
                        setIsEditingSalesPermissions(false);
                      }}
                      disabled={savingSalesPermissions}
                    >
                      <X className="shrink-0" size={16} />
                      {t.cancelSalesPermissionsEdit}
                    </Button>
                  )
                ) : (
                  <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] px-4 py-3 text-sm font-black text-[#71717a]">
                    {t.ownerOrAdminOnly}
                  </div>
                )}
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <div className="rounded-[1.35rem] border border-[#e9e2d3] bg-[#fbfaf7] p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.sellerDiscountLimit}</p>
                  <p className="mt-2 text-2xl font-black text-[#050505]">
                    {formatPercent(salesPermissionsForm.seller_discount_limit)}%
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-[#71717a]">
                    {t.sellerDiscountLimitDescription}
                  </p>
                </div>

                <Input
                  label={t.sellerDiscountLimit}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={salesPermissionsForm.seller_discount_limit}
                  onChange={(e) => setSalesPermissionsForm({ seller_discount_limit: e.target.value })}
                  placeholder={t.sellerDiscountLimitPlaceholder}
                  disabled={!isEditingSalesPermissions || !canManageSalesPermissions || savingSalesPermissions}
                />

                {isEditingSalesPermissions && (
                  <Button
                    type="submit"
                    className="w-full lg:mt-6 lg:w-auto"
                    disabled={savingSalesPermissions}
                  >
                    <Save className="shrink-0" size={18} />
                    {savingSalesPermissions ? t.saving : t.saveChanges}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden border-[#e9e2d3] bg-white/92 shadow-[0_18px_50px_rgba(15,15,15,0.055)] backdrop-blur-2xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
              <div className="w-fit rounded-2xl bg-[#fff4c7] p-3">
                <CreditCard size={24} className="shrink-0 text-[#8a6a16]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="mb-2 text-lg font-black text-[#050505]">
                  {t.subscriptionBilling}
                </h3>
                <p className="mb-4 text-sm text-[#71717a]">
                  {t.subscriptionDescription}
                </p>

                <div className="mb-4 space-y-1 rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4 text-sm text-[#3f3f46]">
                  <p><strong>{t.plan}:</strong> {formatPlanLabel(negocio?.plan)}</p>
                  <p><strong>{t.status}:</strong> {formatStatusLabel(negocio?.estado)}</p>
                  {negocio?.trial_ends_at && (
                    <p><strong>{t.trialEnds}:</strong> {new Date(negocio.trial_ends_at).toLocaleDateString()}</p>
                  )}
                  <p><strong>{t.stripeCustomer}:</strong> {negocio?.stripe_customer_id ? t.connected : t.notConnected}</p>
                </div>

                <Button
                  type="button"
                  onClick={handleOpenBillingPortal}
                  disabled={!canManageBilling || billingPortalLoading || !negocio?.stripe_customer_id}
                  className="flex w-full items-center justify-center gap-2"
                >
                  <ExternalLink className="shrink-0" size={18} />
                  {billingPortalLoading ? t.openingPortal : t.manageSubscription}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {!isSuperAdmin && (
          <Card className="overflow-hidden border-[#e9e2d3] bg-white/92 shadow-[0_18px_50px_rgba(15,15,15,0.055)] backdrop-blur-2xl">
            <CardContent className="p-4 sm:p-6">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
                <div className="w-fit rounded-2xl bg-[#050505] p-3">
                  <Database size={24} className="shrink-0 text-[#f4c542]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="mb-2 text-lg font-black text-[#050505]">
                    {t.businessBackup}
                  </h3>
                  <p className="mb-4 text-sm text-[#71717a]">
                    {t.businessBackupDescription}
                  </p>

                  <div className="mb-4 rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4">
                    <p className="text-sm font-black text-[#050505]">
                      {t.lastBackup}
                    </p>
                    {lastBackup ? (
                      <div className="mt-2 space-y-1 text-sm font-semibold text-[#71717a]">
                        <p className="truncate text-[#050505]" title={lastBackup.fileName}>
                          {new Date(lastBackup.createdAt).toLocaleDateString()} · {formatBackupSize(lastBackup.size)}
                        </p>
                        <p>{new Date(lastBackup.createdAt).toLocaleTimeString()}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-semibold text-[#71717a]">
                        {t.noBackupYet}
                      </p>
                    )}
                    <p className="mt-3 text-xs font-semibold leading-relaxed text-[#71717a]">
                      {t.backupIncludes}
                    </p>
                  </div>

                  <div className="mb-4 rounded-2xl border border-[#e9e2d3] bg-white p-4">
                    <p className="text-sm font-black text-[#050505]">
                      {t.backupHistory}
                    </p>
                    {businessBackupHistory.length > 0 ? (
                      <div className="mt-3 max-h-[390px] space-y-2 overflow-y-auto pr-1">
                        {businessBackupHistory.map((record) => (
                          <div
                            key={`${record.fileName}-${record.createdAt}`}
                            className="rounded-xl border border-[#e9e2d3] bg-[#fbfaf7] p-3"
                          >
                            <p className="truncate text-sm font-black text-[#050505]" title={record.fileName}>
                              {new Date(record.createdAt).toLocaleDateString()} · {formatBackupSize(record.size)}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-[#71717a]">
                              {new Date(record.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-semibold text-[#71717a]">
                        {t.noBackupHistory}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={handleCreateBusinessBackup}
                    disabled={!canCreateBusinessBackup || isCreatingBackup || !negocio}
                    className="flex w-full items-center justify-center gap-2"
                  >
                    <Download className="shrink-0" size={18} />
                    {isCreatingBackup ? t.creatingBackup : t.createBackup}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isSuperAdmin && (
          <Card className="overflow-hidden border-[#e9e2d3] bg-white/92 shadow-[0_18px_50px_rgba(15,15,15,0.055)] backdrop-blur-2xl">
            <CardContent className="p-4 sm:p-6">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
                <div className="w-fit rounded-2xl bg-[#050505] p-3">
                  <Database size={24} className="shrink-0 text-[#f4c542]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="mb-2 text-lg font-black text-[#050505]">
                    {t.platformBackup}
                  </h3>
                  <p className="mb-4 text-sm text-[#71717a]">
                    {t.platformBackupDescription}
                  </p>

                  <div className="mb-4 rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4">
                    <p className="text-sm font-black text-[#050505]">
                      {t.lastBackup}
                    </p>
                    {lastPlatformBackup ? (
                      <div className="mt-2 space-y-1 text-sm font-semibold text-[#71717a]">
                        <p className="break-words text-[#050505]">{lastPlatformBackup.fileName}</p>
                        <p>{new Date(lastPlatformBackup.createdAt).toLocaleString()} · {formatBackupSize(lastPlatformBackup.size)}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-semibold text-[#71717a]">
                        {t.noBackupYet}
                      </p>
                    )}
                    <p className="mt-3 text-xs font-semibold leading-relaxed text-[#71717a]">
                      {t.platformBackupIncludes}
                    </p>
                  </div>

                  <div className="mb-4 rounded-2xl border border-[#e9e2d3] bg-white p-4">
                    <p className="text-sm font-black text-[#050505]">
                      {t.backupHistory}
                    </p>
                    {platformBackupHistory.length > 0 ? (
                      <div className="mt-3 max-h-[390px] space-y-2 overflow-y-auto pr-1">
                        {platformBackupHistory.map((record) => (
                          <div
                            key={record.id}
                            className="flex min-w-0 flex-col gap-2 rounded-xl border border-[#e9e2d3] bg-[#fbfaf7] p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-[#050505]" title={record.file_name}>
                                {new Date(record.created_at).toLocaleDateString()} · {String(record.status || 'success').toUpperCase()}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-[#71717a]">
                                {new Date(record.created_at).toLocaleTimeString()} · {formatBackupSize(Number(record.size_bytes || 0))}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="w-full shrink-0 sm:w-auto"
                              onClick={() => handleDownloadStoredPlatformBackup(record)}
                              disabled={!record.storage_bucket || !record.storage_path || downloadingPlatformBackupId === record.id}
                            >
                              <Download className="shrink-0" size={15} />
                              {downloadingPlatformBackupId === record.id ? t.downloadingBackup : t.downloadBackup}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-semibold text-[#71717a]">
                        {t.noBackupHistory}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={handleCreatePlatformBackup}
                    disabled={isCreatingPlatformBackup}
                    className="flex w-full items-center justify-center gap-2"
                  >
                    <Download className="shrink-0" size={18} />
                    {isCreatingPlatformBackup ? t.creatingBackup : t.createPlatformBackup}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isSuperAdmin && (
          <Card className="overflow-hidden border-[#e9e2d3] bg-white/92 shadow-[0_18px_50px_rgba(15,15,15,0.055)] backdrop-blur-2xl">
            <CardContent className="p-4 sm:p-6">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
              <div className="w-fit rounded-2xl bg-[#050505] p-3">
                <Package size={24} className="shrink-0 text-[#f4c542]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="mb-2 text-lg font-black text-[#050505]">
                  {t.inventoryManagement}
                </h3>
                <p className="mb-4 text-sm text-[#71717a]">
                  {t.inventoryDescription}
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    if (!canManageInventorySettings) {
                      showToast(t.ownerOnly, 'error');
                      return;
                    }
                    setIsResetStockModalOpen(true);
                  }}
                  variant="secondary"
                  disabled={!canManageInventorySettings}
                  className="flex w-full items-center justify-center gap-2 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <AlertTriangle className="shrink-0" size={18} />
                  {t.resetStockButton}
                </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden border-[#e9e2d3] bg-white/92 shadow-[0_18px_50px_rgba(15,15,15,0.055)] backdrop-blur-2xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
              <div className="w-fit rounded-2xl bg-[#fff4c7] p-3">
                <Bell size={24} className="shrink-0 text-[#8a6a16]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="mb-2 text-lg font-black text-[#050505]">
                      {t.notifications}
                    </h3>
                    <p className="text-sm text-[#71717a]">
                      {isSuperAdmin
                        ? language === 'es'
                          ? 'Alertas de suscripciones, pagos, trials y actividad de la plataforma.'
                          : 'Subscription, payment, trial, and platform activity alerts.'
                        : t.notificationsDescription}
                    </p>
                  </div>

                  {!isEditingNotificationSettings ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full shrink-0 sm:w-auto"
                      onClick={() => setIsEditingNotificationSettings(true)}
                    >
                      <Pencil className="shrink-0" size={16} />
                      {language === 'es' ? 'Editar alertas' : 'Edit alerts'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full shrink-0 sm:w-auto"
                      onClick={() => {
                        setNotificationSettings(savedNotificationSettings);
                        setIsEditingNotificationSettings(false);
                      }}
                      disabled={savingNotificationSettings}
                    >
                      <X className="shrink-0" size={16} />
                      {language === 'es' ? 'Cancelar edición' : 'Cancel edit'}
                    </Button>
                  )}
                </div>

                <div className="space-y-3 rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-3 sm:p-4">
                  <div>
                    <p className="text-sm font-black text-[#050505]">
                      {t.notificationPreferences}
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-[#71717a]">
                      {t.notificationPreferencesDescription}
                    </p>
                  </div>

                  {([
                    ['support_notifications', t.supportNotifications],
                    ['sales_notifications', t.salesNotifications],
                    ['inventory_notifications', t.inventoryNotifications],
                    ['low_stock_notifications', t.lowStockNotifications],
                    ['accounts_receivable_notifications', t.accountsReceivableNotifications],
                    ['subscription_notifications', t.subscriptionNotifications]
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleNotificationSetting(key)}
                      disabled={!isEditingNotificationSettings || savingNotificationSettings}
                      className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-[#e9e2d3] bg-white px-3 py-3 text-left transition ${
                        isEditingNotificationSettings && !savingNotificationSettings
                          ? 'hover:bg-[#fff9e8]'
                          : 'cursor-not-allowed opacity-75'
                      }`}
                    >
                      <span className="min-w-0 flex-1 text-sm font-black text-[#050505]">
                        {label}
                      </span>
                      <span
                        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                          notificationSettings[key] ? 'bg-[#050505]' : 'bg-[#d4d4d8]'
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                            notificationSettings[key] ? 'left-6' : 'left-1'
                          }`}
                        />
                      </span>
                    </button>
                  ))}
                </div>

                {isEditingNotificationSettings && (
                  <Button
                    type="button"
                    className="mt-4 w-full justify-center"
                    onClick={handleSaveNotificationSettings}
                    disabled={savingNotificationSettings}
                  >
                    <Save className="shrink-0" size={18} />
                    {savingNotificationSettings ? t.saving : t.saveChanges}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-[#e9e2d3] bg-white/92 shadow-[0_18px_50px_rgba(15,15,15,0.055)] backdrop-blur-2xl">
          <CardContent className="p-4 sm:p-6">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
              <div className="w-fit rounded-2xl bg-[#050505] p-3">
                <Shield size={24} className="shrink-0 text-[#f4c542]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="mb-2 text-lg font-black text-[#050505]">
                  {t.security}
                </h3>
                <p className="mb-4 text-sm text-[#71717a]">
                  {isSuperAdmin
                    ? language === 'es'
                      ? 'Administración de usuarios, roles, permisos y accesos de la plataforma.'
                      : 'Manage platform users, roles, permissions, and access.'
                    : t.securityDescription}
                </p>
                <Button type="button" variant="secondary" className="w-full justify-center" disabled>
                  {t.comingSoon}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!isSuperAdmin && (
        <ConfirmDialog
          isOpen={isResetStockModalOpen}
          onCancel={() => setIsResetStockModalOpen(false)}
          onConfirm={handleResetAllStock}
          title={t.resetStockTitle}
          message={t.resetStockMessage}
          confirmText={isResetting ? t.resetting : t.confirmResetStock}
          cancelText={t.cancel}
          type="danger"
        />
      )}
    </div>
  );
}
