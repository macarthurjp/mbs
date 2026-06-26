import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, CreditCard, Plus, Search, Edit2, Trash2, Users, Wallet, UserRound, MapPin, Mail, Phone } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getUserRoleFlags } from '../utils/roles';
import {
  DEFAULT_PHONE_INPUT_VALUE,
  formatEmail,
  formatPhone,
  normalizePhoneForStorage,
  sanitizePhoneInput
} from '../utils/formatContact';

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


const clientsCopy = {
  es: {
    loading: 'Cargando clientes...',
    missingTitle: 'Usuario sin negocio asignado',
    missingText: 'El login funciona, pero este usuario todavía no existe en la tabla usuarios o no tiene un negocio_id asignado.',
    title: 'Clientes',
    subtitle: 'Administra tu base de datos de clientes',
    totalClients: 'Total clientes',
    clientsWithDebt: 'Clientes con deuda',
    totalDebt: 'Deuda total',
    totalCreditLimit: 'Límite total',
    sellerReadOnly: 'Los vendedores no pueden eliminar clientes',
    newClient: 'Nuevo Cliente',
    searchPlaceholder: 'Buscar por nombre, teléfono, email o dirección...',
    client: 'Cliente',
    phone: 'Teléfono',
    email: 'Email',
    address: 'Dirección',
    creditLimit: 'Límite Crédito',
    balance: 'Saldo',
    availableCredit: 'Disponible',
    actions: 'Acciones',
    profile: 'Perfil',
    financialSummary: 'Resumen financiero',
    showing: 'Mostrando',
    of: 'de',
    previous: 'Anterior',
    next: 'Siguiente',
    page: 'Página',
    noClients: 'No se encontraron clientes',
    editClient: 'Editar Cliente',
    fullName: 'Nombre Completo / Razón Social',
    fullNamePlaceholder: 'Ej. María García',
    phonePlaceholder: 'Ej. +1 (809) 555-1234',
    emailPlaceholder: 'cliente@email.com',
    addressPlaceholder: 'Calle, ciudad, país',
    initialBalance: 'Saldo Inicial',
    sellerFinancialLocked: 'Solo administrador puede modificar crédito y saldo',
    sellerSensitiveLocked: 'Solo administrador puede modificar teléfono, email y dirección de un cliente existente',
    cancel: 'Cancelar',
    updateClient: 'Actualizar Cliente',
    createClient: 'Crear Cliente',
    loadError: 'Error al cargar los clientes',
    noUser: 'No hay usuario autenticado',
    noBusiness: 'No se encontró el negocio del usuario',
    nameRequired: 'El nombre del cliente es obligatorio',
    clientUpdated: 'Cliente actualizado correctamente',
    clientCreated: 'Cliente creado correctamente',
    saveError: 'Error al guardar el cliente',
    deleteTitle: 'Eliminar Cliente',
    deleteMessage: '¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.',
    deleteConfirm: 'Sí, eliminar',
    clientDeleted: 'Cliente eliminado correctamente',
    deleteError: 'Error al eliminar el cliente',
  },
  en: {
    loading: 'Loading clients...',
    missingTitle: 'User has no assigned business',
    missingText: 'Login works, but this user does not exist in the usuarios table yet or does not have an assigned negocio_id.',
    title: 'Clients',
    subtitle: 'Manage your client database',
    totalClients: 'Total clients',
    clientsWithDebt: 'Clients with debt',
    totalDebt: 'Total debt',
    totalCreditLimit: 'Total credit limit',
    sellerReadOnly: 'Sellers cannot delete clients',
    newClient: 'New Client',
    searchPlaceholder: 'Search by name, phone, email, or address...',
    client: 'Client',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    creditLimit: 'Credit Limit',
    balance: 'Balance',
    availableCredit: 'Available',
    actions: 'Actions',
    profile: 'Profile',
    financialSummary: 'Financial summary',
    showing: 'Showing',
    of: 'of',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    noClients: 'No clients found',
    editClient: 'Edit Client',
    fullName: 'Full Name / Business Name',
    fullNamePlaceholder: 'Ex. Maria Garcia',
    phonePlaceholder: 'Ex. +1 (809) 555-1234',
    emailPlaceholder: 'client@email.com',
    addressPlaceholder: 'Street, city, country',
    initialBalance: 'Initial Balance',
    sellerFinancialLocked: 'Only admin can modify credit and balance',
    sellerSensitiveLocked: 'Only admin can modify phone, email, and address for an existing client',
    cancel: 'Cancel',
    updateClient: 'Update Client',
    createClient: 'Create Client',
    loadError: 'Error loading clients',
    noUser: 'No authenticated user',
    noBusiness: 'The user business was not found',
    nameRequired: 'Client name is required',
    clientUpdated: 'Client updated successfully',
    clientCreated: 'Client created successfully',
    saveError: 'Error saving client',
    deleteTitle: 'Delete Client',
    deleteMessage: 'Are you sure you want to delete this client? This action cannot be undone.',
    deleteConfirm: 'Yes, delete',
    clientDeleted: 'Client deleted successfully',
    deleteError: 'Error deleting client',
  },
} as const;

type CurrencySettings = {
  code: string;
  symbol: string;
};

const DEFAULT_CURRENCY: CurrencySettings = {
  code: 'USD',
  symbol: '$'
};

const CLIENTS_PER_PAGE = 50;

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

function formatCurrency(value: number | null | undefined) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatMoney(value: number | null | undefined, currency: CurrencySettings) {
  return `${currency.symbol} ${formatCurrency(value)}`;
}

function formatClientCode(id: number) {
  return `CLI-${String(id).padStart(4, '0')}`;
}

function getAvailableCredit(client: Cliente) {
  return Math.max(0, Number(client.limite_credito || 0) - Number(client.saldo || 0));
}

function getDisplayBalance(client: Cliente) {
  return Math.abs(Number(client.saldo || 0));
}

export function ClientsPage() {
  const { user, userProfile } = useAuth();
  const { isSeller } = getUserRoleFlags(userProfile);
  const { showToast, showConfirm } = useNotification();
  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [clients, setClients] = useState<Cliente[]>([]);
  const [filteredClients, setFilteredClients] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [missingNegocio, setMissingNegocio] = useState(false);
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY);

  const { language } = useLanguage();
  const t = clientsCopy[language];

  const [formData, setFormData] = useState({
    nombre: '',
    telefono: DEFAULT_PHONE_INPUT_VALUE,
    email: '',
    direccion: '',
    limite_credito: '0',
    saldo: '0'
  });

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / CLIENTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * CLIENTS_PER_PAGE;
  const pageEndIndex = Math.min(pageStartIndex + CLIENTS_PER_PAGE, filteredClients.length);
  const visibleClients = useMemo(() => {
    return filteredClients.slice(pageStartIndex, pageEndIndex);
  }, [filteredClients, pageStartIndex, pageEndIndex]);

  const clientMetrics = useMemo(() => {
    const totalDebt = clients.reduce((sum, client) => {
      const balance = Number(client.saldo || 0);
      return sum + (balance > 0 ? balance : 0);
    }, 0);
    const totalCreditLimit = clients.reduce((sum, client) => sum + Number(client.limite_credito || 0), 0);
    const clientsWithDebt = clients.filter((client) => Number(client.saldo || 0) > 0).length;

    return {
      totalClients: clients.length,
      clientsWithDebt,
      totalDebt,
      totalCreditLimit
    };
  }, [clients]);

  useEffect(() => {
    const search = searchTerm.toLowerCase().trim();

    const filtered = clients.filter((client) => {
      return (
        client.nombre.toLowerCase().includes(search) ||
        (client.telefono || '').toLowerCase().includes(search) ||
        (client.email || '').toLowerCase().includes(search) ||
        (client.direccion || '').toLowerCase().includes(search)
      );
    });

    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        setClients([]);
        setFilteredClients([]);
        setCurrencySettings(DEFAULT_CURRENCY);
        setMissingNegocio(false);
        return;
      }

      const currentNegocioId = userProfile?.negocio_id || null;
      setNegocioId(currentNegocioId);

      if (!currentNegocioId) {
        setClients([]);
        setFilteredClients([]);
        setCurrencySettings(DEFAULT_CURRENCY);
        setMissingNegocio(true);
        return;
      }

      const [clientsResult, businessResult] = await Promise.all([
        supabase
          .from('clientes')
          .select('*')
          .eq('negocio_id', currentNegocioId)
          .order('created_at', { ascending: false }),
        supabase
          .from('negocios')
          .select('*')
          .eq('id', currentNegocioId)
          .maybeSingle()
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (businessResult.error) throw businessResult.error;

      setMissingNegocio(false);
      setCurrencySettings(normalizeCurrencySettings(businessResult.data));
      setClients(clientsResult.data || []);
      setFilteredClients(clientsResult.data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      showToast(t.loadError, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t.loadError, user?.id, userProfile?.negocio_id]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!user) {
      showToast(t.noUser, 'error');
      return;
    }

    if (!negocioId) {
      showToast(t.noBusiness, 'error');
      return;
    }

    if (!formData.nombre.trim()) {
      showToast(t.nameRequired, 'error');
      return;
    }

    try {
      const normalizedPhone = normalizePhoneForStorage(formData.telefono);
      const clientData = editingClient && isSeller
        ? {
            nombre: formData.nombre.trim()
          }
        : isSeller
        ? {
            negocio_id: negocioId,
            nombre: formData.nombre.trim(),
            telefono: normalizedPhone,
            email: formData.email.trim().toLowerCase() || null,
            direccion: formData.direccion.trim() || null
          }
        : {
            negocio_id: negocioId,
            nombre: formData.nombre.trim(),
            telefono: normalizedPhone,
            email: formData.email.trim().toLowerCase() || null,
            direccion: formData.direccion.trim() || null,
            limite_credito: Number(formData.limite_credito || 0),
            saldo: Number(formData.saldo || 0)
          };

      if (editingClient) {
        const { error } = await supabase
          .from('clientes')
          .update(clientData)
          .eq('id', editingClient.id)
          .eq('negocio_id', negocioId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([clientData]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingClient(null);
      resetForm();
      await loadClients();
      showToast(editingClient ? t.clientUpdated : t.clientCreated, 'success');
    } catch (error) {
      console.error('Error saving client:', error);
      showToast(t.saveError, 'error');
    }
  }


  async function handleDelete(id: number) {
    if (isSeller) {
      showToast(t.sellerReadOnly, 'error');
      return;
    }
    if (!negocioId) {
      showToast(t.noBusiness, 'error');
      return;
    }

    const confirmed = await showConfirm({
      title: t.deleteTitle,
      message: t.deleteMessage,
      confirmText: t.deleteConfirm,
      cancelText: t.cancel,
      variant: 'danger'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)
        .eq('negocio_id', negocioId);

      if (error) throw error;
      showToast(t.clientDeleted, 'success');
      await loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      showToast(t.deleteError, 'error');
    }
  }

  function openEditModal(client: Cliente) {
    setEditingClient(client);
    setFormData({
      nombre: client.nombre,
      telefono: client.telefono || '',
      email: client.email || '',
      direccion: client.direccion || '',
      limite_credito: Number(client.limite_credito || 0).toString(),
      saldo: Number(client.saldo || 0).toString()
    });
    setIsModalOpen(true);
  }

  function resetForm() {
    setFormData({
      nombre: '',
      telefono: DEFAULT_PHONE_INPUT_VALUE,
      email: '',
      direccion: '',
      limite_credito: '0',
      saldo: '0'
    });
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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,197,66,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.88),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f4c542]/60 to-transparent" />
        <div className="relative z-10 flex min-w-0 flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#eadfca] bg-white/75 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6a16] shadow-sm backdrop-blur-xl">
              <Users size={14} />
              MatMax Business Suite
            </div>
            <h1 className="mb-3 text-4xl font-black tracking-tight text-[#050505] sm:text-5xl xl:text-6xl">
              {t.title}
            </h1>
            <p className="max-w-3xl text-sm font-bold uppercase tracking-[0.18em] text-[#71717a] sm:text-base">
              {t.subtitle}
            </p>
          </div>
          <Button
            type="button"
            className="w-full gap-2 rounded-2xl shadow-[0_18px_45px_rgba(0,0,0,0.18)] sm:w-auto"
            onClick={() => {
              resetForm();
              setEditingClient(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="shrink-0" size={20} />
            {t.newClient}
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <ClientMetricCard
          title={t.totalClients}
          value={clientMetrics.totalClients.toLocaleString('en-US')}
          icon={Users}
          iconClass="bg-[#050505] text-[#f4c542]"
        />

        <ClientMetricCard
          title={t.clientsWithDebt}
          value={clientMetrics.clientsWithDebt.toLocaleString('en-US')}
          icon={AlertTriangle}
          iconClass="bg-red-100 text-red-700"
          valueClass="text-red-600"
        />

        <ClientMetricCard
          title={t.totalDebt}
          value={formatMoney(clientMetrics.totalDebt, currencySettings)}
          icon={Wallet}
          iconClass="bg-[#fff4c7] text-[#8a6a16]"
          valueClass={clientMetrics.totalDebt > 0 ? 'text-red-600' : 'text-[#050505]'}
        />

        <ClientMetricCard
          title={t.totalCreditLimit}
          value={formatMoney(clientMetrics.totalCreditLimit, currencySettings)}
          icon={CreditCard}
          iconClass="bg-[#f6f4ee] text-[#050505]"
        />
      </section>

      <section className="rounded-[2rem] border border-[#e9e2d3]/80 bg-white/82 p-4 shadow-[0_18px_55px_rgba(15,15,15,0.055)] backdrop-blur-2xl sm:p-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 shrink-0 -translate-y-1/2 transform text-[#a1a1aa]" size={20} />
          <Input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11"
          />
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-[2rem] border border-[#e9e2d3]/80 bg-white/90 shadow-[0_22px_65px_rgba(15,15,15,0.06)] backdrop-blur-2xl">
        <div className="border-b border-[#f1ebdf] bg-white/75 px-5 py-5 backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#8a6a16]">{t.profile}</p>
              <h2 className="mt-1 text-xl font-black text-[#050505] sm:text-2xl">{t.title}</h2>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <p className="inline-flex rounded-full border border-[#e9e2d3] bg-[#fbfaf7] px-4 py-2 text-sm font-black text-[#71717a] shadow-sm">
                {filteredClients.length.toLocaleString('en-US')} / {clients.length.toLocaleString('en-US')}
              </p>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a1a1aa]">
                {t.showing} {filteredClients.length === 0 ? 0 : pageStartIndex + 1}-{pageEndIndex} {t.of} {filteredClients.length.toLocaleString('en-US')}
              </p>
            </div>
          </div>
        </div>

        <div className="hidden p-4 lg:grid lg:gap-4 xl:grid-cols-2">
          {visibleClients.map((client) => (
            <article
              key={client.id}
              className="group relative overflow-hidden rounded-[1.75rem] border border-[#ece5d7] bg-[#fffdf8]/92 p-5 shadow-[0_18px_50px_rgba(15,15,15,0.055)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#f4c542]/40 hover:bg-white hover:shadow-[0_28px_70px_rgba(15,15,15,0.1)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.12),transparent_34%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="relative z-10 flex min-w-0 items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-[#050505] text-[#f4c542] shadow-[0_18px_38px_rgba(0,0,0,0.2)]">
                    <UserRound size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8a6a16]">{formatClientCode(client.id)}</p>
                    <h3 className="mt-1 break-words text-xl font-black leading-tight text-[#050505]" title={client.nombre}>{client.nombre}</h3>
                    <div className="mt-3 grid gap-2 text-sm font-semibold text-[#71717a]">
                      <p className="flex min-w-0 items-start gap-2">
                        <Phone size={15} className="mt-0.5 shrink-0 text-[#8a6a16]" />
                        <span className="break-words">{formatPhone(client.telefono)}</span>
                      </p>
                      <p className="flex min-w-0 items-start gap-2">
                        <Mail size={15} className="mt-0.5 shrink-0 text-[#8a6a16]" />
                        <span className="break-all">{formatEmail(client.email)}</span>
                      </p>
                      <p className="flex min-w-0 items-start gap-2">
                        <MapPin size={15} className="mt-0.5 shrink-0 text-[#8a6a16]" />
                        <span className="break-words">{client.direccion || '-'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 opacity-90 transition-opacity duration-300 group-hover:opacity-100">
                  <button onClick={() => openEditModal(client)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#f4c542]/30 bg-[#fff4c7] text-[#8a6a16] transition-all hover:-translate-y-0.5 hover:bg-[#ffeaa3]" type="button" aria-label={t.editClient}>
                    <Edit2 className="shrink-0" size={17} />
                  </button>
                  {!isSeller && (
                    <button onClick={() => handleDelete(client.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600 transition-all hover:-translate-y-0.5 hover:bg-red-100" type="button" aria-label={t.deleteTitle}>
                      <Trash2 className="shrink-0" size={17} />
                    </button>
                  )}
                </div>
              </div>

              <div className="relative z-10 mt-5 grid grid-cols-3 gap-3 rounded-[1.4rem] border border-[#f1ebdf] bg-white/82 p-3 shadow-inner">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.creditLimit}</p>
                  <p className="mt-1 truncate text-base font-black tabular-nums text-[#050505]">{formatMoney(client.limite_credito, currencySettings)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.availableCredit}</p>
                  <p className="mt-1 truncate text-base font-black tabular-nums text-emerald-700">{formatMoney(getAvailableCredit(client), currencySettings)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.balance}</p>
                  <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-black tabular-nums ${Number(client.saldo || 0) > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {formatMoney(getDisplayBalance(client), currencySettings)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="grid gap-3 p-3 lg:hidden">
          {visibleClients.map((client) => (
            <article key={client.id} className="rounded-[1.5rem] border border-[#f1ebdf] bg-[#fffdf8]/95 p-4 shadow-[0_14px_34px_rgba(15,15,15,0.045)]">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542] shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
                    <UserRound size={19} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-black text-[#050505]">{client.nombre}</h3>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a6a16]">{formatClientCode(client.id)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => openEditModal(client)} className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[#f4c542]/30 bg-[#fff4c7] text-[#8a6a16]" type="button" aria-label={t.editClient}>
                    <Edit2 size={16} />
                  </button>
                  {!isSeller && (
                    <button onClick={() => handleDelete(client.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600" type="button" aria-label={t.deleteTitle}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-2 text-sm font-semibold text-[#71717a]">
                <p className="flex min-w-0 items-center gap-2"><Phone size={15} className="shrink-0 text-[#8a6a16]" /><span className="truncate">{formatPhone(client.telefono)}</span></p>
                <p className="flex min-w-0 items-center gap-2"><Mail size={15} className="shrink-0 text-[#8a6a16]" /><span className="truncate">{formatEmail(client.email)}</span></p>
                <p className="flex min-w-0 items-center gap-2"><MapPin size={15} className="shrink-0 text-[#8a6a16]" /><span className="truncate">{client.direccion || '-'}</span></p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-[#f1ebdf] bg-white/80 p-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.creditLimit}</p>
                  <p className="mt-1 truncate text-sm font-black tabular-nums text-[#050505]">{formatMoney(client.limite_credito, currencySettings)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.availableCredit}</p>
                  <p className="mt-1 truncate text-sm font-black tabular-nums text-emerald-700">{formatMoney(getAvailableCredit(client), currencySettings)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.balance}</p>
                  <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-black tabular-nums ${Number(client.saldo || 0) > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {formatMoney(getDisplayBalance(client), currencySettings)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {visibleClients.length === 0 && (
          <div className="border-t border-[#f1ebdf] bg-[#fbfaf7] py-12 text-center font-semibold text-[#71717a]">
            {t.noClients}
          </div>
        )}

        {filteredClients.length > CLIENTS_PER_PAGE && (
          <div className="border-t border-[#f1ebdf] bg-white/75 px-4 py-4 backdrop-blur-xl sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a6a16]">
                {t.page} {safeCurrentPage} {t.of} {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="rounded-2xl border border-[#e9e2d3] bg-white px-4 py-2 text-sm font-black text-[#71717a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#f4c542]/50 hover:bg-[#fff9e8] hover:text-[#050505] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:bg-white disabled:hover:text-[#71717a]"
                >
                  {t.previous}
                </button>
                <div className="flex items-center gap-1 rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-1 shadow-sm">
                  {Array.from({ length: totalPages }).slice(Math.max(0, safeCurrentPage - 3), Math.min(totalPages, safeCurrentPage + 2)).map((_, index) => {
                    const pageNumber = Math.max(1, safeCurrentPage - 2) + index;
                    if (pageNumber > totalPages) return null;

                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`h-9 min-w-9 rounded-xl px-3 text-sm font-black transition ${pageNumber === safeCurrentPage ? 'bg-[#050505] text-[#f4c542] shadow-[0_10px_24px_rgba(0,0,0,0.18)]' : 'text-[#71717a] hover:bg-white hover:text-[#050505]'}`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="rounded-2xl border border-[#e9e2d3] bg-white px-4 py-2 text-sm font-black text-[#71717a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#f4c542]/50 hover:bg-[#fff9e8] hover:text-[#050505] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:bg-white disabled:hover:text-[#71717a]"
                >
                  {t.next}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingClient(null); resetForm(); }}
        title={editingClient ? t.editClient : t.newClient}
      >
        <form onSubmit={handleSubmit} className="space-y-5 overflow-x-hidden">
          <Input
            label={t.fullName}
            placeholder={t.fullNamePlaceholder}
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            required
          />

          <Input
            label={t.phone}
            type="tel"
            placeholder={t.phonePlaceholder}
            value={formData.telefono}
            onChange={(e) => setFormData({ ...formData, telefono: sanitizePhoneInput(e.target.value) })}
            disabled={isSeller && !!editingClient}
          />

          <Input
            label={t.email}
            type="email"
            placeholder={t.emailPlaceholder}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={isSeller && !!editingClient}
          />

          <Input
            label={t.address}
            placeholder={t.addressPlaceholder}
            value={formData.direccion}
            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            disabled={isSeller && !!editingClient}
          />

          {isSeller && editingClient && (
            <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] px-4 py-3 text-sm font-bold text-[#71717a]">
              {t.sellerSensitiveLocked}
            </div>
          )}

          {!isSeller ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={t.creditLimit}
                type="number"
                step="0.01"
                value={formData.limite_credito}
                onChange={(e) => setFormData({ ...formData, limite_credito: e.target.value })}
              />

              <Input
                label={t.initialBalance}
                type="number"
                step="0.01"
                value={formData.saldo}
                onChange={(e) => setFormData({ ...formData, saldo: e.target.value })}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] px-4 py-3 text-sm font-bold text-[#71717a]">
              {t.sellerFinancialLocked}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setIsModalOpen(false); setEditingClient(null); resetForm(); }}
            >
              {t.cancel}
            </Button>
            <Button type="submit">
              {editingClient ? t.updateClient : t.createClient}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function ClientMetricCard({
  title,
  value,
  icon: Icon,
  iconClass,
  valueClass = 'text-[#050505]'
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  iconClass: string;
  valueClass?: string;
}) {
  const isLongValue = value.length > 10;

  return (
    <div className="group relative min-w-0 overflow-hidden rounded-[1.75rem] border border-[#e9e2d3]/85 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,15,15,0.055)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#f4c542]/35 hover:bg-white hover:shadow-[0_28px_70px_rgba(15,15,15,0.09)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.09),transparent_38%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative z-10 flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="mb-4 max-w-[13rem] text-[10px] font-black uppercase tracking-[0.24em] text-[#8a6a16] sm:text-[11px]">
            {title}
          </p>
          <p
            className={`max-w-full break-words font-black leading-[0.95] tracking-tight tabular-nums ${
              isLongValue ? 'text-[2rem] sm:text-[2.35rem] xl:text-[2.15rem] 2xl:text-[2.45rem]' : 'text-4xl sm:text-[2.75rem] xl:text-[2.8rem] 2xl:text-5xl'
            } ${valueClass}`}
          >
            {value}
          </p>
        </div>

        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] border border-white/10 shadow-[0_18px_40px_rgba(15,15,15,0.12)] transition-all duration-300 group-hover:scale-105 group-hover:rotate-3 sm:h-14 sm:w-14 ${iconClass}`}>
          <Icon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );
}
