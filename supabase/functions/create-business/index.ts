import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type PlanId = 'basic' | 'pro' | 'premium';

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

const RESERVED_EMAIL_ALIASES = new Set([
  'admin',
  'administrator',
  'billing',
  'contact',
  'facturas',
  'hello',
  'help',
  'info',
  'invoices',
  'mail',
  'noreply',
  'no-reply',
  'postmaster',
  'root',
  'security',
  'support',
  'ventas',
  'webmaster',
]);

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

async function getUniqueBusinessAlias(admin: ReturnType<typeof createClient>, businessName: string, negocioId: string | null) {
  const baseAlias = normalizeEmailAlias(businessName) || 'business';
  const safeBaseAlias = RESERVED_EMAIL_ALIASES.has(baseAlias) ? `${baseAlias}-business` : baseAlias;
  const suffix = negocioId ? String(negocioId).slice(0, 6) : String(Date.now()).slice(-6);
  const candidates = [
    safeBaseAlias,
    `${safeBaseAlias}-${suffix}`,
  ];

  for (const candidate of candidates) {
    const { data, error } = await admin
      .from('negocios')
      .select('id')
      .ilike('email_alias', candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data || data.id === negocioId) return candidate;
  }

  return `${safeBaseAlias}-${suffix}-${Math.floor(Math.random() * 9999)}`;
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
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Usuario no autenticado');
    }

    const body = await req.json();
    const bodyUserId = cleanText(body.user_id);
    const ownerName = cleanText(body.owner_name || body.full_name || body.nombre_dueno || body.nombre);
    const businessName = cleanText(body.business_name || body.nombre);
    const phone = cleanText(body.phone || body.telefono);
    const address = cleanText(body.address || body.direccion);
    const currency = cleanText(body.moneda) || '€';
    const email = cleanText(body.email).toLowerCase() || user.email || null;
    const plan = normalizePlan(body.plan);

    if (bodyUserId && bodyUserId !== user.id) {
      throw new Error('El user_id no coincide con el usuario autenticado');
    }

    if (!businessName) throw new Error('El nombre de la empresa es obligatorio');
    if (!email) throw new Error('El email es obligatorio');

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: existingUser, error: existingUserError } = await admin
      .from('usuarios')
      .select('negocio_id, rol')
      .eq('id', user.id)
      .maybeSingle();

    if (existingUserError) throw existingUserError;

    let negocioId = existingUser?.negocio_id || null;

    if (negocioId) {
      const existingRole = cleanText(existingUser?.rol).toLowerCase().replace('-', '_');
      const canManageBusiness = ['owner', 'dueno', 'dueño', 'admin', 'administrador', 'superadmin', 'super_admin'].includes(existingRole);

      if (!canManageBusiness) {
        throw new Error('No tienes permiso para editar este negocio');
      }

      const { data: currentBusiness, error: currentBusinessError } = await admin
        .from('negocios')
        .select('email_alias')
        .eq('id', negocioId)
        .maybeSingle();

      if (currentBusinessError) throw currentBusinessError;

      const emailAlias = cleanText(currentBusiness?.email_alias) || await getUniqueBusinessAlias(admin, businessName, negocioId);
      const { error: updateBusinessError } = await admin
        .from('negocios')
        .update({
          nombre: businessName,
          telefono: phone || null,
          direccion: address || null,
          plan,
          moneda: currency,
          email_alias: emailAlias,
          email_from_name: businessName,
          email_reply_to: email,
        })
        .eq('id', negocioId);

      if (updateBusinessError) throw updateBusinessError;
    } else {
      const emailAlias = await getUniqueBusinessAlias(admin, businessName, null);
      const { data: negocio, error: negocioError } = await admin
        .from('negocios')
        .insert({
          nombre: businessName,
          telefono: phone || null,
          direccion: address || null,
          email,
          email_alias: emailAlias,
          email_from_name: businessName,
          email_reply_to: email,
          moneda: currency,
          logo_url: null,
          estado: 'pendiente',
          plan,
          trial_ends_at: null,
        })
        .select('id')
        .single();

      if (negocioError) throw negocioError;
      negocioId = negocio?.id || null;
    }

    if (!negocioId) {
      throw new Error('No se pudo crear el negocio');
    }

    const { error: usuarioError } = await admin
      .from('usuarios')
      .upsert(
        {
          id: user.id,
          negocio_id: negocioId,
          rol: 'dueño',
          email,
          username: String(email || user.email || '').split('@')[0] || null,
          full_name: ownerName || user.email || email,
          is_active: true,
        },
        { onConflict: 'id' },
      );

    if (usuarioError) throw usuarioError;

    return new Response(JSON.stringify({ ok: true, negocio_id: negocioId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('Error en create-business:', message, error);

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
