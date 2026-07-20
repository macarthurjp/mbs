import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// ---------------------------------------------------------
// SUPABASE ADMIN CLIENT
// ---------------------------------------------------------
function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get('APP_SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY') || '';

  if (!supabaseUrl) throw new Error('Missing APP_SUPABASE_URL');
  if (!serviceRoleKey) throw new Error('Missing APP_SUPABASE_SERVICE_ROLE_KEY');

  return createClient(supabaseUrl, serviceRoleKey);
}

// ---------------------------------------------------------
// STRIPE SIGNATURE VERIFICATION
// ---------------------------------------------------------
function getStripeSignatureParts(signatureHeader: string) {
  const parts = signatureHeader.split(',');
  const timestamp = parts.find((p) => p.startsWith('t='))?.replace('t=', '') || '';
  const signatures = parts
    .filter((p) => p.startsWith('v1='))
    .map((p) => p.replace('v1=', ''))
    .filter(Boolean);

  return { timestamp, signatures };
}

function arrayBufferToHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

async function verifyStripeSignature(body: string, signatureHeader: string, webhookSecret: string) {
  const { timestamp, signatures } = getStripeSignatureParts(signatureHeader);
  if (!timestamp || signatures.length === 0) throw new Error('Invalid stripe-signature header');

  const timestampSeconds = Number(timestamp);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (!Number.isFinite(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > 300) {
    throw new Error('Stripe webhook timestamp is outside tolerance');
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signedPayload = `${timestamp}.${body}`;
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const expectedSignature = arrayBufferToHex(digest);

  if (!signatures.some((signature) => constantTimeEqual(expectedSignature, signature))) {
    throw new Error('Stripe webhook signature verification failed');
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  // Supabase/Postgrest errors are plain objects ({ message, details, hint,
  // code }), not Error instances — String(error) on those collapses to the
  // useless "[object Object]", losing the actual failure reason.
  if (error && typeof error === 'object') {
    const maybeError = error as { message?: unknown; details?: unknown; code?: unknown };
    if (typeof maybeError.message === 'string' && maybeError.message) {
      const details = typeof maybeError.details === 'string' && maybeError.details ? ` (${maybeError.details})` : '';
      const code = typeof maybeError.code === 'string' && maybeError.code ? ` [${maybeError.code}]` : '';
      return `${maybeError.message}${details}${code}`;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

function toStringOrNull(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function normalizeStripePlan(value: unknown, fallback: string | null = 'basic') {
  const plan = String(value || '').trim().toLowerCase();
  if (plan === 'pro' || plan === 'premium') return plan;
  if (plan === 'basic') return plan;
  return fallback;
}

// Price ID reflects what Stripe is actually billing right now (e.g. after a
// self-service plan switch in the billing portal, which never touches
// metadata) and must win over metadata, which is only ever set once at
// checkout-session creation and can go stale.
function getPlanFromPriceId(priceId: string) {
  if (priceId && priceId === Deno.env.get('STRIPE_PRICE_BASIC')) return 'basic';
  if (priceId && priceId === Deno.env.get('STRIPE_PRICE_PRO')) return 'pro';
  if (priceId && priceId === Deno.env.get('STRIPE_PRICE_PREMIUM')) return 'premium';
  return null;
}

function getPlanFromSubscription(subscription) {
  const priceId = subscription.items?.data?.[0]?.price?.id || '';
  return getPlanFromPriceId(priceId) || normalizeStripePlan(subscription.metadata?.plan, null);
}

function getPlanFromInvoice(invoice) {
  const firstLine = invoice.lines?.data?.[0];
  const priceId =
    firstLine?.price?.id ||
    firstLine?.plan?.id ||
    firstLine?.pricing?.price_details?.price ||
    '';

  return getPlanFromPriceId(priceId) || normalizeStripePlan(invoice.metadata?.plan, null);
}

// Stripe API versions from 2025+ moved `invoice.subscription` to
// `invoice.parent.subscription_details.subscription`.
function getInvoiceSubscriptionId(invoice) {
  return toStringOrNull(invoice.subscription) ||
    toStringOrNull(invoice.parent?.subscription_details?.subscription);
}

function getEstadoFromSubscription(subscription) {
  const status = String(subscription.status || '').toLowerCase();

  if (subscription.cancel_at_period_end) return 'cancelado';
  if (status === 'active' || status === 'trialing') return 'activo';
  if (status === 'canceled' || status === 'incomplete_expired') return 'cancelado';
  return 'suspendido';
}

async function createBusinessNotification(supabase, payload) {
  const { error } = await supabase
    .from('notifications')
    .insert(payload);

  if (!error) return;

  console.warn('Notification with category was not created:', error);

  const { category, ...fallbackPayload } = payload;
  const { error: fallbackError } = await supabase
    .from('notifications')
    .insert(fallbackPayload);

  if (fallbackError) {
    console.warn('Notification fallback was not created:', fallbackError);
  }
}

function formatPlanLabel(plan: string | null | undefined) {
  const value = String(plan || 'basic').trim().toLowerCase();
  if (value === 'premium') return 'Premium';
  if (value === 'pro') return 'Pro';
  return 'Basic';
}

function getSubscriptionNotificationCopy(eventKind: string, estado: string, plan: string | null) {
  const planLabel = formatPlanLabel(plan);

  if (eventKind === 'payment_paid') {
    return {
      title: 'Pago de suscripción confirmado',
      message: `Stripe confirmó el pago de la suscripción. Estado: ${estado}. Plan: ${planLabel}.`,
      type: 'success',
    };
  }

  if (eventKind === 'payment_failed') {
    return {
      title: 'Pago de suscripción fallido',
      message: `Stripe reportó un pago fallido. El negocio quedó en estado ${estado}.`,
      type: 'warning',
    };
  }

  if (eventKind === 'subscription_deleted') {
    return {
      title: 'Suscripción cancelada',
      message: `La suscripción fue cancelada en Stripe. El negocio quedó en estado ${estado}.`,
      type: 'warning',
    };
  }

  return {
    title: 'Suscripción actualizada',
    message: `Stripe actualizó la suscripción. Estado: ${estado}. Plan: ${planLabel}.`,
    type: estado === 'activo' ? 'success' : 'warning',
  };
}

async function markEventAsProcessing(supabase, event) {
  if (!event?.id) return true;

  const { error } = await supabase
    .from('stripe_webhook_events')
    .insert({
      id: event.id,
      type: event.type || 'unknown',
      processed_at: null,
      payload: event,
    });

  if (!error) return true;

  if (error.code === '23505') {
    const { data, error: readError } = await supabase
      .from('stripe_webhook_events')
      .select('processed_at')
      .eq('id', event.id)
      .maybeSingle();

    if (readError) throw readError;

    if (data?.processed_at) {
      console.log('Duplicate Stripe event ignored:', event.id);
      return false;
    }

    console.log('Retrying previously unfinished Stripe event:', event.id);
    return true;
  }

  throw error;
}

async function markEventAsProcessed(supabase, event) {
  if (!event?.id) return;

  const { error } = await supabase
    .from('stripe_webhook_events')
    .update({
      processed_at: new Date().toISOString(),
      processing_error: null,
    })
    .eq('id', event.id);

  if (error) throw error;
}

async function markEventAsFailed(supabase, event, error) {
  if (!event?.id) return;

  await supabase
    .from('stripe_webhook_events')
    .update({
      processing_error: getErrorMessage(error),
    })
    .eq('id', event.id);
}

// ---------------------------------------------------------
// ACTIVAR NEGOCIO DESPUÉS DE CHECKOUT
// ---------------------------------------------------------
async function activateBusinessFromCheckoutSession(supabase, session) {
  const negocioId = session.metadata?.negocio_id;
  const plan = normalizeStripePlan(session.metadata?.plan, 'basic');
  const customerId = toStringOrNull(session.customer);
  const subscriptionId = toStringOrNull(session.subscription);
  const userId = toStringOrNull(session.metadata?.user_id);

  console.log('Activating business:', { negocioId, plan, customerId, subscriptionId });

  if (!negocioId) throw new Error('Missing negocio_id');
  if (!customerId) throw new Error('Missing customer id');
  if (!subscriptionId) throw new Error('Missing subscription id');

  // Update negocios
  const { data: updatedBusiness, error: businessError } = await supabase
    .from('negocios')
    .update({
      estado: 'activo',
      plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    })
    .eq('id', negocioId)
    .select()
    .maybeSingle();

  if (businessError) throw businessError;
  if (!updatedBusiness) throw new Error('Business not found during checkout activation');

  // Only attach/promote the checkout-completer as this business's owner when
  // they're genuinely the new owner claiming their own business (no business
  // yet, or already this one) — never a platform admin who created this
  // checkout on someone else's behalf (create-checkout-session explicitly
  // allows that). Without this guard a superadmin helping a customer check
  // out would silently get demoted to 'dueño' of the customer's business.
  if (userId) {
    const { data: existingUsuario, error: existingUsuarioError } = await supabase
      .from('usuarios')
      .select('negocio_id, rol')
      .eq('id', userId)
      .maybeSingle();

    if (existingUsuarioError) throw existingUsuarioError;

    const existingRole = String(existingUsuario?.rol || '').trim().toLowerCase().replace('-', '_');
    const isPlatformAdmin = existingRole === 'superadmin' || existingRole === 'super_admin';
    const ownsNoOtherBusiness = !existingUsuario?.negocio_id || existingUsuario.negocio_id === negocioId;

    if (!isPlatformAdmin && ownsNoOtherBusiness) {
      const { error: userError } = await supabase
        .from('usuarios')
        .update({ negocio_id: negocioId, rol: 'dueño', is_active: true })
        .eq('id', userId);

      if (userError) throw userError;
    }
  }

  // Update suscripciones
  const { error: subscriptionError } = await supabase
    .from('suscripciones')
    .upsert(
      {
        negocio_id: negocioId,
        plan,
        estado: 'activo',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
      },
      { onConflict: 'negocio_id' }
    );

  if (subscriptionError) throw subscriptionError;

  await createBusinessNotification(supabase, {
    negocio_id: negocioId,
    user_id: null,
    audience: 'admin',
    title: 'Suscripción activada',
    message: `Stripe activó la suscripción del negocio en el plan ${formatPlanLabel(plan)}.`,
    type: 'success',
    category: 'subscription',
    link: 'settings',
    read: false,
  });

  console.log('Business activated successfully');
}

// ---------------------------------------------------------
// ACTUALIZAR ESTADO DE NEGOCIO POR SUBSCRIPCIÓN
// ---------------------------------------------------------
async function setBusinessStatusBySubscription(
  supabase,
  subscriptionId: string | null,
  estado: string,
  customerId: string | null = null,
  plan: string | null = null,
  eventKind: string = 'subscription_updated'
) {
  if (!subscriptionId && !customerId) {
    console.warn('Missing subscription/customer id');
    return;
  }

  const orFilter = [
    subscriptionId ? `stripe_subscription_id.eq.${subscriptionId}` : null,
    customerId ? `stripe_customer_id.eq.${customerId}` : null
  ]
    .filter(Boolean)
    .join(',');

  // Update negocios
  const updatePayload = plan ? { estado, plan } : { estado };

  const { data: updatedBusinesses, error: businessError } = await supabase
    .from('negocios')
    .update(updatePayload)
    .or(orFilter)
    .select();

  if (businessError) throw businessError;

  // Update suscripciones
  const { error: subscriptionError } = await supabase
    .from('suscripciones')
    .update(updatePayload)
    .or(orFilter);

  if (subscriptionError) throw subscriptionError;

  if ((updatedBusinesses || []).length > 0) {
    const subscriptionRows = (updatedBusinesses || []).map((business) => ({
      negocio_id: business.id,
      estado,
      ...(plan ? { plan } : {}),
      ...(customerId ? { stripe_customer_id: customerId } : {}),
      ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
    }));

    const { error: subscriptionUpsertError } = await supabase
      .from('suscripciones')
      .upsert(subscriptionRows, { onConflict: 'negocio_id' });

    if (subscriptionUpsertError) throw subscriptionUpsertError;
  }

  const notificationCopy = getSubscriptionNotificationCopy(eventKind, estado, plan);

  for (const business of updatedBusinesses || []) {
    await createBusinessNotification(supabase, {
      negocio_id: business.id,
      user_id: null,
      audience: 'admin',
      title: notificationCopy.title,
      message: notificationCopy.message,
      type: notificationCopy.type,
      category: 'subscription',
      link: 'settings',
      read: false,
    });
  }

  console.log('Estado actualizado:', { estado, updatedBusinesses });
}

// ---------------------------------------------------------
// MAIN WEBHOOK HANDLER
// ---------------------------------------------------------
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req, { headers: 'authorization, x-client-info, apikey, content-type, stripe-signature' });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) throw new Error('Missing stripe-signature');

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';
    if (!webhookSecret) throw new Error('Missing STRIPE_WEBHOOK_SECRET');

    const body = await req.text();
    await verifyStripeSignature(body, signature, webhookSecret);

    const event = JSON.parse(body);
    console.log('Stripe event:', event.type);

    const supabase = getSupabaseAdmin();
    const shouldProcessEvent = await markEventAsProcessing(supabase, event);

    if (!shouldProcessEvent) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          await activateBusinessFromCheckoutSession(supabase, event.data.object);
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object;
          await setBusinessStatusBySubscription(
            supabase,
            getInvoiceSubscriptionId(invoice),
            'activo',
            toStringOrNull(invoice.customer),
            getPlanFromInvoice(invoice),
            'payment_paid'
          );
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          await setBusinessStatusBySubscription(
            supabase,
            getInvoiceSubscriptionId(invoice),
            'suspendido',
            toStringOrNull(invoice.customer),
            null,
            'payment_failed'
          );
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          await setBusinessStatusBySubscription(
            supabase,
            subscription.id,
            'cancelado',
            toStringOrNull(subscription.customer),
            null,
            'subscription_deleted'
          );
          break;
        }

        case 'customer.subscription.updated': {
          const s = event.data.object;
          const estado = getEstadoFromSubscription(s);

          await setBusinessStatusBySubscription(
            supabase,
            s.id,
            estado,
            toStringOrNull(s.customer),
            getPlanFromSubscription(s),
            'subscription_updated'
          );
          break;
        }

        default:
          console.log('Unhandled event:', event.type);
      }

      await markEventAsProcessed(supabase, event);
    } catch (processingError) {
      await markEventAsFailed(supabase, event, processingError);
      throw processingError;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);

    return new Response(
      JSON.stringify({ error: getErrorMessage(error) }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
