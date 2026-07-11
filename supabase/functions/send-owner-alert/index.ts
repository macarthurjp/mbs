import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { renderBrandedEmail, type EmailSection } from '../_shared/emailTemplate.ts';

type SignupEventType = 'signup_started' | 'signup_completed' | 'signup_failed';

const SUPABASE_URL = Deno.env.get('APP_SUPABASE_URL') || Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ANON_KEY = Deno.env.get('APP_SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
// Deliberately a different env var (and default) than the backup emails'
// RESEND_FROM_EMAIL, so the two alert types are visibly distinct senders.
const SIGNUP_ALERT_FROM_EMAIL = Deno.env.get('SAAS_SIGNUP_ALERT_FROM_EMAIL') || 'MatMax Business Sign Up <signups@matmaxsuite.com>';
const OWNER_ALERT_EMAIL = Deno.env.get('SAAS_OWNER_ALERT_EMAIL') || Deno.env.get('PLATFORM_BACKUP_NOTIFY_EMAIL') || '';

// signup_started/signup_failed happen before email confirmation, so there is
// no Supabase session yet and these calls can never carry a real user JWT.
// Since we can't authenticate them, rate-limit by email and by IP instead so
// this can't be used as an open spam/log-pollution endpoint.
const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_MAX_PER_EMAIL = 5;
const RATE_LIMIT_MAX_PER_IP = 10;
const MAX_FIELD_LENGTH = 200;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing APP_SUPABASE_URL or APP_SUPABASE_SERVICE_ROLE_KEY');
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function cleanText(value: unknown, maxLength = MAX_FIELD_LENGTH) {
  return String(value || '').trim().slice(0, maxLength);
}

function getClientIp(req: Request) {
  return cleanText(req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for'), 64);
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader || !ANON_KEY) return null;

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) return null;

  return data.user;
}

async function isRateLimited(params: { email: string; ip: string }) {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();

  if (params.email) {
    const { count } = await admin
      .from('saas_signup_events')
      .select('id', { count: 'exact', head: true })
      .eq('email', params.email)
      .gte('created_at', since);

    if ((count || 0) >= RATE_LIMIT_MAX_PER_EMAIL) return true;
  }

  if (params.ip) {
    const { count } = await admin
      .from('saas_signup_events')
      .select('id', { count: 'exact', head: true })
      .eq('metadata->>ip', params.ip)
      .gte('created_at', since);

    if ((count || 0) >= RATE_LIMIT_MAX_PER_IP) return true;
  }

  return false;
}

function normalizeEventType(value: unknown): SignupEventType {
  const eventType = cleanText(value);
  if (eventType === 'signup_completed' || eventType === 'signup_failed') return eventType;
  return 'signup_started';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const message = record.message || record.error || record.error_description;
    if (typeof message === 'string' && message) return message;
  }

  return 'Error desconocido';
}

function formatDate(value: string | Date, locale: 'en' | 'es') {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');

  return `${new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: locale === 'en',
  }).format(date)} UTC`;
}

function getEventCopy(eventType: SignupEventType) {
  if (eventType === 'signup_completed') {
    return {
      subject: 'New SaaS account completed onboarding / Nueva cuenta SaaS completada - MatMax',
      enTitle: 'New account completed onboarding',
      enBody: 'A user created an account and completed business onboarding.',
      esTitle: 'Nueva cuenta completó onboarding',
      esBody: 'Un usuario creó una cuenta y completó la configuración del negocio.',
    };
  }

  if (eventType === 'signup_failed') {
    return {
      subject: 'SaaS signup attempt failed / Intento de registro falló - MatMax',
      enTitle: 'Signup attempt failed',
      enBody: 'A user attempted to create an account, but Supabase rejected the signup.',
      esTitle: 'Intento de registro falló',
      esBody: 'Un usuario intentó crear una cuenta, pero Supabase rechazó el registro.',
    };
  }

  return {
    subject: 'New SaaS signup started / Nuevo registro SaaS iniciado - MatMax',
    enTitle: 'New signup started',
    enBody: 'A user created an account. Business onboarding may still be pending.',
    esTitle: 'Nuevo registro iniciado',
    esBody: 'Un usuario creó una cuenta. La configuración del negocio puede estar pendiente.',
  };
}

function buildSection(params: {
  heading: string;
  intro: string;
  createdAt: string;
  email: string;
  userId: string | null;
  negocioId: string | null;
  selectedPlan: string;
  ownerName: string;
  businessName: string;
  errorMessage: string;
  locale: 'en' | 'es';
}): EmailSection {
  const labels =
    params.locale === 'en'
      ? {
          date: 'Date',
          email: 'Email',
          plan: 'Selected plan',
          owner: 'Owner name',
          business: 'Business name',
          user: 'User ID',
          businessId: 'Business ID',
          error: 'Error',
        }
      : {
          date: 'Fecha',
          email: 'Correo',
          plan: 'Plan seleccionado',
          owner: 'Nombre del dueño',
          business: 'Negocio',
          user: 'ID de usuario',
          businessId: 'ID del negocio',
          error: 'Error',
        };

  const rows: Array<[string, unknown]> = [
    [labels.date, formatDate(params.createdAt, params.locale)],
    [labels.email, params.email || '-'],
    [labels.plan, params.selectedPlan || '-'],
    [labels.owner, params.ownerName || '-'],
    [labels.business, params.businessName || '-'],
    [labels.user, params.userId || '-'],
    [labels.businessId, params.negocioId || '-'],
  ];

  if (params.errorMessage) rows.push([labels.error, params.errorMessage]);

  return { heading: params.heading, intro: params.intro, rows };
}

async function sendEmail(params: {
  eventType: SignupEventType;
  createdAt: string;
  email: string;
  userId: string | null;
  negocioId: string | null;
  selectedPlan: string;
  ownerName: string;
  businessName: string;
  errorMessage: string;
}) {
  if (!RESEND_API_KEY) return { sent: false, reason: 'missing_resend_api_key' };
  if (!OWNER_ALERT_EMAIL) return { sent: false, reason: 'missing_owner_alert_email' };

  const copy = getEventCopy(params.eventType);
  const html = renderBrandedEmail({
    headerLabel: 'Sign Up Alert',
    sections: [
      buildSection({ ...params, heading: copy.enTitle, intro: copy.enBody, locale: 'en' }),
      buildSection({ ...params, heading: copy.esTitle, intro: copy.esBody, locale: 'es' }),
    ],
  });

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: SIGNUP_ALERT_FROM_EMAIL,
      to: OWNER_ALERT_EMAIL.split(',').map((email) => email.trim()).filter(Boolean),
      subject: copy.subject,
      html,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { sent: false, reason: String(data?.message || data?.error || 'resend_error') };
  }

  return { sent: true, id: data?.id || null };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const eventType = normalizeEventType(body.event_type);
    const createdAt = new Date().toISOString();
    const clientIp = getClientIp(req);

    // If a valid session JWT is present (true for signup_completed, which
    // happens mid-onboarding after the user is signed in), trust the token's
    // identity over anything the client claims. signup_started/signup_failed
    // happen pre-email-confirmation and never have a session, so this will
    // be null there — that path is covered by the rate limit below instead.
    const authedUser = await getAuthenticatedUser(req);

    const claimedEmail = cleanText(body.email).toLowerCase();
    const email = authedUser?.email?.toLowerCase() || claimedEmail;
    const userId = authedUser?.id || cleanText(body.user_id) || null;
    const negocioId = cleanText(body.negocio_id) || null;
    const selectedPlan = cleanText(body.selected_plan || body.plan);
    const ownerName = cleanText(body.owner_name);
    const businessName = cleanText(body.business_name);
    const errorMessage = cleanText(body.error, 2000);
    const source = cleanText(body.source) || 'web';

    if (email && !EMAIL_PATTERN.test(email)) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!authedUser && (await isRateLimited({ email, ip: clientIp }))) {
      // Soft no-op: don't leak rate-limit state to an anonymous caller.
      return new Response(JSON.stringify({ ok: true, rate_limited: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: event, error: insertError } = await admin
      .from('saas_signup_events')
      .insert({
        event_type: eventType,
        email: email || null,
        user_id: userId,
        negocio_id: negocioId,
        selected_plan: selectedPlan || null,
        owner_name: ownerName || null,
        business_name: businessName || null,
        source,
        metadata: {
          error: errorMessage || null,
          user_agent: cleanText(req.headers.get('user-agent')),
          ip: clientIp || null,
          authenticated: Boolean(authedUser),
        },
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    const notification = await sendEmail({
      eventType,
      createdAt,
      email,
      userId,
      negocioId,
      selectedPlan,
      ownerName,
      businessName,
      errorMessage,
    });

    return new Response(JSON.stringify({ ok: true, event_id: event?.id || null, notification }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('send-owner-alert error:', message, error);

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
