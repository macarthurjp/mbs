import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { escapeHtml } from '../_shared/emailTemplate.ts';

// How many days out from trial_ends_at a business becomes eligible for the
// reminder. trial_reminder_sent_at makes this a one-time send per business,
// not a resend on every cron tick while inside the window.
const REMINDER_WINDOW_DAYS = 3;

const SUPABASE_URL = Deno.env.get('APP_SUPABASE_URL') || Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const TRIAL_REMINDER_FROM_EMAIL = Deno.env.get('TRIAL_REMINDER_FROM_EMAIL') || 'MatMax Business Suite <no-reply@matmaxsuite.com>';
const CRON_SECRET = Deno.env.get('TRIAL_REMINDER_CRON_SECRET') || '';
const APP_URL = Deno.env.get('APP_URL') || 'https://app.matmaxsuite.com';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing APP_SUPABASE_URL or APP_SUPABASE_SERVICE_ROLE_KEY');
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type Negocio = {
  id: string;
  nombre: string | null;
  email: string | null;
  email_reply_to: string | null;
  trial_ends_at: string;
};

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

function daysRemaining(trialEndsAt: string) {
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

function renderReminderEmail(negocio: Negocio) {
  const businessName = escapeHtml(negocio.nombre || 'tu negocio');
  const dateEs = escapeHtml(formatDate(negocio.trial_ends_at));
  const dateEn = escapeHtml(
    new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(negocio.trial_ends_at)),
  );
  const remaining = daysRemaining(negocio.trial_ends_at);
  const upgradeUrl = `${APP_URL}?checkout=reminder`;

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f7f4ec;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f4ec;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#050505;padding:28px 32px;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-weight:bold;font-size:20px;color:#f4c542;letter-spacing:0.3px;">
                  MatMax Business Suite
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 8px 32px;">
                <h1 style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-weight:bold;font-size:26px;line-height:1.25;color:#050505;">
                  Tu prueba gratuita vence en ${remaining} ${remaining === 1 ? 'día' : 'días'}
                </h1>
                <p style="margin:0 0 20px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#52525b;">
                  La prueba gratuita de <strong>${businessName}</strong> vence el <strong>${dateEs}</strong>. Elige un plan antes de esa fecha para que tu equipo no pierda acceso a ventas, inventario, clientes y facturación.
                </p>
                <p style="margin:0 0 28px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#a1a1aa;">
                  Your free trial for ${businessName} ends on ${dateEn}. Choose a plan before then to keep access.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 36px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color:#050505;border-radius:8px;">
                      <a href="${upgradeUrl}"
                         style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:15px;color:#f4c542;text-decoration:none;border-radius:8px;">
                        Actualizar plan / Choose a plan →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px 32px;border-top:1px solid #f2eee3;">
                <p style="margin:20px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#71717a;">
                  Si ya elegiste un plan, ignora este correo.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a1a1aa;">
            MatMax Business Suite · matmaxsuite.com
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Tu prueba gratuita de ${negocio.nombre || 'tu negocio'} vence el ${dateEs} (${remaining} ${remaining === 1 ? 'día' : 'días'}). Elige un plan: ${upgradeUrl}`;

  return { html, text, subject: `Tu prueba gratuita vence en ${remaining} ${remaining === 1 ? 'día' : 'días'} — MatMax Business Suite` };
}

async function sendReminderEmail(negocio: Negocio, to: string) {
  const { html, text, subject } = renderReminderEmail(negocio);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: TRIAL_REMINDER_FROM_EMAIL,
      to,
      subject,
      html,
      text,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.message || data?.error || 'resend_error'));
  }

  return data?.id || null;
}

function authorize(req: Request) {
  const providedSecret = req.headers.get('x-trial-reminder-secret') || '';
  return Boolean(CRON_SECRET) && providedSecret === CRON_SECRET;
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

  if (!authorize(req)) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    if (!RESEND_API_KEY) throw new Error('Falta RESEND_API_KEY');

    const windowEnd = new Date(Date.now() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: negocios, error: queryError } = await admin
      .from('negocios')
      .select('id, nombre, email, email_reply_to, trial_ends_at')
      .eq('plan', 'trial')
      .neq('estado', 'activo')
      .is('trial_reminder_sent_at', null)
      .not('trial_ends_at', 'is', null)
      .gt('trial_ends_at', now)
      .lte('trial_ends_at', windowEnd);

    if (queryError) throw queryError;

    const results: Array<{ negocio_id: string; sent: boolean; error?: string }> = [];

    for (const negocio of (negocios || []) as Negocio[]) {
      const to = negocio.email_reply_to || negocio.email;

      if (!to) {
        results.push({ negocio_id: negocio.id, sent: false, error: 'sin_email' });
        continue;
      }

      try {
        await sendReminderEmail(negocio, to);

        const { error: updateError } = await admin
          .from('negocios')
          .update({ trial_reminder_sent_at: new Date().toISOString() })
          .eq('id', negocio.id);

        if (updateError) throw updateError;

        results.push({ negocio_id: negocio.id, sent: true });
      } catch (error) {
        results.push({ negocio_id: negocio.id, sent: false, error: getErrorMessage(error) });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        checked: (negocios || []).length,
        sent: results.filter((r) => r.sent).length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('send-trial-reminders error:', message, error);

    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
