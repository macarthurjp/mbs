
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  CreditCard,
  Eye,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Users
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatEmail, formatPhone } from '../utils/formatContact';
import { getEffectivePlan, normalizeSubscriptionStatus } from '../utils/subscriptionPlan';

type Business = {
  id: string;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  moneda: string | null;
  logo_url: string | null;
  plan: string | null;
  estado: string | null;
  trial_ends_at: string | null;
  created_at?: string | null;
};

type BusinessUser = {
  id: string;
  negocio_id: string | null;
  rol: string | null;
  email: string | null;
  username: string | null;
  full_name: string | null;
  is_active: boolean | null;
};


type Subscription = {
  id: number;
  negocio_id: string | null;
  estado: string | null;
  plan: string | null;
  created_at?: string | null;
};


const superAdminCopy = {
  es: {
    loading: 'Cargando panel admin...',
    title: 'Super Admin',
    subtitle: 'Control completo de negocios, usuarios, ventas, planes y suscripciones',
    refresh: 'Actualizar',
    businesses: 'Negocios',
    active: 'Activos',
    users: 'Usuarios',
    blocked: 'Bloqueados',
    trial: 'Trial',
    subscriptions: 'Suscripciones',
    globalSales: 'Ventas globales',
    pending: 'Pendiente',
    searchPlaceholder: 'Buscar negocio, rol, email, plan, estado, teléfono o ID...',
    business: 'Negocio',
    owner: 'Owner',
    roles: 'Roles',
    sales: 'Ventas',
    plan: 'Plan',
    status: 'Estado',
    actions: 'Acciones',
    noPhone: 'Sin teléfono',
    usersText: 'usuarios',
    ownerText: 'owner',
    adminText: 'admin',
    sellerText: 'vendedor',
    subscription: 'Suscripción',
    businessUsers: 'Usuarios del negocio',
    businessDetails: 'Detalles del negocio',
    email: 'Email',
    alias: 'Alias',
    userId: 'ID usuario',
    businessId: 'ID negocio',
    created: 'Creado',
    noBusinessUsers: 'Este negocio todavía no tiene usuarios',
    expandBusiness: 'Ver detalles',
    collapseBusiness: 'Ocultar detalles',
    assignedRoles: 'Roles asignados',
    adminRole: 'Administrador',
    sellerRole: 'Vendedor',
    unknownRole: 'Sin rol',
    activeUser: 'Activo',
    inactiveUser: 'Inactivo',
    view: 'Ver',
    activate: 'Activar',
    block: 'Bloquear',
    noBusinesses: 'No se encontraron negocios',
    saasControl: 'Control SaaS',
    platformGlobalStatus: 'Estado global de la plataforma',
    inTrial: 'en trial',
    visible: 'visibles',
    total: 'total',
    businessDetail: 'Detalle del negocio',
    phone: 'Teléfono',
    noAddress: 'Sin dirección',
    noTrialDate: 'Sin fecha trial',
    trialUntil: 'Trial hasta',
    noRegisteredOwner: 'Sin roles registrados',
    ownerWithoutInfo: 'Sin información de rol',
    loadError: 'Error al cargar datos de plataforma',
    statusUpdated: 'Estado actualizado correctamente',
    statusUpdateError: 'Error al actualizar estado',
    planUpdated: 'Plan actualizado correctamente',
    planUpdateError: 'Error al actualizar plan',
    basic: 'Basic',
    pro: 'Pro',
    premium: 'Premium',
    inactive: 'Inactivo',
    activeStatus: 'Activo',
    blockedStatus: 'Bloqueado',
  },
  en: {
    loading: 'Loading admin panel...',
    title: 'Super Admin',
    subtitle: 'Full control of businesses, users, sales, plans, and subscriptions',
    refresh: 'Refresh',
    businesses: 'Businesses',
    active: 'Active',
    users: 'Users',
    blocked: 'Blocked',
    trial: 'Trial',
    subscriptions: 'Subscriptions',
    globalSales: 'Global Sales',
    pending: 'Pending',
    searchPlaceholder: 'Search business, role, email, plan, status, phone, or ID...',
    business: 'Business',
    owner: 'Owner',
    roles: 'Roles',
    sales: 'Sales',
    plan: 'Plan',
    status: 'Status',
    actions: 'Actions',
    noPhone: 'No phone',
    usersText: 'users',
    ownerText: 'owner',
    adminText: 'admin',
    sellerText: 'seller',
    subscription: 'Subscription',
    businessUsers: 'Business users',
    businessDetails: 'Business details',
    email: 'Email',
    alias: 'Alias',
    userId: 'User ID',
    businessId: 'Business ID',
    created: 'Created',
    noBusinessUsers: 'This business does not have users yet',
    expandBusiness: 'View details',
    collapseBusiness: 'Hide details',
    assignedRoles: 'Assigned roles',
    adminRole: 'Admin',
    sellerRole: 'Seller',
    unknownRole: 'No role',
    activeUser: 'Active',
    inactiveUser: 'Inactive',
    view: 'View',
    activate: 'Activate',
    block: 'Block',
    noBusinesses: 'No businesses found',
    saasControl: 'SaaS Control',
    platformGlobalStatus: 'Global platform status',
    inTrial: 'in trial',
    visible: 'visible',
    total: 'total',
    businessDetail: 'Business detail',
    phone: 'Phone',
    noAddress: 'No address',
    noTrialDate: 'No trial date',
    trialUntil: 'Trial until',
    noRegisteredOwner: 'No registered roles',
    ownerWithoutInfo: 'No role information',
    loadError: 'Error loading platform data',
    statusUpdated: 'Status updated successfully',
    statusUpdateError: 'Error updating status',
    planUpdated: 'Plan updated successfully',
    planUpdateError: 'Error updating plan',
    basic: 'Basic',
    pro: 'Pro',
    premium: 'Premium',
    inactive: 'Inactive',
    activeStatus: 'Active',
    blockedStatus: 'Blocked',
  },
} as const;

const BUSINESSES_PER_PAGE = 10;

type BusinessSummary = Business & {
  usersCount: number;
  businessUsers: BusinessUser[];
  owners: BusinessUser[];
  admins: BusinessUser[];
  sellers: BusinessUser[];
  sellersCount: number;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
};

export default function SuperAdminPage() {
  const { showToast } = useNotification();
  const { language } = useLanguage();
  const t = superAdminCopy[language];

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<BusinessSummary[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedBusinessId, setExpandedBusinessId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);


  const businessSummaries = useMemo(() => {
    return businesses.map((business) => {
      const businessUsers = users.filter((user) => user.negocio_id === business.id);
      const businessSubscription = subscriptions.find((subscription) => subscription.negocio_id === business.id);

      const owners = businessUsers.filter((user) => normalizeRole(user.rol) === 'owner');
      const admins = businessUsers.filter((user) => normalizeRole(user.rol) === 'admin');
      const sellers = businessUsers.filter((user) => normalizeRole(user.rol) === 'seller');

      return {
        ...business,
        plan: getEffectivePlan({
          businessPlan: business.plan,
          subscriptionPlan: businessSubscription?.plan,
          subscriptionStatus: businessSubscription?.estado,
        }),
        estado:
          normalizeSubscriptionStatus(businessSubscription?.estado) ||
          normalizeSubscriptionStatus(business.estado) ||
          business.estado,
        usersCount: businessUsers.length,
        businessUsers,
        owners,
        admins,
        sellers,
        sellersCount: sellers.length,
        subscriptionStatus: businessSubscription?.estado || null,
        subscriptionPlan: businessSubscription?.plan || null
      };
    });
  }, [businesses, users, subscriptions]);

  useEffect(() => {
    const value = search.toLowerCase().trim();

    const filtered = businessSummaries.filter((business) => {
      const usersText = business.businessUsers
        .map((user) => `${user.full_name || ''} ${user.email || ''} ${user.username || ''} ${user.rol || ''}`)
        .join(' ')
        .toLowerCase();

      return (
        business.nombre.toLowerCase().includes(value) ||
        business.id.toLowerCase().includes(value) ||
        (business.plan || '').toLowerCase().includes(value) ||
        (business.estado || '').toLowerCase().includes(value) ||
        (business.telefono || '').toLowerCase().includes(value) ||
        usersText.includes(value)
      );
    });

    setFilteredBusinesses(filtered);
  }, [search, businessSummaries]);

  const totalPages = Math.max(1, Math.ceil(filteredBusinesses.length / BUSINESSES_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * BUSINESSES_PER_PAGE;
  const pageEndIndex = Math.min(pageStartIndex + BUSINESSES_PER_PAGE, filteredBusinesses.length);

  const visibleBusinesses = useMemo(() => {
    return filteredBusinesses.slice(pageStartIndex, pageEndIndex);
  }, [filteredBusinesses, pageStartIndex, pageEndIndex]);

  const metrics = useMemo(() => {
    const active = businessSummaries.filter((business) => business.estado === 'activo').length;
    const trial = businessSummaries.filter((business) => business.plan === 'trial').length;
    const blocked = businessSummaries.filter((business) => business.estado === 'bloqueado').length;
    const totalUsers = users.length;
    const activeSubscriptions = subscriptions.filter((subscription) => subscription.estado === 'activa' || subscription.estado === 'activo').length;
    const businessesWithOwner = businessSummaries.filter((business) => business.owners.length > 0).length;
    const businessesWithoutOwner = businessSummaries.filter((business) => business.owners.length === 0).length;

    return {
      total: businesses.length,
      active,
      trial,
      blocked,
      totalUsers,
      activeSubscriptions,
      businessesWithOwner,
      businessesWithoutOwner
    };
  }, [businesses, users, subscriptions, businessSummaries]);

  const loadPlatformData = useCallback(async () => {
    try {
      setLoading(true);

      const [businessesResult, usersResult, subscriptionsResult] = await Promise.all([
        supabase
          .from('negocios')
          .select('id, nombre, telefono, direccion, moneda, logo_url, plan, estado, trial_ends_at, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('usuarios')
          .select('id, negocio_id, rol, email, username, full_name, is_active')
          .order('created_at', { ascending: false }),
        supabase
          .from('suscripciones')
          .select('id, negocio_id, estado, plan, created_at')
          .order('created_at', { ascending: false })
      ]);

      if (businessesResult.error) throw businessesResult.error;
      if (usersResult.error) throw usersResult.error;
      if (subscriptionsResult.error) throw subscriptionsResult.error;

      setBusinesses((businessesResult.data || []) as unknown as Business[]);
      setUsers((usersResult.data || []) as unknown as BusinessUser[]);
      setSubscriptions((subscriptionsResult.data || []) as unknown as Subscription[]);
    } catch (error) {
      console.error('Error loading platform data:', error);
      showToast(t.loadError, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t.loadError]);

  useEffect(() => {
    loadPlatformData();
  }, [loadPlatformData]);

  async function updateBusinessStatus(id: string, estado: string) {
    try {
      setUpdatingId(id);

      const { error } = await supabase
        .from('negocios')
        .update({ estado })
        .eq('id', id);

      if (error) throw error;

      setBusinesses((prev) =>
        prev.map((business) =>
          business.id === id ? { ...business, estado } : business
        )
      );

      showToast(t.statusUpdated, 'success');
    } catch (error) {
      console.error('Error updating business status:', error);
      showToast(t.statusUpdateError, 'error');
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateBusinessPlan(id: string, plan: string) {
    try {
      setUpdatingId(id);

      const { error } = await supabase
        .from('negocios')
        .update({ plan })
        .eq('id', id);

      if (error) throw error;

      const { error: subscriptionError } = await supabase
        .from('suscripciones')
        .update({ plan })
        .eq('negocio_id', id);

      if (subscriptionError) {
        console.warn('Subscription plan was not updated:', subscriptionError);
      }

      setBusinesses((prev) =>
        prev.map((business) =>
          business.id === id ? { ...business, plan } : business
        )
      );

      showToast(t.planUpdated, 'success');
    } catch (error) {
      console.error('Error updating business plan:', error);
      showToast(t.planUpdateError, 'error');
    } finally {
      setUpdatingId(null);
    }
  }


  function formatPlanLabel(plan: string | null | undefined) {
    if (plan === 'basic') return t.basic;
    if (plan === 'pro') return t.pro;
    if (plan === 'premium') return t.premium;
    return t.trial;
  }

  function formatStatusLabel(status: string | null | undefined) {
    if (status === 'activo') return t.activeStatus;
    if (status === 'bloqueado') return t.blockedStatus;
    if (status === 'inactivo') return t.inactive;
    return status || t.trial;
  }

  function normalizeRole(role: string | null | undefined) {
    const value = String(role || 'seller').trim().toLowerCase();

    if (value === 'superadmin' || value === 'super_admin' || value === 'super-admin') return 'super_admin';
    if (
      value === 'owner' ||
      value === 'dueño' ||
      value === 'dueno' ||
      value === 'owner_negocio' ||
      value === 'business_owner' ||
      value === 'propietario'
    ) {
      return 'owner';
    }
    if (value === 'admin' || value === 'administrador') return 'admin';
    if (value === 'seller' || value === 'vendedor') return 'seller';

    return value;
  }

  function getRoleLabel(role: string | null | undefined) {
    const normalizedRole = normalizeRole(role);
    if (normalizedRole === 'owner') return 'Owner';
    if (normalizedRole === 'admin') return t.adminRole;
    if (normalizedRole === 'seller') return t.sellerRole;
    return t.unknownRole;
  }

  function getUserDisplayName(user: BusinessUser) {
    return user.full_name?.trim() || user.username?.trim() || formatEmail(user.email, t.ownerWithoutInfo);
  }

  function getUserEmail(user: BusinessUser) {
    return formatEmail(user.email, '—');
  }

  function getUserAlias(user: BusinessUser) {
    return user.username?.trim() || '—';
  }

  function getShortId(id: string | null | undefined) {
    if (!id) return '—';
    if (id.length <= 18) return id;
    return `${id.slice(0, 8)}...${id.slice(-6)}`;
  }

  function getSortedBusinessUsers(business: BusinessSummary) {
    const roleOrder = { owner: 0, admin: 1, seller: 2 };

    return [...business.businessUsers].sort((left, right) => {
      const leftRole = normalizeRole(left.rol) as keyof typeof roleOrder;
      const rightRole = normalizeRole(right.rol) as keyof typeof roleOrder;
      return (roleOrder[leftRole] ?? 3) - (roleOrder[rightRole] ?? 3);
    });
  }

  function getRoleCountsLabel(business: BusinessSummary) {
    return `${business.owners.length.toLocaleString('en-US')} ${t.ownerText} · ${business.admins.length.toLocaleString('en-US')} ${t.adminText} · ${business.sellersCount.toLocaleString('en-US')} ${t.sellerText}`;
  }

  function renderUserRoleBadge(role: string | null | undefined) {
    const normalizedRole = normalizeRole(role);
    const className =
      normalizedRole === 'owner'
        ? 'border-[#f7d867] bg-[#fff4c7] text-[#8a6a16]'
        : normalizedRole === 'admin'
          ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
          : 'border-blue-100 bg-blue-50 text-blue-700';

    return (
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${className}`}>
        {getRoleLabel(role)}
      </span>
    );
  }

  function renderUserStatusBadge(isActive: boolean | null) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${
          isActive === false ? 'bg-red-50 text-red-700' : 'bg-[#050505] text-[#f4c542]'
        }`}
      >
        {isActive === false ? t.inactiveUser : t.activeUser}
      </span>
    );
  }

  function renderBusinessExpandedDetails(business: BusinessSummary) {
    const businessUsers = getSortedBusinessUsers(business);

    return (
      <div className="grid gap-4 rounded-[1.5rem] border border-[#efe7d8] bg-white/88 p-4 shadow-[0_16px_42px_rgba(15,15,15,0.05)] lg:grid-cols-[minmax(0,0.58fr)_minmax(0,1.42fr)]">
        <div className="min-w-0 rounded-[1.25rem] border border-[#f1ebdf] bg-[#fffdf8] p-4">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[#8a6a16]">
            {t.businessDetails}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <InfoMini label={t.phone} value={formatPhone(business.telefono, t.noPhone)} detail={business.direccion || t.noAddress} />
            <InfoMini label={t.plan} value={formatPlanLabel(business.plan)} detail={`${t.subscription}: ${business.subscriptionStatus || '—'}`} />
            <InfoMini label={t.status} value={formatStatusLabel(business.estado)} detail={business.trial_ends_at ? `${t.trialUntil} ${new Date(business.trial_ends_at).toLocaleDateString()}` : t.noTrialDate} />
            <div className="min-w-0 rounded-2xl border border-[#e9e2d3] bg-white px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.businessId}</p>
              <p className="mt-2 inline-flex max-w-full rounded-xl bg-[#fbfaf7] px-3 py-2 font-mono text-xs font-black text-[#050505]" title={business.id}>
                {getShortId(business.id)}
              </p>
              <p className="mt-2 text-xs font-semibold text-[#71717a]">
                {t.created}: {business.created_at ? new Date(business.created_at).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-[1.25rem] border border-[#f1ebdf] bg-[#fffdf8] p-4">
          <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a6a16]">
                {t.businessUsers}
              </p>
              <p className="mt-1 text-sm font-bold text-[#71717a]">{getRoleCountsLabel(business)}</p>
            </div>
            <span className="shrink-0 rounded-full bg-[#050505] px-3 py-1 text-xs font-black text-[#f4c542]">
              {business.usersCount.toLocaleString('en-US')}
            </span>
          </div>

          {businessUsers.length === 0 ? (
            <div className="rounded-2xl border border-[#e9e2d3] bg-white px-4 py-5 text-sm font-bold text-[#71717a]">
              {t.noBusinessUsers}
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.75rem] border border-[#e9e2d3] bg-white">
              {businessUsers.map((user) => {
                return (
                  <div key={user.id} className="grid gap-4 border-b border-[#f1ebdf] px-5 py-5 last:border-b-0 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.6fr)] lg:items-center">
                    <div className="min-w-0">
                      <p className="break-words text-xl font-black leading-tight text-[#050505] xl:text-2xl">{getUserDisplayName(user)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {renderUserRoleBadge(user.rol)}
                        {renderUserStatusBadge(user.is_active)}
                      </div>
                    </div>

                    <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                      <div className="min-w-0 overflow-hidden rounded-xl bg-[#fbfaf7] px-3.5 py-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.email}</p>
                        <p className="mt-1 max-w-full truncate text-sm font-black leading-tight text-[#52525b]" title={getUserEmail(user)}>
                          {getUserEmail(user)}
                        </p>
                      </div>
                      <div className="min-w-0 overflow-hidden rounded-xl bg-[#fbfaf7] px-3.5 py-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.alias}</p>
                        <p className="mt-1 max-w-full truncate text-sm font-black leading-tight text-[#52525b]" title={getUserAlias(user)}>{getUserAlias(user)}</p>
                        <div className="mt-2 border-t border-[#eee5d7] pt-2">
                          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.userId}</p>
                          <p className="mt-1 inline-flex max-w-full truncate rounded-xl bg-white px-2.5 py-1.5 font-mono text-[10px] font-black text-[#71717a]" title={user.id}>
                            {getShortId(user.id)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden text-[#08080b] sm:space-y-8">
      <section className="relative min-w-0 overflow-hidden rounded-[2rem] border border-[#e9e2d3]/80 bg-[#fffdf8]/85 p-5 shadow-[0_24px_70px_rgba(15,15,15,0.07)] backdrop-blur-2xl sm:p-7 xl:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,197,66,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.88),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f4c542]/60 to-transparent" />
        <div className="relative z-10 flex min-w-0 flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#eadfca] bg-white/75 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6a16] shadow-sm backdrop-blur-xl">
              <Shield size={14} />
              MatMax Business Suite
            </div>
            <h1 className="mb-3 text-4xl font-black tracking-tight text-[#050505] sm:text-5xl xl:text-[4rem]">
              {t.title}
            </h1>
            <p className="max-w-4xl text-sm font-bold uppercase tracking-[0.18em] text-[#71717a] sm:text-base">
              {t.subtitle}
            </p>
          </div>

          <Button type="button" variant="secondary" className="w-full rounded-2xl border border-[#e9e2d3] bg-white/90 px-5 py-3 shadow-[0_14px_34px_rgba(15,15,15,0.05)] hover:-translate-y-0.5 sm:w-auto" onClick={loadPlatformData}>
            <RefreshCw className="shrink-0" size={18} />
            {t.refresh}
          </Button>
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard title={t.businesses} value={metrics.total.toLocaleString('en-US')} icon={Building2} iconClass="bg-[#050505] text-[#f4c542]" />
        <MetricCard title={t.active} value={metrics.active.toLocaleString('en-US')} icon={TrendingUp} iconClass="bg-[#050505] text-[#f4c542]" />
        <MetricCard title={t.users} value={metrics.totalUsers.toLocaleString('en-US')} icon={Users} iconClass="bg-[#fff4c7] text-[#8a6a16]" />
        <MetricCard title={t.blocked} value={metrics.blocked.toLocaleString('en-US')} icon={AlertTriangle} iconClass="bg-red-100 text-red-700" />
        <MetricCard title={t.trial} value={metrics.trial.toLocaleString('en-US')} icon={Sparkles} iconClass="bg-[#fff4c7] text-[#8a6a16]" />
        <MetricCard title={t.subscriptions} value={metrics.activeSubscriptions.toLocaleString('en-US')} icon={CreditCard} iconClass="bg-[#050505] text-[#f4c542]" />
        <MetricCard title={language === 'es' ? 'Con owner' : 'With owner'} value={metrics.businessesWithOwner.toLocaleString('en-US')} icon={Shield} iconClass="bg-emerald-50 text-emerald-700" />
        <MetricCard title={language === 'es' ? 'Owner pendiente' : 'Owner pending'} value={metrics.businessesWithoutOwner.toLocaleString('en-US')} icon={AlertTriangle} iconClass="bg-red-100 text-red-700" />
      </div>

      <div className="rounded-[1.6rem] border border-[#e9e2d3] bg-white/92 p-4 shadow-[0_18px_50px_rgba(15,15,15,0.06)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 shrink-0 -translate-y-1/2 transform text-[#a1a1aa]" size={20} />
          <Input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="overflow-hidden border-[#e9e2d3] bg-white/92 shadow-[0_22px_65px_rgba(15,15,15,0.06)] backdrop-blur-2xl">
        <CardContent className="p-4 sm:p-5">
          <div className="hidden rounded-[2rem] border border-[#f1ebdf] bg-[#fffdf8] xl:block">
            <table className="w-full table-fixed">
              <thead className="border-b border-[#e9e2d3] bg-[#fbfaf7]">
                <tr>
                  <th className="w-[31%] px-4 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.business}</th>
                  <th className="w-[18%] px-4 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.users}</th>
                  <th className="w-[18%] px-4 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.plan}</th>
                  <th className="w-[12%] px-4 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.status}</th>
                  <th className="w-[8%] px-4 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.trial}</th>
                  <th className="w-[13%] px-4 py-4 text-right text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1ebdf]">
                {visibleBusinesses.map((business) => {
                  const isExpanded = expandedBusinessId === business.id;

                  return (
                    <Fragment key={business.id}>
                      <tr className="transition-all duration-300 hover:bg-[#fff9e8]">
                        <td className="px-4 py-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <button
                              type="button"
                              onClick={() => setExpandedBusinessId(isExpanded ? null : business.id)}
                              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e9e2d3] bg-white text-[#8a6a16] transition-all hover:-translate-y-0.5 hover:bg-[#fff4c7]"
                              title={isExpanded ? t.collapseBusiness : t.expandBusiness}
                            >
                              <ChevronDown className={`shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} size={17} />
                            </button>
                            <div className="min-w-0">
                              <p className="truncate font-black text-[#050505]">{business.nombre}</p>
                              <p className="mt-1 truncate text-sm font-semibold text-[#71717a]">{formatPhone(business.telefono, t.noPhone)}</p>
                              <p className="mt-1 truncate text-xs font-semibold text-[#a1a1aa]">ID: {business.id}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-black text-[#050505]">{business.usersCount.toLocaleString('en-US')} {t.usersText}</p>
                          <p className="mt-1 text-xs font-semibold text-[#71717a]">
                            <span className="block truncate">
                              {isExpanded ? t.collapseBusiness : t.expandBusiness}
                            </span>
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <div className="w-full min-w-0">
                            <Select
                              value={business.plan || 'trial'}
                              onChange={(e) => updateBusinessPlan(business.id, e.target.value)}
                              disabled={updatingId === business.id}
                              className="w-full py-2.5 text-sm"
                              options={[
                                { value: 'trial', label: t.trial },
                                { value: 'basic', label: t.basic },
                                { value: 'pro', label: t.pro },
                                { value: 'premium', label: t.premium }
                              ]}
                            />
                          </div>
                          {business.subscriptionStatus && (
                            <p className="mt-2 text-xs font-black uppercase tracking-wide text-[#71717a]">
                              {business.subscriptionStatus}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex max-w-full items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${
                              business.estado === 'activo'
                                ? 'bg-[#050505] text-[#f4c542]'
                                : business.estado === 'bloqueado'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-[#fff4c7] text-[#8a6a16]'
                            }`}
                          >
                            {formatStatusLabel(business.estado)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-[#71717a]">
                          {business.trial_ends_at
                            ? new Date(business.trial_ends_at).toLocaleDateString()
                            : '—'}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" onClick={() => setSelectedBusiness(business)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#e9e2d3] bg-white text-[#050505] transition-all hover:-translate-y-0.5 hover:bg-[#fff9e8]" title={t.view}>
                              <Eye className="shrink-0" size={16} />
                            </button>
                            <button type="button" disabled={updatingId === business.id || business.estado === 'activo'} onClick={() => updateBusinessStatus(business.id, 'activo')} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 transition-all hover:-translate-y-0.5 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40" title={t.activate}>
                              <Shield className="shrink-0" size={16} />
                            </button>
                            <button type="button" disabled={updatingId === business.id || business.estado === 'bloqueado'} onClick={() => updateBusinessStatus(business.id, 'bloqueado')} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-700 transition-all hover:-translate-y-0.5 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40" title={t.block}>
                              <AlertTriangle className="shrink-0" size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-[#fbfaf7] px-4 py-4">
                            {renderBusinessExpandedDetails(business)}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-[#e9e2d3] bg-white xl:hidden">
            {visibleBusinesses.map((business) => {
              const isExpanded = expandedBusinessId === business.id;

              return (
                <article key={business.id} className="relative overflow-hidden rounded-[1.5rem] border border-[#e9e2d3] bg-white p-4 shadow-[0_14px_34px_rgba(15,15,15,0.06)]">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.10),transparent_38%)]" />
                  <div className="relative z-10 space-y-4">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <button
                          type="button"
                          onClick={() => setExpandedBusinessId(isExpanded ? null : business.id)}
                          className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e9e2d3] bg-white text-[#8a6a16] transition-all hover:bg-[#fff4c7]"
                          title={isExpanded ? t.collapseBusiness : t.expandBusiness}
                        >
                          <ChevronDown className={`shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} size={18} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.business}</p>
                          <h3 className="mt-1 break-words text-xl font-black text-[#050505]">{business.nombre}</h3>
                          <p className="mt-1 text-sm font-semibold text-[#71717a]">{formatPhone(business.telefono, t.noPhone)}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${business.estado === 'activo' ? 'bg-[#050505] text-[#f4c542]' : business.estado === 'bloqueado' ? 'bg-red-100 text-red-700' : 'bg-[#fff4c7] text-[#8a6a16]'}`}>
                        {formatStatusLabel(business.estado)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#f1ebdf] bg-[#fffdf8] p-3 sm:grid-cols-3">
                      <InfoMini label={t.users} value={`${business.usersCount.toLocaleString('en-US')} ${t.usersText}`} detail={isExpanded ? t.collapseBusiness : t.expandBusiness} />
                      <InfoMini label={t.plan} value={formatPlanLabel(business.plan)} detail={`${t.subscription}: ${business.subscriptionStatus || '—'}`} />
                      <InfoMini label={t.trial} value={business.trial_ends_at ? new Date(business.trial_ends_at).toLocaleDateString() : '—'} detail={business.direccion || t.noAddress} />
                    </div>

                    {isExpanded && renderBusinessExpandedDetails(business)}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <div className="min-w-0">
                        <Select
                          label={t.plan}
                          value={business.plan || 'trial'}
                          onChange={(e) => updateBusinessPlan(business.id, e.target.value)}
                          disabled={updatingId === business.id}
                          options={[
                            { value: 'trial', label: t.trial },
                            { value: 'basic', label: t.basic },
                            { value: 'pro', label: t.pro },
                            { value: 'premium', label: t.premium }
                          ]}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={() => setSelectedBusiness(business)}>
                          <Eye className="shrink-0" size={16} />
                          {t.view}
                        </Button>
                        <Button type="button" className="flex-1 sm:flex-none" disabled={updatingId === business.id || business.estado === 'activo'} onClick={() => updateBusinessStatus(business.id, 'activo')}>
                          <Shield className="shrink-0" size={16} />
                          {t.activate}
                        </Button>
                        <Button type="button" variant="secondary" className="flex-1 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 sm:flex-none" disabled={updatingId === business.id || business.estado === 'bloqueado'} onClick={() => updateBusinessStatus(business.id, 'bloqueado')}>
                          <AlertTriangle className="shrink-0" size={16} />
                          {t.block}
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredBusinesses.length === 0 && (
            <div className="border-t border-[#f1ebdf] bg-[#fbfaf7] py-12 text-center font-semibold text-[#71717a]">
              {t.noBusinesses}
            </div>
          )}

          {filteredBusinesses.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t border-[#f1ebdf] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-black text-[#71717a]">
                {safeCurrentPage.toLocaleString('en-US')} / {totalPages.toLocaleString('en-US')} · {pageStartIndex + 1}-{pageEndIndex} / {filteredBusinesses.length.toLocaleString('en-US')}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage <= 1}>
                  ‹
                </Button>
                <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage >= totalPages}>
                  ›
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-[1.6rem] border border-[#e9e2d3] bg-[#050505] p-4 text-white shadow-[0_22px_70px_rgba(15,15,15,0.1)] sm:rounded-[2rem] sm:p-6">
        <div className="flex min-w-0 flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-[#f4c542]">
              {t.saasControl}
            </p>
            <h2 className="text-xl font-serif font-bold sm:text-2xl">{t.platformGlobalStatus}</h2>
            <p className="mt-2 text-sm font-medium text-white/55">
              {metrics.active.toLocaleString('en-US')} {t.businesses.toLowerCase()} {t.active.toLowerCase()} · {metrics.trial.toLocaleString('en-US')} {t.inTrial} · {metrics.activeSubscriptions.toLocaleString('en-US')} {t.subscriptions.toLowerCase()} · {metrics.totalUsers.toLocaleString('en-US')} {t.usersText}
            </p>
          </div>
          <div className="w-full rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-[#f4c542] md:w-auto">
            {filteredBusinesses.length.toLocaleString('en-US')} {t.visible} / {businesses.length.toLocaleString('en-US')} {t.total}
          </div>
        </div>
      </div>

      <Modal
        isOpen={!!selectedBusiness}
        onClose={() => setSelectedBusiness(null)}
        title={t.businessDetail}
      >
        {selectedBusiness && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.business}</p>
              <h3 className="mt-2 text-2xl font-black text-[#050505]">{selectedBusiness.nombre}</h3>
              <p className="mt-1 break-all text-sm font-semibold text-[#71717a]">{selectedBusiness.id}</p>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
              <InfoBox label={t.phone} value={formatPhone(selectedBusiness.telefono, '—')} detail={selectedBusiness.direccion || t.noAddress} />
              <InfoBox label={t.plan} value={formatPlanLabel(selectedBusiness.plan)} detail={`${t.subscription}: ${selectedBusiness.subscriptionStatus || '—'}`} />
              <InfoBox label={t.users} value={selectedBusiness.usersCount.toLocaleString('en-US')} detail={getRoleCountsLabel(selectedBusiness)} />
              <InfoBox label={t.status} value={formatStatusLabel(selectedBusiness.estado)} detail={selectedBusiness.trial_ends_at ? `${t.trialUntil} ${new Date(selectedBusiness.trial_ends_at).toLocaleDateString()}` : t.noTrialDate} />
            </div>

            {renderBusinessExpandedDetails(selectedBusiness)}
          </div>
        )}
      </Modal>
    </div>
  );
}


function MetricCard({
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
    <div className="group relative flex min-w-0 items-center justify-between gap-4 overflow-hidden rounded-[1.75rem] border border-[#e9e2d3]/85 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,15,15,0.055)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#f4c542]/35 hover:bg-white hover:shadow-[0_28px_70px_rgba(15,15,15,0.09)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.09),transparent_38%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10 min-w-0 flex-1 overflow-hidden pr-2">
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#8a6a16] sm:text-[11px]">
          {title}
        </p>
        <p className="max-w-full whitespace-nowrap text-[1.9rem] font-black leading-none tracking-tight tabular-nums text-[#050505] sm:text-[2.15rem] xl:text-[2rem] 2xl:text-[2.25rem]">
          {value}
        </p>
      </div>
      <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] shadow-[0_18px_40px_rgba(15,15,15,0.12)] transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 sm:h-14 sm:w-14 ${iconClass}`}>
        <Icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
      </div>
    </div>
  );
}

function InfoMini({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6a16]">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-[#050505]">{value}</p>
      <p className="mt-1 break-words text-xs font-semibold text-[#71717a]">{detail}</p>
    </div>
  );
}

function InfoBox({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#e9e2d3] bg-white p-4 shadow-matmax-soft">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#8a6a16]">{label}</p>
      <p className="break-words text-lg font-black text-[#050505]">{value}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#71717a]">{detail}</p>
    </div>
  );
}
