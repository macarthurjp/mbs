import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name) || '';
  if (!value) throw new Error(`Falta ${name}`);
  return value;
}

function getAllowedRedirectHosts() {
  return (Deno.env.get('APP_ALLOWED_HOSTS') || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedReturnUrl(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (url.protocol !== 'https:') return false;

    return getAllowedRedirectHosts().includes(hostname);
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = getRequiredEnv('APP_SUPABASE_URL');
    const serviceRoleKey = getRequiredEnv('APP_SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('APP_SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const authHeader = req.headers.get('Authorization') || '';

    if (!anonKey) throw new Error('Falta APP_SUPABASE_ANON_KEY o SUPABASE_ANON_KEY');
    if (!authHeader) throw new Error('Authorization es obligatorio');

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Usuario no autenticado');
    }

    const body = await req.json();
    const negocioId = String(body.negocio_id || '').trim();
    const returnUrl = String(body.return_url || '').trim();

    if (!negocioId) throw new Error('negocio_id es obligatorio');
    if (!returnUrl) throw new Error('return_url es obligatorio');
    if (!isAllowedReturnUrl(returnUrl)) throw new Error('return_url inválido');

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: profile, error: profileError } = await admin
      .from('usuarios')
      .select('negocio_id, rol')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    const role = String(profile?.rol || '').trim().toLowerCase().replace('-', '_');
    const isPlatformAdmin = role === 'superadmin' || role === 'super_admin';

    if (!isPlatformAdmin && profile?.negocio_id !== negocioId) {
      throw new Error('No tienes permiso para administrar este negocio');
    }

    const { data: business, error: businessError } = await admin
      .from('negocios')
      .select('stripe_customer_id')
      .eq('id', negocioId)
      .maybeSingle();

    if (businessError) throw businessError;
    if (!business?.stripe_customer_id) throw new Error('Este negocio no tiene cliente Stripe conectado');

    const stripeSecretKey = getRequiredEnv('STRIPE_SECRET_KEY');

    const formData = new URLSearchParams();
    formData.append('customer', business.stripe_customer_id);
    formData.append('return_url', returnUrl);

    const stripeResponse = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const stripeData = await stripeResponse.json();

    if (!stripeResponse.ok) {
      throw new Error(stripeData?.error?.message || 'Stripe no pudo abrir el portal');
    }

    return new Response(JSON.stringify({ url: stripeData.url }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error desconocido',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
