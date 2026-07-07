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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  if (error && typeof error === 'object') {
    const objectError = error as Record<string, unknown>;
    const nestedMessage =
      objectError.message ||
      objectError.error_description ||
      objectError.error ||
      objectError.msg;

    if (typeof nestedMessage === 'string' && nestedMessage) return nestedMessage;
  }

  return 'Error desconocido';
}

function normalizeRole(role: unknown) {
  const value = cleanText(role).toLowerCase().replace('-', '_');
  if (value === 'administrador') return 'admin';
  if (value === 'vendedor') return 'seller';
  if (value === 'dueno' || value === 'dueño') return 'owner';
  if (value === 'superadmin') return 'super_admin';
  if (value === 'admin' || value === 'owner' || value === 'seller' || value === 'super_admin') return value;
  return '';
}

function isPlatformAdmin(role: string | null | undefined) {
  const value = normalizeRole(role);
  return value === 'super_admin';
}

function canManageBusinessUsers(role: string | null | undefined) {
  const value = normalizeRole(role);
  return ['owner', 'admin'].includes(value);
}

function formatRoleLabel(role: string | null | undefined) {
  const value = normalizeRole(role);
  if (value === 'admin') return 'Administrador';
  if (value === 'owner') return 'Owner';
  if (value === 'super_admin') return 'Super admin';
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
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(corsHeaders, { error: 'Método no permitido' }, 405);

  try {
    const supabaseUrl = getEnv('APP_SUPABASE_URL', 'SUPABASE_URL');
    const serviceRoleKey = getEnv('APP_SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = getEnv('APP_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
    const caller = await getAuthenticatedUser(req, supabaseUrl, anonKey);
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const userId = cleanText(body.userId || body.user_id || body.id);
    const email = cleanText(body.email).toLowerCase();
    const fullName = cleanText(body.full_name || body.fullName || body.name);
    const requestedRole = normalizeRole(body.role || body.rol);
    const isActive = body.is_active;

    if (!userId) throw new Error('userId es obligatorio');
    if (!email) throw new Error('Email es obligatorio');

    const { data: callerProfile, error: callerProfileError } = await admin
      .from('usuarios')
      .select('id, negocio_id, rol, email, full_name')
      .eq('id', caller.id)
      .maybeSingle();

    if (callerProfileError) throw callerProfileError;
    if (!callerProfile) throw new Error('No se encontró el perfil del usuario autenticado');

    const { data: targetProfile, error: targetProfileError } = await admin
      .from('usuarios')
      .select('id, negocio_id, rol, username, email, full_name, is_active')
      .eq('id', userId)
      .maybeSingle();

    if (targetProfileError) throw targetProfileError;
    if (!targetProfile) throw new Error('No se encontró el usuario a actualizar');

    const callerIsPlatformAdmin = isPlatformAdmin(callerProfile.rol);
    const callerIsSelf = caller.id === userId;
    const callerCanManageBusiness = canManageBusinessUsers(callerProfile.rol);

    if (!callerIsPlatformAdmin && !callerIsSelf) {
      if (!callerCanManageBusiness || callerProfile.negocio_id !== targetProfile.negocio_id) {
        throw new Error('No tienes permiso para actualizar este usuario');
      }

      const targetRole = normalizeRole(targetProfile.rol);
      if (targetRole === 'owner' || targetRole === 'super_admin') {
        throw new Error('No puedes editar este usuario');
      }

      const callerRole = normalizeRole(callerProfile.rol);
      const allowedRoles = callerRole === 'owner' ? ['seller', 'admin'] : ['seller'];

      if (requestedRole && !allowedRoles.includes(requestedRole)) {
        throw new Error(callerRole === 'owner'
          ? 'Solo puedes asignar roles vendedor o administrador'
          : 'Solo puedes asignar rol vendedor');
      }
    }

    if (callerIsSelf && requestedRole && requestedRole !== normalizeRole(callerProfile.rol) && !callerIsPlatformAdmin) {
      throw new Error('No puedes cambiar tu propio rol');
    }

    const updateAuthPayload: Record<string, unknown> = {
      email,
      user_metadata: {
        full_name: fullName || email,
        role: requestedRole || normalizeRole(targetProfile.rol),
        negocio_id: targetProfile.negocio_id,
      },
    };

    if (typeof isActive === 'boolean') {
      updateAuthPayload.ban_duration = isActive ? 'none' : '876000h';
    }

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, updateAuthPayload);
    if (authUpdateError) throw authUpdateError;

    const updateProfilePayload: Record<string, unknown> = {
      email,
      full_name: fullName || email,
    };

    if (requestedRole && !callerIsSelf) updateProfilePayload.rol = requestedRole;
    if (typeof isActive === 'boolean') updateProfilePayload.is_active = isActive;

    const { error: profileUpdateError } = await admin
      .from('usuarios')
      .update(updateProfilePayload)
      .eq('id', userId);

    if (profileUpdateError) throw profileUpdateError;

    const changes: string[] = [];
    const previousRole = normalizeRole(targetProfile.rol);
    const nextRole = requestedRole || previousRole;

    if (email !== cleanText(targetProfile.email).toLowerCase()) changes.push('correo');
    if (fullName && fullName !== getProfileName(targetProfile, '')) changes.push('nombre');
    if (nextRole !== previousRole) changes.push(`rol a ${formatRoleLabel(nextRole)}`);
    if (typeof isActive === 'boolean' && isActive !== Boolean(targetProfile.is_active ?? true)) {
      changes.push(isActive ? 'activado' : 'desactivado');
    }

    await createBusinessNotification(admin, {
      negocio_id: targetProfile.negocio_id,
      user_id: null,
      audience: 'admin',
      title: 'Usuario actualizado',
      message: `${getProfileName(callerProfile)} actualizó a ${fullName || getProfileName(targetProfile)}${changes.length ? `: ${changes.join(', ')}` : '.'}`,
      type: 'info',
      category: 'users',
      link: 'users',
      read: false,
    });

    return jsonResponse(corsHeaders, { success: true, user_id: userId });
  } catch (error) {
    return jsonResponse(corsHeaders, { error: getErrorMessage(error) }, 400);
  }
});
