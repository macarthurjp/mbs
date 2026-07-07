import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@12.18.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// ---------------------------------------------------------
// CONFIGURACIÓN
// ---------------------------------------------------------
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const SUPABASE_URL = Deno.env.get('APP_SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY') || '';

if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Faltan variables de entorno necesarias.');
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function getPlanFromPriceId(priceId: string | null) {
  if (priceId && priceId === Deno.env.get('STRIPE_PRICE_BASIC')) return 'basic';
  if (priceId && priceId === Deno.env.get('STRIPE_PRICE_PRO')) return 'pro';
  if (priceId && priceId === Deno.env.get('STRIPE_PRICE_PREMIUM')) return 'premium';
  return null;
}

async function requirePlatformAdmin(req: Request) {
  const anonKey = Deno.env.get('APP_SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
  const authHeader = req.headers.get('Authorization') || '';

  if (!anonKey) throw new Error('Falta APP_SUPABASE_ANON_KEY o SUPABASE_ANON_KEY');
  if (!authHeader) throw new Error('Authorization es obligatorio');

  const authClient = createClient(SUPABASE_URL, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) throw new Error('Usuario no autenticado');

  const { data: profile, error: profileError } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  const role = String(profile?.rol || '').trim().toLowerCase().replace('-', '_');
  if (role !== 'superadmin' && role !== 'super_admin') {
    throw new Error('Solo un superadmin puede ejecutar esta sincronización');
  }
}

// ---------------------------------------------------------
// FUNCIÓN PRINCIPAL
// ---------------------------------------------------------
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req, { methods: 'GET, OPTIONS' });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    await requirePlatformAdmin(req);

    console.log('Iniciando sincronización de suscripciones Stripe → Supabase...');

    const subscriptions = await stripe.subscriptions.list({ limit: 100 });
    let updatedCount = 0;

    for (const s of subscriptions.data) {
      const customerId = s.customer as string;
      const subscriptionId = s.id;
      const status = s.status;
      const cancelAt = s.cancel_at ? new Date(s.cancel_at * 1000).toISOString() : null;
      const planId = s.items.data[0]?.price?.id || null;
      const plan = getPlanFromPriceId(planId) || s.metadata?.plan || null;

      const estado =
        s.cancel_at_period_end
          ? 'cancelado'
          : status === 'active' || status === 'trialing'
          ? 'activo'
          : status === 'canceled' || status === 'incomplete_expired'
            ? 'cancelado'
            : 'suspendido';

      const { error } = await supabase
        .from('negocios')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          estado,
          ...(plan ? { plan } : {}),
          cancel_at: cancelAt,
        })
        .or(`stripe_subscription_id.eq.${subscriptionId},stripe_customer_id.eq.${customerId}`);

      if (error) {
        console.error('Error actualizando negocio:', error);
      } else {
        updatedCount++;
      }

      const { data: matchedBusinesses, error: readBusinessError } = await supabase
        .from('negocios')
        .select('id')
        .or(`stripe_subscription_id.eq.${subscriptionId},stripe_customer_id.eq.${customerId}`);

      if (readBusinessError) {
        console.error('Error leyendo negocios sincronizados:', readBusinessError);
        continue;
      }

      const subscriptionRows = (matchedBusinesses || []).map((business) => ({
        negocio_id: business.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        estado,
        ...(plan ? { plan } : {}),
      }));

      if (subscriptionRows.length > 0) {
        const { error: subscriptionError } = await supabase
          .from('suscripciones')
          .upsert(subscriptionRows, { onConflict: 'negocio_id' });

        if (subscriptionError) {
          console.error('Error actualizando suscripción:', subscriptionError);
        }
      }
    }

    console.log(`Sincronización completada. Negocios actualizados: ${updatedCount}`);

    return new Response(
      JSON.stringify({ success: true, updated: updatedCount }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en sincronización:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
