import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.18.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type PlanId = 'basic' | 'pro' | 'premium';

const planPriceEnv: Record<PlanId, string> = {
  basic: 'STRIPE_PRICE_BASIC',
  pro: 'STRIPE_PRICE_PRO',
  premium: 'STRIPE_PRICE_PREMIUM',
};

function normalizePlan(plan: unknown): PlanId {
  const value = String(plan || '').trim().toLowerCase();
  if (value === 'pro' || value === 'premium') return value;
  return 'basic';
}

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

function isAllowedCheckoutUrl(value: string) {
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (error && typeof error === 'object') {
    const maybeError = error as { message?: unknown; error_description?: unknown };
    const message = maybeError.message || maybeError.error_description;

    if (typeof message === 'string' && message) return message;
  }

  return 'Error desconocido';
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
    const plan = normalizePlan(body.plan);
    const negocioId = String(body.negocio_id || '').trim();
    const successUrl = String(body.success_url || '').trim();
    const cancelUrl = String(body.cancel_url || '').trim();

    if (!negocioId) throw new Error('negocio_id es obligatorio');
    if (!successUrl) throw new Error('success_url es obligatorio');
    if (!cancelUrl) throw new Error('cancel_url es obligatorio');
    if (!isAllowedCheckoutUrl(successUrl)) throw new Error('success_url inválido');
    if (!isAllowedCheckoutUrl(cancelUrl)) throw new Error('cancel_url inválido');

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
      throw new Error('No tienes permiso para crear checkout de este negocio');
    }

    const { data: business, error: businessError } = await admin
      .from('negocios')
      .select('id, plan, stripe_customer_id')
      .eq('id', negocioId)
      .maybeSingle();

    if (businessError) throw businessError;
    if (!business) throw new Error('No se encontró el negocio');

    const stripe = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
    const priceId = getRequiredEnv(planPriceEnv[plan]);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: negocioId,
      customer: business.stripe_customer_id || undefined,
      metadata: {
        negocio_id: negocioId,
        user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          negocio_id: negocioId,
          user_id: user.id,
          plan,
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new Error('Stripe no devolvió una URL de pago');
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('Error en create-checkout-session:', message, error);

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
