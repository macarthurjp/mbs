import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';


function jsonResponse(corsHeaders: Record<string, string>, payload: Record<string, unknown>, status = 200) {
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

function escapeHtml(value: unknown) {
  return cleanText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function requirePlatformAdmin(req: Request) {
  const supabaseUrl = getEnv('APP_SUPABASE_URL', 'SUPABASE_URL');
  const serviceRoleKey = getEnv('APP_SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
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

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: profile, error: profileError } = await admin
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  const role = cleanText(profile?.rol).toLowerCase().replace('-', '_');
  if (role !== 'superadmin' && role !== 'super_admin') {
    throw new Error('Solo soporte puede enviar esta respuesta');
  }

  return user;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(corsHeaders, { success: false, error: 'Método no permitido' }, 405);

  try {
    await requirePlatformAdmin(req);

    const body = await req.json();
    const to = cleanText(body.to).toLowerCase();
    const subject = cleanText(body.subject) || 'Respuesta de soporte';
    const message = cleanText(body.message);
    const responseText = cleanText(body.response);
    const from = Deno.env.get('RESEND_FROM_EMAIL') || 'MatMax Support <onboarding@resend.dev>';

    if (!to) throw new Error('Email de destino es obligatorio');
    if (!responseText) throw new Error('La respuesta es obligatoria');

    const resendApiKey = getEnv('RESEND_API_KEY');
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; color: #18181b;">
            <h2>Respuesta de soporte</h2>
            ${message ? `<p><strong>Mensaje original:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>` : ''}
            <p><strong>Respuesta:</strong></p>
            <p>${escapeHtml(responseText).replace(/\n/g, '<br>')}</p>
          </div>
        `,
      }),
    });

    const data = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      throw new Error(String(data?.message || data?.error || 'No se pudo enviar el email'));
    }

    return jsonResponse(corsHeaders, { success: true, id: data?.id || null });
  } catch (error) {
    return jsonResponse(corsHeaders, { success: false, error: error instanceof Error ? error.message : String(error) }, 400);
  }
});
