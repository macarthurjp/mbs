import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getEnv(...names: string[]) {
  for (const name of names) {
    const value = Deno.env.get(name) || '';
    if (value) return value;
  }

  throw new Error(`Falta ${names.join(' o ')}`);
}

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function normalizeEmailAlias(value: unknown) {
  const alias = String(value || '')
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

function escapeHeaderName(value: unknown) {
  return cleanText(value).replace(/[<>\r\n"]/g, '').trim();
}

async function requireAuthenticatedUser(req: Request) {
  const supabaseUrl = getEnv('APP_SUPABASE_URL', 'SUPABASE_URL');
  const anonKey = getEnv('APP_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader) throw new Error('Authorization es obligatorio');

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user) throw new Error('Usuario no autenticado');
  return user;
}

async function sendResendEmail(payload: Record<string, unknown>) {
  const resendApiKey = getEnv('RESEND_API_KEY');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.message || data?.error || 'No se pudo enviar el email'));
  }

  return data;
}

async function getBusinessEmailSettings(userId: string, negocioId: string) {
  const supabaseUrl = getEnv('APP_SUPABASE_URL', 'SUPABASE_URL');
  const serviceRoleKey = getEnv('APP_SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: profile, error: profileError } = await admin
    .from('usuarios')
    .select('negocio_id, rol')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw profileError;

  const role = cleanText(profile?.rol).toLowerCase();
  const isSuperAdmin = role === 'superadmin' || role === 'super_admin' || role === 'super-admin';
  if (!isSuperAdmin && profile?.negocio_id !== negocioId) {
    throw new Error('No tienes permiso para enviar correos de este negocio');
  }

  const { data: business, error: businessError } = await admin
    .from('negocios')
    .select('id, nombre, email, email_alias, email_from_name, email_reply_to, moneda')
    .eq('id', negocioId)
    .maybeSingle();

  if (businessError) throw businessError;
  if (!business) throw new Error('Negocio no encontrado');

  const domain = cleanText(Deno.env.get('SAAS_EMAIL_DOMAIN')) || 'mbs.app';
  const defaultFrom = Deno.env.get('RESEND_FROM_EMAIL') || `MatMax Business Suite <cotizaciones@${domain}>`;
  const alias = normalizeEmailAlias(business.email_alias || business.nombre);
  const fromName = escapeHeaderName(business.email_from_name || business.nombre || 'Business');

  return {
    business,
    from: alias ? `${fromName} <${alias}@${domain}>` : defaultFrom,
    replyTo: cleanText(business.email_reply_to || business.email).toLowerCase() || undefined,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Método no permitido' }, 405);

  try {
    const user = await requireAuthenticatedUser(req);

    const body = await req.json();
    const quote = body.quote || {};
    const negocioId = cleanText(quote.negocio_id || body.negocio_id || body.negocioId || body.negocio?.id);
    if (!negocioId) throw new Error('ID del negocio es obligatorio');
    const { business: negocio, from, replyTo } = await getBusinessEmailSettings(user.id, negocioId);
    const clienteEmail = cleanText(body.clienteEmail || body.email).toLowerCase();
    const pdfBase64 = cleanText(body.pdfBase64);
    const quoteNumber = cleanText(body.quoteNumber || quote.id).slice(0, 16).toUpperCase() || 'QUOTE';
    const businessName = cleanText(negocio.nombre) || 'MatMax Business Suite';
    const currencySymbol = cleanText(body.currency?.primary?.symbol || negocio.moneda) || '€';
    const total = Number(quote.total || 0);

    if (!clienteEmail) throw new Error('Email del cliente es obligatorio');

    const attachments = pdfBase64
      ? [
          {
            filename: `quote-${quoteNumber}.pdf`,
            content: pdfBase64,
          },
        ]
      : [];

    const emailData = await sendResendEmail({
      from,
      to: [clienteEmail],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject: `Cotización ${quoteNumber} - ${businessName}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #18181b;">
          <h2>Cotización ${quoteNumber}</h2>
          <p>Hola ${quote.clientes?.nombre || 'cliente'},</p>
          <p>Adjuntamos tu cotización de <strong>${businessName}</strong>.</p>
          <p><strong>Total:</strong> ${currencySymbol}${Number.isFinite(total) ? total.toFixed(2) : '0.00'}</p>
          <p>Gracias.</p>
        </div>
      `,
      attachments,
    });

    return jsonResponse({ success: true, id: emailData?.id || null });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 400);
  }
});
