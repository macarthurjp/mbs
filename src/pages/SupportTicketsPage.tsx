import { useCallback, useEffect, useState } from 'react';
import { Headset, MessageSquare, Clock, CheckCircle, RefreshCw, Search } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatEmail } from '../utils/formatContact';

type SupportTicket = {
  id: string;
  created_at: string;
  negocio_id?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  subject: string;
  category: string;
  message: string;
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed' | string;
  priority?: 'low' | 'normal' | 'high' | 'urgent' | string | null;
  response?: string | null;
  responded_at?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
};

const supportTicketsCopy = {
  es: {
    title: 'Tickets de Soporte',
    subtitle: 'Gestiona solicitudes de soporte de clientes en toda la plataforma.',
    refresh: 'Actualizar',
    open: 'Abiertos',
    inProgress: 'En Progreso',
    resolved: 'Resueltos',
    closed: 'Cerrados',
    waiting: 'Esperando',
    waitingCustomer: 'Esperando Cliente',
    searchPlaceholder: 'Buscar por asunto, ID, usuario, email o negocio...',
    allStatuses: 'Todos los estados',
    allBusinesses: 'Todos los negocios',
    allUsers: 'Todos los usuarios',
    clearFilters: 'Limpiar filtros',
    showing: 'Mostrando',
    of: 'de',
    tickets: 'Tickets',
    boardTitle: 'Tablero de Tickets estilo Jira',
    loadingTickets: 'Cargando tickets...',
    noTickets: 'No se encontraron tickets de soporte.',
    openDescription: 'Tickets nuevos esperando revisión',
    inProgressDescription: 'Tickets actualmente en gestión',
    waitingDescription: 'Esperando aclaración del usuario',
    resolvedDescription: 'Solucionados y pendientes de cierre',
    closedDescription: 'Tickets cerrados solo lectura',
    empty: 'Vacío',
    normal: 'normal',
    unknownUser: 'Usuario desconocido',
    previewAttachment: 'Ver adjunto',
    viewDetails: 'Ver detalles',
    modalTitle: 'Detalles del Ticket de Soporte',
    noEmail: 'Sin email',
    attachment: 'Adjunto',
    supportResponse: 'Respuesta de Soporte',
    closedReadonly: 'Este ticket está cerrado y solo lectura.',
    responsePlaceholder: 'Escribe una respuesta, solicitud de aclaración o nota interna...',
    priority: 'Prioridad',
    low: 'Baja',
    high: 'Alta',
    urgent: 'Urgente',
    saveResponse: 'Guardar respuesta',
    savingAndSending: 'Guardando y enviando...',
    attachmentPreview: 'Vista previa del adjunto',
    noAttachmentPreview: 'La vista previa no está disponible para este tipo de archivo.',
    openAttachmentNewTab: 'Abrir adjunto en nueva pestaña',
    categoryTechnical: 'Técnico'
  },
  en: {
    title: 'Support Tickets',
    subtitle: 'Manage customer support requests across the platform.',
    refresh: 'Refresh',
    open: 'Open',
    inProgress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
    waiting: 'Waiting',
    waitingCustomer: 'Waiting Customer',
    searchPlaceholder: 'Search by subject, ticket ID, user, email or business...',
    allStatuses: 'All Statuses',
    allBusinesses: 'All Businesses',
    allUsers: 'All Users',
    clearFilters: 'Clear Filters',
    showing: 'Showing',
    of: 'of',
    tickets: 'Tickets',
    boardTitle: 'MatMax Tickets Board',
    loadingTickets: 'Loading tickets...',
    noTickets: 'No support tickets found.',
    openDescription: 'New tickets waiting for review',
    inProgressDescription: 'Tickets currently being handled',
    waitingDescription: 'Waiting for user clarification',
    resolvedDescription: 'Solved and pending closure',
    closedDescription: 'Read-only closed tickets',
    empty: 'Empty',
    normal: 'normal',
    unknownUser: 'Unknown User',
    previewAttachment: 'Preview Attachment',
    viewDetails: 'View details',
    modalTitle: 'Support Ticket Details',
    noEmail: 'No email',
    attachment: 'Attachment',
    supportResponse: 'Support Response',
    closedReadonly: 'This ticket is closed and read only.',
    responsePlaceholder: 'Write a response, clarification request, or internal note...',
    priority: 'Priority',
    low: 'Low',
    high: 'High',
    urgent: 'Urgent',
    saveResponse: 'Save Response',
    savingAndSending: 'Saving and sending...',
    attachmentPreview: 'Attachment Preview',
    noAttachmentPreview: 'Preview is not available for this file type.',
    openAttachmentNewTab: 'Open attachment in new tab',
    categoryTechnical: 'Technical'
  }
} as const;

function formatStatus(
  value: string | null | undefined,
  t: typeof supportTicketsCopy.es | typeof supportTicketsCopy.en
) {
  if (value === 'in_progress') return t.inProgress;
  if (value === 'waiting_customer') return t.waitingCustomer;
  if (value === 'resolved') return t.resolved;
  if (value === 'closed') return t.closed;
  return t.open;
}

function formatCategory(
  value: string | null | undefined,
  t: typeof supportTicketsCopy.es | typeof supportTicketsCopy.en
) {
  if (!value || value === 'technical') return t.categoryTechnical;

  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
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

function getStatusBadgeClasses(status?: string | null) {
  if (status === 'open') return 'border-blue-100 bg-blue-50 text-blue-700 shadow-[0_10px_22px_rgba(59,130,246,0.08)]';
  if (status === 'in_progress') return 'border-amber-100 bg-amber-50 text-amber-700 shadow-[0_10px_22px_rgba(245,158,11,0.08)]';
  if (status === 'waiting_customer') return 'border-purple-100 bg-purple-50 text-purple-700 shadow-[0_10px_22px_rgba(147,51,234,0.08)]';
  if (status === 'resolved') return 'border-emerald-100 bg-emerald-50 text-emerald-700 shadow-[0_10px_22px_rgba(16,185,129,0.08)]';
  if (status === 'closed') return 'border-zinc-200 bg-zinc-100 text-zinc-700 shadow-[0_10px_22px_rgba(113,113,122,0.08)]';
  return 'border-[#e9e2d3] bg-white text-[#71717a]';
}

function getStatusDotClasses(status?: string | null) {
  if (status === 'open') return 'bg-blue-500';
  if (status === 'in_progress') return 'bg-amber-500';
  if (status === 'waiting_customer') return 'bg-purple-500';
  if (status === 'resolved') return 'bg-emerald-500';
  if (status === 'closed') return 'bg-zinc-500';
  return 'bg-[#a1a1aa]';
}

function getTicketIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('ticket') || sessionStorage.getItem('matmax_open_support_admin_ticket');
}

function isImageAttachment(url?: string | null, name?: string | null) {
  const value = `${url || ''} ${name || ''}`.toLowerCase();
  return /\.(png|jpg|jpeg|gif|webp|avif)(\?|$|\s)/i.test(value);
}

export default function SupportTicketsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = supportTicketsCopy[language];
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [businessNames, setBusinessNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [responseText, setResponseText] = useState('');
  const [savingResponse, setSavingResponse] = useState(false);
  const [draggingTicketId, setDraggingTicketId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<{
    url: string;
    name?: string | null;
  } | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [businessFilter, setBusinessFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');

  const openTicket = useCallback((ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setResponseText(ticket.status === 'closed' ? ticket.response || '' : '');
  }, []);

  const loadTickets = useCallback(async (ticketIdToOpen?: string | null) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, created_at, negocio_id, user_id, user_name, user_email, subject, category, message, status, priority, response, responded_at, attachment_url, attachment_name')
        .order('created_at', { ascending: false })
        .range(0, 999);

      if (error) throw error;

      const loadedTickets = (data || []) as unknown as SupportTicket[];
      setTickets(loadedTickets);

      const negocioIds = Array.from(
        new Set(
          loadedTickets
            .map((ticket) => ticket.negocio_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      if (negocioIds.length > 0) {
        const { data: negociosData, error: negociosError } = await supabase
          .from('negocios')
          .select('id, nombre')
          .in('id', negocioIds);

        if (negociosError) {
          console.warn('Error loading business names for support tickets:', negociosError);
        } else {
          setBusinessNames(
            (negociosData || []).reduce<Record<string, string>>((acc, negocio) => {
              acc[String(negocio.id)] = String(negocio.nombre || negocio.id);
              return acc;
            }, {})
          );
        }
      } else {
        setBusinessNames({});
      }

      if (ticketIdToOpen) {
        const ticketToOpen = loadedTickets.find((ticket) => ticket.id === ticketIdToOpen);

        if (ticketToOpen) {
          openTicket(ticketToOpen);
          sessionStorage.removeItem('matmax_open_support_admin_ticket');
        }
      }
    } catch (error) {
      console.error('Error loading support tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [openTicket]);

  useEffect(() => {
    const ticketIdFromUrl = getTicketIdFromUrl();
    loadTickets(ticketIdFromUrl);
  }, [loadTickets]);

  async function updateTicketStatus(ticketId: string, status: SupportTicket['status']) {
    try {
      setUpdatingId(ticketId);

      const { data, error } = await supabase
        .from('support_tickets')
        .update({
          status,
          responded_at: status === 'resolved' || status === 'closed' ? new Date().toISOString() : null
        })
        .eq('id', ticketId)
        .select('id, created_at, negocio_id, user_id, user_name, user_email, subject, category, message, status, priority, response, responded_at, attachment_url, attachment_name')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const updatedTicket = data as unknown as SupportTicket;
        setTickets((prev) =>
          prev.map((ticket) =>
            ticket.id === ticketId ? updatedTicket : ticket
          )
        );

        setSelectedTicket((current) =>
          current?.id === ticketId ? updatedTicket : current
        );
      }
    } catch (error) {
      console.error('Error updating support ticket:', error);
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateTicketPriority(ticketId: string, priority: SupportTicket['priority']) {
    try {
      setUpdatingId(ticketId);

      const { data, error } = await supabase
        .from('support_tickets')
        .update({ priority })
        .eq('id', ticketId)
        .select('id, created_at, negocio_id, user_id, user_name, user_email, subject, category, message, status, priority, response, responded_at, attachment_url, attachment_name')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const updatedTicket = data as unknown as SupportTicket;
        setTickets((prev) =>
          prev.map((ticket) =>
            ticket.id === ticketId ? updatedTicket : ticket
          )
        );

        setSelectedTicket((current) =>
          current?.id === ticketId ? updatedTicket : current
        );
      }
    } catch (error) {
      console.error('Error updating support ticket priority:', error);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleTicketDrop(ticketId: string, nextStatus: SupportTicket['status']) {
    const ticket = tickets.find((currentTicket) => currentTicket.id === ticketId);

    if (!ticket || ticket.status === nextStatus || ticket.status === 'closed') {
      setDraggingTicketId(null);
      return;
    }

    await updateTicketStatus(ticketId, nextStatus);
    setDraggingTicketId(null);
  }

  async function saveTicketResponse() {
    if (!selectedTicket) return;
    if (selectedTicket.status === 'closed') return;

    try {
      setSavingResponse(true);

      const { data, error } = await supabase
        .from('support_tickets')
        .update({
          response: responseText.trim() || null,
          status: selectedTicket.status || 'open',
          responded_at: responseText.trim() ? new Date().toISOString() : selectedTicket.responded_at || null
        })
        .eq('id', selectedTicket.id)
        .select('id, created_at, negocio_id, user_id, user_name, user_email, subject, category, message, status, priority, response, responded_at, attachment_url, attachment_name')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const updatedTicket = data as unknown as SupportTicket;
        const responseToSend = responseText.trim();
        const emailToSend = selectedTicket.user_email;
        const subjectToSend = selectedTicket.subject;
        const messageToSend = selectedTicket.message;

        if (responseToSend && selectedTicket.user_id && selectedTicket.user_id !== user?.id) {
          const ticketCode = formatTicketCode(selectedTicket.id);
          const { error: userNotificationError } = await supabase
            .from('notifications')
            .insert({
              negocio_id: null,
              user_id: selectedTicket.user_id,
              audience: 'user',
              title: 'Support response received',
              message: `Your support ticket ${ticketCode} "${selectedTicket.subject || 'Support ticket'}" has a new response.`,
              type: 'success',
              category: 'support',
              link: `support?ticket=${selectedTicket.id}`,
              read: false
            });

          if (userNotificationError) {
            console.warn('User notification was not created:', userNotificationError);
          }
        }

        setTickets((prev) =>
          prev.map((ticket) =>
            ticket.id === selectedTicket.id ? updatedTicket : ticket
          )
        );

        setSelectedTicket(null);
        setResponseText('');

        if (responseToSend && emailToSend) {
          try {
            const { error: emailError } = await supabase.functions.invoke('send-support-response', {
              body: {
                to: emailToSend,
                subject: subjectToSend,
                message: messageToSend,
                response: responseToSend
              }
            });

            if (emailError) {
              console.error('Error sending support response email:', emailError);
            }
          } catch (emailError) {
            console.error('Unexpected error sending support response email:', emailError);
          }
        }
      }
    } catch (error) {
      console.error('Error saving support response:', error);
    } finally {
      setSavingResponse(false);
    }
  }

  const openTickets = tickets.filter((t) => t.status === 'open').length;
  const progressTickets = tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedTickets = tickets.filter((t) => t.status === 'resolved').length;

  const businessOptions = Array.from(
    new Set(
      tickets
        .map((ticket) => ticket.negocio_id)
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => (businessNames[a] || a).localeCompare(businessNames[b] || b));

  const userOptions = Array.from(
    new Map(
      tickets
        .filter((ticket) => ticket.user_id || ticket.user_email || ticket.user_name)
        .map((ticket) => {
          const key = ticket.user_id || ticket.user_email || ticket.user_name || 'unknown';
          const label = ticket.user_name || ticket.user_email?.split('@')[0] || ticket.user_email || ticket.user_id || 'Unknown User';
          return [key, label];
        })
    )
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const filteredTickets = tickets.filter((ticket) => {
    const searchTerm = search.trim().toLowerCase();
    const ticketDate = new Date(ticket.created_at);
    const startDate = startDateFilter ? new Date(`${startDateFilter}T00:00:00`) : null;
    const endDate = endDateFilter ? new Date(`${endDateFilter}T23:59:59`) : null;

    const matchesSearch =
      !searchTerm ||
      ticket.subject.toLowerCase().includes(searchTerm) ||
      ticket.message.toLowerCase().includes(searchTerm) ||
      formatTicketCode(ticket.id).toLowerCase().includes(searchTerm) ||
      (ticket.user_name || '').toLowerCase().includes(searchTerm) ||
      (ticket.user_email || '').toLowerCase().includes(searchTerm) ||
      (ticket.negocio_id || '').toLowerCase().includes(searchTerm) ||
      (businessNames[ticket.negocio_id || ''] || '').toLowerCase().includes(searchTerm);

    const matchesStatus =
      statusFilter === 'all' || ticket.status === statusFilter;

    const matchesBusiness =
      businessFilter === 'all' || ticket.negocio_id === businessFilter;

    const userKey = ticket.user_id || ticket.user_email || ticket.user_name || 'unknown';
    const matchesUser =
      userFilter === 'all' || userKey === userFilter;

    const matchesStartDate =
      !startDate || ticketDate >= startDate;

    const matchesEndDate =
      !endDate || ticketDate <= endDate;

    return matchesSearch && matchesStatus && matchesBusiness && matchesUser && matchesStartDate && matchesEndDate;
  });

  const statusColumns = [
    {
      id: 'open',
      title: t.open,
      description: t.openDescription,
      accent: 'border-blue-100 bg-blue-50 text-blue-700'
    },
    {
      id: 'in_progress',
      title: t.inProgress,
      description: t.inProgressDescription,
      accent: 'border-amber-100 bg-amber-50 text-amber-700'
    },
    {
      id: 'waiting_customer',
      title: t.waiting,
      description: t.waitingDescription,
      accent: 'border-purple-100 bg-purple-50 text-purple-700'
    },
    {
      id: 'resolved',
      title: t.resolved,
      description: t.resolvedDescription,
      accent: 'border-green-100 bg-green-50 text-green-700'
    },
    {
      id: 'closed',
      title: t.closed,
      description: t.closedDescription,
      accent: 'border-gray-200 bg-gray-100 text-gray-700'
    }
  ];

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden sm:space-y-6">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="break-words text-2xl font-bold text-[#050505] sm:text-3xl">{t.title}</h1>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-relaxed text-gray-500">
            {t.subtitle}
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => loadTickets()} disabled={loading} className="w-full sm:w-auto">
          <RefreshCw className="mr-2 h-4 w-4" />
          {t.refresh}
        </Button>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardContent className="flex min-w-0 items-center justify-between gap-3 p-4 sm:p-5">
            <div>
              <p className="text-sm text-gray-500">{t.open}</p>
              <p className="text-2xl font-bold">{openTickets}</p>
            </div>
            <Headset className="h-8 w-8" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex min-w-0 items-center justify-between gap-3 p-4 sm:p-5">
            <div>
              <p className="text-sm text-gray-500">{t.inProgress}</p>
              <p className="text-2xl font-bold">{progressTickets}</p>
            </div>
            <Clock className="h-8 w-8" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex min-w-0 items-center justify-between gap-3 p-4 sm:p-5">
            <div>
              <p className="text-sm text-gray-500">{t.resolved}</p>
              <p className="text-2xl font-bold">{resolvedTickets}</p>
            </div>
            <CheckCircle className="h-8 w-8" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(320px,1.45fr)_minmax(210px,0.75fr)_minmax(240px,0.8fr)]">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a1aa]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="h-11 w-full min-w-0 rounded-2xl border border-[#e9e2d3] bg-white px-4 py-3 pl-11 text-sm font-bold text-[#050505] shadow-sm outline-none transition placeholder:text-[#a1a1aa] focus:border-[#f4c542] focus:ring-2 focus:ring-[#f4c542]/20 sm:h-12"
              />
            </div>

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 w-full rounded-2xl border-[#e9e2d3] bg-white px-4 text-sm font-black shadow-sm sm:h-12"
            >
              <option value="all">{t.allStatuses}</option>
              <option value="open">{t.open}</option>
              <option value="in_progress">{t.inProgress}</option>
              <option value="waiting_customer">{t.waitingCustomer}</option>
              <option value="resolved">{t.resolved}</option>
              <option value="closed">{t.closed}</option>
            </Select>

            <Select
              value={businessFilter}
              onChange={(e) => setBusinessFilter(e.target.value)}
              className="h-11 w-full rounded-2xl border-[#e9e2d3] bg-white px-4 text-sm font-black shadow-sm sm:h-12"
            >
              <option value="all">{t.allBusinesses}</option>
              {businessOptions.map((businessId) => (
                <option key={businessId} value={businessId}>
                  {businessNames[businessId] || businessId}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_minmax(190px,0.75fr)_minmax(190px,0.75fr)_minmax(180px,auto)]">
            <Select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="h-11 w-full rounded-2xl border-[#e9e2d3] bg-white px-4 text-sm font-black shadow-sm sm:h-12"
            >
              <option value="all">{t.allUsers}</option>
              {userOptions.map(([userKey, userLabel]) => (
                <option key={userKey} value={userKey}>
                  {userLabel}
                </option>
              ))}
            </Select>

            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="h-11 w-full rounded-2xl border border-[#e9e2d3] bg-white px-4 py-3 text-sm font-bold text-[#71717a] shadow-sm outline-none transition focus:border-[#f4c542] focus:ring-2 focus:ring-[#f4c542]/20 sm:h-12"
              aria-label="Start date"
            />

            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="h-11 w-full rounded-2xl border border-[#e9e2d3] bg-white px-4 py-3 text-sm font-bold text-[#71717a] shadow-sm outline-none transition focus:border-[#f4c542] focus:ring-2 focus:ring-[#f4c542]/20 sm:h-12"
              aria-label="End date"
            />

            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full whitespace-nowrap rounded-2xl px-5 text-sm font-black lg:w-auto sm:h-12"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setBusinessFilter('all');
                setUserFilter('all');
                setStartDateFilter('');
                setEndDateFilter('');
              }}
            >
              {t.clearFilters}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#71717a]">
            <span className="rounded-full border border-[#e9e2d3] bg-white px-3 py-1 shadow-sm">
              {t.showing} {filteredTickets.length.toLocaleString('en-US')} {t.of} {tickets.length.toLocaleString('en-US')}
            </span>
            <span className="text-[#8a6a16]">{t.tickets}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <MessageSquare className="h-5 w-5" />
              {t.boardTitle}
            </div>
            <span className="rounded-full border border-[#e9e2d3] bg-[#fbfaf7] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#8a6a16]">
              {filteredTickets.length.toLocaleString('en-US')} {t.tickets}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-6">
          {loading ? (
            <div className="py-10 text-center text-gray-500">{t.loadingTickets}</div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              {t.noTickets}
            </div>
          ) : (
            <div className="-mx-3 overflow-x-auto px-3 pb-3 sm:-mx-2 sm:px-2">
              <div className="grid min-w-[1180px] grid-cols-5 gap-3 sm:min-w-[1320px] sm:gap-4">
              {statusColumns.map((column) => {
                const columnTickets = filteredTickets.filter((ticket) => ticket.status === column.id);

                return (
                  <section
                    key={column.id}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const ticketId = event.dataTransfer.getData('text/plain') || draggingTicketId;

                      if (ticketId) {
                        handleTicketDrop(ticketId, column.id);
                      }
                    }}
                    className={`min-w-0 rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-2.5 transition sm:p-3 ${draggingTicketId ? 'ring-2 ring-[#f4c542]/30' : ''}`}
                  >
                    <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full border ${column.accent}`} />
                          <h3 className="truncate text-sm font-black text-[#050505]">
                            {column.title}
                          </h3>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs font-semibold text-gray-500">
                          {column.description}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-[#e9e2d3] bg-white px-2.5 py-1 text-xs font-black text-[#71717a]">
                        {columnTickets.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {columnTickets.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#e9e2d3] bg-white/70 p-4 text-center text-xs font-semibold text-gray-400">
                          {t.empty}
                        </div>
                      ) : (
                        columnTickets.map((ticket) => (
                          <article
                            key={ticket.id}
                            draggable={ticket.status !== 'closed'}
                            onDragStart={(event) => {
                              event.dataTransfer.setData('text/plain', ticket.id);
                              setDraggingTicketId(ticket.id);
                            }}
                            onDragEnd={() => setDraggingTicketId(null)}
                            className={`rounded-xl border border-[#e9e2d3] bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,15,15,0.08)] sm:p-3 ${ticket.status === 'closed' ? 'cursor-not-allowed opacity-80' : 'cursor-grab active:cursor-grabbing'} ${draggingTicketId === ticket.id ? 'scale-[0.98] opacity-60' : ''}`}
                          >
                            <div className="mb-2 flex min-w-0 flex-col items-start gap-2 overflow-hidden">
                              <span className="block max-w-full truncate text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6a16]">
                                {formatTicketCode(ticket.id)}
                              </span>
                              <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 overflow-hidden">
                                <span
                                  className={`inline-flex max-w-[170px] min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.06em] ${getStatusBadgeClasses(ticket.status)}`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotClasses(ticket.status)}`} />
                                  <span className="min-w-0 truncate">{formatStatus(ticket.status, t)}</span>
                                </span>

                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                                    ticket.priority === 'urgent'
                                      ? 'bg-red-100 text-red-700'
                                      : ticket.priority === 'high'
                                      ? 'bg-orange-100 text-orange-700'
                                      : ticket.priority === 'low'
                                      ? 'bg-gray-100 text-gray-600'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {ticket.priority
                                    ? ticket.priority === 'low'
                                      ? t.low
                                      : ticket.priority === 'high'
                                      ? t.high
                                      : ticket.priority === 'urgent'
                                      ? t.urgent
                                      : ticket.priority
                                    : t.normal}
                                </span>
                              </div>
                            </div>

                            <h4 className="line-clamp-2 break-words text-sm font-black leading-snug text-[#050505] [overflow-wrap:anywhere]">
                              {ticket.subject}
                            </h4>

                            <p className="mt-2 line-clamp-3 break-words text-xs font-medium leading-relaxed text-gray-500 [overflow-wrap:anywhere]">
                              {ticket.message}
                            </p>

                            <div className="mt-3 space-y-1 rounded-xl bg-[#fbfaf7] p-3">
                              <p className="truncate text-sm font-black text-[#050505]">
                                {ticket.user_name || ticket.user_email?.split('@')[0] || t.unknownUser}
                              </p>
                              {ticket.user_email && (
                                <p className="truncate text-[11px] font-medium text-gray-500" title={formatEmail(ticket.user_email, '')}>
                                  {formatEmail(ticket.user_email)}
                                </p>
                              )}
                              <p className="text-[10px] font-semibold text-gray-400">
                                {new Date(ticket.created_at).toLocaleString()}
                              </p>
                            </div>

                            {(ticket.attachment_url || ticket.attachment_name) && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (ticket.attachment_url) {
                                    setPreviewAttachment({
                                      url: ticket.attachment_url,
                                      name: ticket.attachment_name
                                    });
                                  }
                                }}
                                disabled={!ticket.attachment_url}
                                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#e9e2d3] bg-[#fbfaf7] px-3 py-2.5 text-xs font-black text-[#8a6a16] transition hover:bg-[#fff9e8] disabled:cursor-default disabled:opacity-70 sm:py-3 sm:text-sm"
                              >
                                📎
                                <span>
                                  {t.previewAttachment}
                                </span>
                              </button>
                            )}

                            {ticket.response && (
                              <div className="mt-2 rounded-xl border border-green-100 bg-green-50 p-2">
                                <p className="line-clamp-2 text-xs font-semibold text-green-800">
                                  {ticket.response}
                                </p>
                              </div>
                            )}

                            <div className="mt-3 grid grid-cols-1 gap-2">
                              <Select
                                value={ticket.status || 'open'}
                                onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                                disabled={updatingId === ticket.id}
                              >
                                <option value="open">{t.open}</option>
                                <option value="in_progress">{t.inProgress}</option>
                                <option value="waiting_customer">{t.waitingCustomer}</option>
                                <option value="resolved">{t.resolved}</option>
                                <option value="closed">{t.closed}</option>
                              </Select>

                              <Button size="sm" variant="secondary" onClick={() => openTicket(ticket)}>
                                {t.viewDetails}
                              </Button>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </section>
                );
              })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={!!selectedTicket}
        onClose={() => {
          setSelectedTicket(null);
          setResponseText('');
        }}
        title={t.modalTitle}
      >
        {selectedTicket && (
          <div className="max-h-[78vh] space-y-5 overflow-y-auto pr-1">
            <div className="min-w-0 rounded-2xl border bg-white p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#e9e2d3] bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#8a6a16]">
                  {formatTicketCode(selectedTicket.id)}
                </span>
                <h3 className="min-w-0 break-words text-lg font-bold sm:text-xl [overflow-wrap:anywhere]">{selectedTicket.subject}</h3>
                <span className="rounded-full bg-[#fff8e1] px-3 py-1 text-xs font-bold text-[#8a6a16]">
                  {formatCategory(selectedTicket.category, t)}
                </span>
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${getStatusBadgeClasses(selectedTicket.status)}`}
                >
                  <span className={`h-2 w-2 rounded-full ${getStatusDotClasses(selectedTicket.status)}`} />
                  {formatStatus(selectedTicket.status, t)}
                </span>
              </div>

              <p className="text-sm text-gray-500">
                {selectedTicket.user_name || t.unknownUser} · {formatEmail(selectedTicket.user_email, t.noEmail)}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {new Date(selectedTicket.created_at).toLocaleString()}
              </p>
              <p className="mt-4 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{selectedTicket.message}</p>

              {selectedTicket.attachment_url && (
                <div className="mt-4 rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4">
                  <p className="mb-3 text-sm font-bold text-[#050505]">
                    {t.attachment}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setPreviewAttachment({
                        url: selectedTicket.attachment_url || '',
                        name: selectedTicket.attachment_name
                      })
                    }
                    className="inline-flex max-w-full items-center gap-2 rounded-xl border border-[#e9e2d3] bg-white px-4 py-2 text-sm font-semibold text-[#050505] transition hover:bg-[#fff9e8]"
                  >
                    📎 <span className="truncate">{selectedTicket.attachment_name || t.attachment}</span>
                    <span className="shrink-0 text-xs font-black uppercase tracking-[0.12em] text-[#8a6a16]">
                      {t.previewAttachment}
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">{t.supportResponse}</label>
              <textarea
                className="min-h-[140px] w-full rounded-lg border p-3 text-sm"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder={selectedTicket.status === 'closed' ? t.closedReadonly : t.responsePlaceholder}
                disabled={selectedTicket.status === 'closed'}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">{t.priority}</label>
              <Select
                value={selectedTicket.priority || 'normal'}
                onChange={(e) => updateTicketPriority(selectedTicket.id, e.target.value)}
                disabled={selectedTicket.status === 'closed' || updatingId === selectedTicket.id || savingResponse}
              >
                <option value="low">{t.low}</option>
                <option value="normal">{t.normal}</option>
                <option value="high">{t.high}</option>
                <option value="urgent">{t.urgent}</option>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                value={selectedTicket.status || 'open'}
                onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
                disabled={updatingId === selectedTicket.id || savingResponse}
              >
                <option value="open">{t.open}</option>
                <option value="in_progress">{t.inProgress}</option>
                <option value="waiting_customer">{t.waitingCustomer}</option>
                <option value="resolved">{t.resolved}</option>
                <option value="closed">{t.closed}</option>
              </Select>

              <Button
                type="button"
                onClick={saveTicketResponse}
                disabled={selectedTicket.status === 'closed' || savingResponse || !responseText.trim()}
              >
                {savingResponse ? t.savingAndSending : t.saveResponse}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        isOpen={!!previewAttachment}
        onClose={() => setPreviewAttachment(null)}
        title={t.attachmentPreview}
      >
        {previewAttachment && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4">
              <p className="break-words text-sm font-black text-[#050505]">
                {previewAttachment.name || t.attachment}
              </p>
            </div>

            {isImageAttachment(previewAttachment.url, previewAttachment.name) ? (
              <div className="overflow-hidden rounded-2xl border border-[#e9e2d3] bg-white">
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name || 'Attachment preview'}
                  className="max-h-[70vh] w-full object-contain p-3"
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-[#e9e2d3] bg-white p-5 text-sm font-semibold text-[#71717a]">
                {t.noAttachmentPreview}
              </div>
            )}

            <a
              href={previewAttachment.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#050505] px-4 py-3 text-sm font-black text-[#f4c542] transition hover:bg-[#111111] sm:w-auto"
            >
              {t.openAttachmentNewTab}
            </a>
          </div>
        )}
      </Modal>
    </div>
  );
}
