import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Headset, Mail, MessageCircle, Send, AlertCircle, Paperclip, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { getUserRoleFlags } from '../utils/roles';
import { formatEmail } from '../utils/formatContact';

type SupportPageProps = {
  onTicketCreated?: () => void;
};

type UserSupportTicket = {
  id: string;
  negocio_id?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  created_at: string;
  subject: string;
  category: string;
  message: string;
  status: string;
  priority?: string | null;
  response?: string | null;
  responded_at?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
};

function formatStatus(value?: string | null) {
  if (!value) return 'Open';

  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getStatusClasses(status?: string | null) {
  if (status === 'closed' || status === 'resolved') return 'bg-green-50 text-green-700';
  if (status === 'in_progress') return 'bg-[#fff4c7] text-[#8a6a16]';
  return 'bg-blue-50 text-blue-700';
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

function isImageAttachment(url?: string | null, name?: string | null) {
  const value = `${url || ''} ${name || ''}`.toLowerCase();
  return /\.(png|jpg|jpeg|gif|webp|avif)(\?|$|\s)/i.test(value);
}

function getFileNameFromUrl(url?: string | null) {
  if (!url) return '';

  try {
    const parsedUrl = new URL(url);
    const fileName = parsedUrl.pathname.split('/').pop() || '';
    return decodeURIComponent(fileName);
  } catch {
    return url.split('/').pop() || '';
  }
}

export default function SupportPage({ onTicketCreated }: SupportPageProps) {
  const { user, userProfile } = useAuth();
  const { pushNotification } = useNotification();

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('technical');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [userTickets, setUserTickets] = useState<UserSupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);

  const attachmentName = attachment?.name || '';
  const roleFlags = getUserRoleFlags(userProfile);
  const isSuperAdmin = roleFlags.isSuperAdmin;

  function getTicketIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('ticket');
  }

  const loadUserTickets = useCallback(async (ticketIdToOpen?: string | null) => {
    if (!user?.id) return;

    try {
      setLoadingTickets(true);

      let query = supabase
        .from('support_tickets')
        .select('id, created_at, negocio_id, user_id, user_name, user_email, subject, category, message, status, priority, response, responded_at, attachment_url, attachment_name')
        .order('created_at', { ascending: false })
        .range(0, 999);

      if (!isSuperAdmin) {
        const userEmail = user.email?.trim().toLowerCase();
        const ticketFilter = userEmail
          ? `user_id.eq.${user.id},user_email.eq.${userEmail}`
          : `user_id.eq.${user.id}`;

        query = query.or(ticketFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const tickets = (data || []) as UserSupportTicket[];
      setUserTickets(tickets);

      if (ticketIdToOpen && tickets.some((ticket) => ticket.id === ticketIdToOpen)) {
        setOpenTicketId(ticketIdToOpen);
      }
    } catch (error) {
      console.error('Error loading user support tickets:', error);
      setUserTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }, [isSuperAdmin, user?.email, user?.id]);

  useEffect(() => {
    const ticketIdFromUrl = getTicketIdFromUrl();

    if (ticketIdFromUrl) {
      setOpenTicketId(ticketIdFromUrl);
    }

    loadUserTickets(ticketIdFromUrl);
  }, [loadUserTickets]);

  async function handleSubmit() {
    try {
      setLoading(true);

      let attachmentUrl: string | null = null;
      let attachmentNameToSave: string | null = null;

      if (attachment) {
        const safeFileName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${userProfile?.negocio_id || 'no-business'}/${user?.id || 'anonymous'}/${Date.now()}-${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from('support-attachments')
          .upload(filePath, attachment, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('support-attachments')
          .getPublicUrl(filePath);

        attachmentUrl = publicUrlData.publicUrl;
        attachmentNameToSave = attachment.name;
      }

      const { data: createdTicket, error } = await supabase
        .from('support_tickets')
        .insert({
          negocio_id: userProfile?.negocio_id || null,
          user_id: user?.id || null,
          user_name:
            userProfile?.nombre ||
            userProfile?.full_name ||
            userProfile?.username ||
            user?.email ||
            'Unknown User',
          user_email: user?.email?.trim().toLowerCase() || null,
          subject,
          category,
          message,
          status: 'open',
          priority: 'normal',
          attachment_url: attachmentUrl,
          attachment_name: attachmentNameToSave
        })
        .select('id, created_at, negocio_id, user_id, user_name, user_email, subject, category, message, status, priority, response, responded_at, attachment_url, attachment_name')
        .maybeSingle();

      if (error) throw error;

      const createdTicketCode = formatTicketCode(String(createdTicket?.id || ''));
      if (createdTicket) {
        const createdUserTicket = createdTicket as UserSupportTicket;
        setUserTickets((currentTickets) => {
          const filteredTickets = currentTickets.filter((ticket) => ticket.id !== createdUserTicket.id);
          return [createdUserTicket, ...filteredTickets];
        });
        setOpenTicketId(createdUserTicket.id);
      }
      setSuccessMessage(`Support ticket ${createdTicketCode} created successfully. We will contact you soon.`);

      if (!isSuperAdmin) {
        pushNotification({
          title: 'Support ticket created',
          message: `Your support ticket ${createdTicketCode} "${subject}" was created successfully.`,
          type: 'success',
          link: createdTicket?.id ? `support?ticket=${createdTicket.id}` : 'support',
          category: 'support'
        });
      }

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          negocio_id: userProfile?.negocio_id || null,
          user_id: null,
          audience: 'admin',
          title: 'New support ticket',
          message: `${user?.email || 'A user'} created support ticket ${createdTicketCode}: ${subject}`,
          type: 'info',
          category: 'support',
          link: createdTicket?.id ? `support-tickets?ticket=${createdTicket.id}` : 'support-tickets',
          read: false
        });

      if (notificationError) {
        console.warn('Admin notification was not created:', notificationError);
      }

      setSubject('');
      setCategory('technical');
      setMessage('');
      setAttachment(null);

      await loadUserTickets(createdTicket?.id ? String(createdTicket.id) : null);

      window.setTimeout(() => {
        onTicketCreated?.();
        window.dispatchEvent(new CustomEvent('matmax_support_ticket_created'));
      }, 900);
    } catch (error) {
      console.error('Error creating support ticket:', error);
      setSuccessMessage('');
      alert(error instanceof Error ? error.message : 'Unable to create support ticket.');
    } finally {
      setLoading(false);
    }
  }

  async function updateTicketStatus(ticket: UserSupportTicket, nextStatus: string) {
    if (!isSuperAdmin || !ticket.id) return;

    try {
      setUpdatingTicketId(ticket.id);

      const { data, error } = await supabase
        .from('support_tickets')
        .update({ status: nextStatus })
        .eq('id', ticket.id)
        .select('id, created_at, negocio_id, user_id, user_name, user_email, subject, category, message, status, priority, response, responded_at, attachment_url, attachment_name')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const updatedTicket = data as UserSupportTicket;
        setUserTickets((currentTickets) =>
          currentTickets.map((currentTicket) =>
            currentTicket.id === updatedTicket.id ? updatedTicket : currentTicket
          )
        );
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      alert(error instanceof Error ? error.message : 'Unable to update ticket status.');
    } finally {
      setUpdatingTicketId(null);
    }
  }

  async function sendTicketResponse(ticket: UserSupportTicket) {
    if (!isSuperAdmin || !ticket.id || ticket.status === 'closed') return;

    const responseText = (responseDrafts[ticket.id] || '').trim();

    if (!responseText) return;

    try {
      setUpdatingTicketId(ticket.id);

      const { data, error } = await supabase
        .from('support_tickets')
        .update({
          response: responseText,
          responded_at: new Date().toISOString(),
          status: ticket.status === 'open' ? 'in_progress' : ticket.status
        })
        .eq('id', ticket.id)
        .select('id, created_at, negocio_id, user_id, user_name, user_email, subject, category, message, status, priority, response, responded_at, attachment_url, attachment_name')
        .maybeSingle();

      if (error) throw error;

      const updatedTicket = data as UserSupportTicket | null;

      if (updatedTicket) {
        setUserTickets((currentTickets) =>
          currentTickets.map((currentTicket) =>
            currentTicket.id === updatedTicket.id ? updatedTicket : currentTicket
          )
        );
        setResponseDrafts((currentDrafts) => ({
          ...currentDrafts,
          [ticket.id]: ''
        }));
      }

      if (isSuperAdmin && ticket.user_id && ticket.user_id !== user?.id) {
        const ticketCode = formatTicketCode(ticket.id);
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            negocio_id: null,
            user_id: ticket.user_id,
            audience: 'user',
            title: 'Support response received',
            message: `Your support ticket ${ticketCode} "${ticket.subject || 'Support ticket'}" has a new response.`,
            type: 'success',
            category: 'support',
            link: `support?ticket=${ticket.id}`,
            read: false
          });

        if (notificationError) {
          console.warn('User notification was not created:', notificationError);
        }
      }
    } catch (error) {
      console.error('Error sending ticket response:', error);
      alert(error instanceof Error ? error.message : 'Unable to send ticket response.');
    } finally {
      setUpdatingTicketId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contact Support</h1>
        <p className="mt-1 text-sm text-gray-500">
          Need help? Contact our support team or create a support ticket.
        </p>
      </div>

      {successMessage && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          {successMessage}
        </div>
      )}


      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="space-y-3 p-6 text-center">
            <MessageCircle className="mx-auto h-10 w-10" />
            <h3 className="font-semibold">WhatsApp Support</h3>
            <p className="text-sm text-gray-500">Contact our team directly through WhatsApp.</p>
            <Button onClick={() => window.open('https://wa.me/', '_blank')} className="w-full">
              Open WhatsApp
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6 text-center">
            <Mail className="mx-auto h-10 w-10" />
            <h3 className="font-semibold">Email Support</h3>
            <p className="text-sm text-gray-500">Send us an email and we will respond as soon as possible.</p>
            <Button onClick={() => window.open('mailto:support@matmax.app')} className="w-full">
              Send Email
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6 text-center">
            <Headset className="mx-auto h-10 w-10" />
            <h3 className="font-semibold">Help Center</h3>
            <p className="text-sm text-gray-500">Access guides, tutorials and documentation.</p>
            <Button className="w-full" variant="secondary">
              Open Help Center
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-5 w-5" />
            Create Support Ticket
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />

          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="technical">Technical Support</option>
            <option value="billing">Billing</option>
            <option value="bug">System Error</option>
            <option value="feature">Feature Request</option>
            <option value="account">Account & Access</option>
            <option value="other">Other</option>
          </Select>

          <textarea
            className="min-h-[140px] w-full rounded-lg border p-3"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue..."
          />

          <div className="rounded-2xl border border-dashed border-[#e9e2d3] bg-[#fbfaf7] p-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center text-sm font-semibold text-[#71717a] transition hover:text-[#050505]">
              <Paperclip className="h-5 w-5" />
              <span>{attachment ? 'Attachment selected' : 'Add attachment'}</span>
              <span className="text-xs font-medium text-[#a1a1aa]">
                Images or PDF files help us understand the issue better.
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                disabled={loading}
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0] || null;
                  setAttachment(selectedFile);
                }}
              />
            </label>

            {attachment && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#e9e2d3] bg-white px-3 py-2 text-sm font-semibold text-[#050505]">
                <span className="min-w-0 flex-1 truncate">{attachmentName}</span>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="rounded-lg p-1 text-[#71717a] transition hover:bg-red-50 hover:text-red-600"
                  disabled={loading}
                  aria-label="Remove attachment"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={!subject || !message || loading} className="w-full">
            <Send className="mr-2 h-4 w-4" />
            {loading ? 'Creating Ticket...' : 'Create Ticket'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-5 w-5" />
            {isSuperAdmin ? 'All Support Tickets' : 'My Support Tickets'}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {loadingTickets ? (
            <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4 text-sm font-semibold text-[#71717a]">
              Loading your tickets...
            </div>
          ) : userTickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e9e2d3] bg-[#fbfaf7] p-4 text-sm font-semibold text-[#71717a]">
              You do not have support tickets yet.
            </div>
          ) : (
            userTickets.map((ticket) => {
              const isTicketOpen = openTicketId === ticket.id;
              const ticketCode = formatTicketCode(ticket.id);

              return (
                <div key={ticket.id} className="rounded-2xl border border-[#e9e2d3] bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setOpenTicketId(isTicketOpen ? null : ticket.id)}
                    className="flex w-full min-w-0 flex-col gap-3 p-4 text-left transition hover:bg-[#fbfaf7] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <span className="shrink-0 text-xs font-black uppercase tracking-[0.14em] text-[#8a6a16]">
                        {ticketCode}
                      </span>

                      <span className="min-w-0 truncate text-sm font-black text-[#050505]">
                        {ticket.subject}
                      </span>

                      <span className="hidden text-xs font-semibold text-[#71717a] sm:inline">
                        ·
                      </span>

                      <span className="text-xs font-semibold text-[#71717a]">
                        {ticket.category}
                      </span>
                    </div>

                    <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClasses(ticket.status)}`}>
                        {formatStatus(ticket.status)}
                      </span>

                      <span className="rounded-full border border-[#e9e2d3] bg-[#fbfaf7] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#71717a]">
                        {isTicketOpen ? 'Close' : 'Open to view'}
                      </span>
                    </div>
                  </button>

                  {isTicketOpen && (
                    <div className="border-t border-[#e9e2d3] px-4 pb-4 pt-3">
                      <p className="mb-2 text-xs font-semibold text-[#71717a]">
                        {new Date(ticket.created_at).toLocaleString()}
                      </p>

                      <p className="whitespace-pre-wrap text-sm text-[#3f3f46]">
                        {ticket.message}
                      </p>

                      {(ticket.attachment_url || ticket.attachment_name) && (
                        <div className="mt-3 rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-3">
                          <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[#8a6a16]">
                            Attachment
                          </p>

                          {ticket.attachment_url && isImageAttachment(ticket.attachment_url, ticket.attachment_name) ? (
                            <a
                              href={ticket.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block overflow-hidden rounded-xl border border-[#e9e2d3] bg-white"
                            >
                              <img
                                src={ticket.attachment_url}
                                alt={ticket.attachment_name || 'Support attachment'}
                                className="max-h-80 w-full object-contain p-2"
                              />
                            </a>
                          ) : null}

                          {ticket.attachment_url ? (
                            <a
                              href={ticket.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex max-w-full items-center gap-2 rounded-xl border border-[#e9e2d3] bg-white px-3 py-2 text-xs font-bold text-[#8a6a16] transition hover:bg-[#fffdf8]"
                            >
                              📎 <span className="truncate">{ticket.attachment_name || getFileNameFromUrl(ticket.attachment_url) || 'Open attachment'}</span>
                            </a>
                          ) : (
                            <p className="text-xs font-bold text-[#8a6a16]">📎 {ticket.attachment_name}</p>
                          )}
                        </div>
                      )}

                      {ticket.response && (
                        <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3">
                          <p className="text-xs font-black uppercase tracking-wide text-green-700">Support Response</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-green-900">{ticket.response}</p>
                          {ticket.responded_at && (
                            <p className="mt-2 text-xs font-bold text-green-700/70">
                              {new Date(ticket.responded_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}

                      {isSuperAdmin && (
                        <div className="mt-4 space-y-4 rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6a16]">
                                Ticket Status
                              </label>
                              <Select
                                value={ticket.status || 'open'}
                                onChange={(event) => updateTicketStatus(ticket, event.target.value)}
                                disabled={updatingTicketId === ticket.id}
                              >
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="waiting_customer">Waiting Customer</option>
                                <option value="resolved">Resolved</option>
                                <option value="closed">Closed</option>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6a16]">
                                Assigned User
                              </label>
                              <div className="rounded-lg border border-[#e9e2d3] bg-white px-3 py-2 text-sm font-semibold text-[#3f3f46]">
                                {ticket.user_email ? formatEmail(ticket.user_email) : ticket.user_name || 'Unknown user'}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6a16]">
                              Reply to User
                            </label>
                            <textarea
                              className="min-h-[120px] w-full rounded-lg border border-[#e9e2d3] bg-white p-3 text-sm outline-none transition focus:border-[#f4c542] focus:ring-2 focus:ring-[#f4c542]/20 disabled:cursor-not-allowed disabled:bg-[#f4f1e8] disabled:text-[#71717a]"
                              value={responseDrafts[ticket.id] || ''}
                              onChange={(event) =>
                                setResponseDrafts((currentDrafts) => ({
                                  ...currentDrafts,
                                  [ticket.id]: event.target.value
                                }))
                              }
                              placeholder={ticket.status === 'closed' ? 'This ticket is closed and read only.' : 'Write a response or request clarification from the user...'}
                              disabled={ticket.status === 'closed' || updatingTicketId === ticket.id}
                            />
                          </div>

                          <Button
                            type="button"
                            onClick={() => sendTicketResponse(ticket)}
                            disabled={ticket.status === 'closed' || updatingTicketId === ticket.id || !(responseDrafts[ticket.id] || '').trim()}
                            className="w-full sm:w-auto"
                          >
                            {updatingTicketId === ticket.id ? 'Saving...' : 'Send Response'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
