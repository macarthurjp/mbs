import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type UserRole = 'seller' | 'admin' | 'owner' | 'super_admin';

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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  if (error && typeof error === 'object') {
    const objectError = error as Record<string, unknown>;
    const nestedMessage =
      objectError.message ||
      objectError.error_description ||
      objectError.error ||
      objectError.msg ||
      objectError.details;

    if (nestedMessage && nestedMessage !== error) {
      return getErrorMessage(nestedMessage);
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Error desconocido';
    }
  }

  return String(error || 'Error desconocido');
}

function normalizeRole(role: unknown): UserRole {
  const value = cleanText(role).toLowerCase().replace('-', '_');
  if (value === 'administrador') return 'admin';
  if (value === 'vendedor') return 'seller';
  if (value === 'dueno' || value === 'dueño') return 'owner';
  if (value === 'superadmin') return 'super_admin';
  if (value === 'admin' || value === 'owner' || value === 'super_admin') return value;
  return 'seller';
}

function isPlatformAdmin(role: string | null | undefined) {
  const value = cleanText(role).toLowerCase().replace('-', '_');
  return value === 'superadmin' || value === 'super_admin';
}

function canManageBusinessUsers(role: string | null | undefined) {
  const value = cleanText(role).toLowerCase().replace('-', '_');
  return ['owner', 'dueno', 'dueño', 'admin', 'administrador'].includes(value);
}

function formatRoleLabel(role: string) {
  if (role === 'admin') return 'Administrador';
  if (role === 'owner') return 'Owner';
  if (role === 'super_admin') return 'Super admin';
  return 'Vendedor';
}

function getProfileName(profile: Record<string, unknown> | null | undefined, fallback = 'Usuario') {
  return cleanText(profile?.full_name || profile?.nombre || profile?.name || profile?.email) || fallback;
}

async function createBusinessNotification(supabase, payload: Record<string, unknown>) {
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

async function getAuthenticatedUser(req: Request, supabaseUrl: string, anonKey: string) {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Método no permitido' }, 405);

  try {
    const supabaseUrl = getEnv('APP_SUPABASE_URL', 'SUPABASE_URL');
    const serviceRoleKey = getEnv('APP_SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = getEnv('APP_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
    const caller = await getAuthenticatedUser(req, supabaseUrl, anonKey);
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const email = cleanText(body.email).toLowerCase();
    const username = cleanText(body.username) || email.split('@')[0];
    const fullName = cleanText(body.full_name || body.fullName || body.name);
    const password = String(body.password || '');
    const targetRole = normalizeRole(body.role || body.rol);
    const requestedNegocioId = cleanText(body.negocio_id) || null;
    const isActive = body.is_active !== false;

    if (!email) throw new Error('Email es obligatorio');
    if (!fullName) throw new Error('Nombre completo es obligatorio');
    if (password.length < 6) throw new Error('La contraseña debe tener mínimo 6 caracteres');
    if (targetRole === 'super_admin') throw new Error('No se pueden crear super admins desde esta función');

    const { data: callerProfile, error: callerProfileError } = await admin
      .from('usuarios')
      .select('id, negocio_id, rol, email, full_name')
      .eq('id', caller.id)
      .maybeSingle();

    if (callerProfileError) throw callerProfileError;
    if (!callerProfile) throw new Error('No se encontró el perfil del usuario autenticado');

    const callerIsPlatformAdmin = isPlatformAdmin(callerProfile.rol);
    const callerCanManageBusiness = canManageBusinessUsers(callerProfile.rol);

    if (!callerIsPlatformAdmin && !callerCanManageBusiness) {
      throw new Error('No tienes permiso para crear usuarios');
    }

    const negocioId = callerIsPlatformAdmin ? requestedNegocioId : callerProfile.negocio_id;

    if (!callerIsPlatformAdmin) {
      if (!negocioId) throw new Error('Tu usuario no tiene negocio asignado');
      if (requestedNegocioId && requestedNegocioId !== negocioId) {
        throw new Error('No puedes crear usuarios en otro negocio');
      }
      const callerRole = normalizeRole(callerProfile.rol);
      const allowedRoles = callerRole === 'owner' ? ['seller', 'admin'] : ['seller'];

      if (!allowedRoles.includes(targetRole)) {
        throw new Error(callerRole === 'owner'
          ? 'Solo puedes crear usuarios vendedor o administrador'
          : 'Solo puedes crear usuarios vendedor');
      }
    }

    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        username,
        role: targetRole,
        negocio_id: negocioId,
      },
    });

    if (createError) throw createError;
    if (!createdUser.user?.id) throw new Error('No se pudo crear el usuario en Auth');

    const userId = createdUser.user.id;

    const { error: profileError } = await admin
      .from('usuarios')
      .upsert(
        {
          id: userId,
          negocio_id: negocioId,
          rol: targetRole,
          email,
          username,
          full_name: fullName,
          is_active: isActive,
        },
        { onConflict: 'id' },
      );

    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    if (!isActive) {
      await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
    }

    if (negocioId) {
      await createBusinessNotification(admin, {
        negocio_id: negocioId,
        user_id: null,
        audience: 'admin',
        title: 'Usuario creado',
        message: `${getProfileName(callerProfile)} creó a ${fullName} (${email}) como ${formatRoleLabel(targetRole)}.`,
        type: 'info',
        category: 'users',
        link: 'users',
        read: false,
      });
    }

    return jsonResponse({
      success: true,
      user_id: userId,
      id: userId,
      negocio_id: negocioId,
    });
  } catch (error) {
    return jsonResponse({ error: getErrorMessage(error) }, 400);
  }
});
