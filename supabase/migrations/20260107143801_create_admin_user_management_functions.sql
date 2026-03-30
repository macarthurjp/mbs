/*
  # Funciones de Gestión de Usuarios para Administradores

  1. Nuevas Funciones
    - `create_user_account` - Permite a admins crear nuevos usuarios
      - Parámetros: p_username, p_full_name, p_password, p_role
      - Retorna: user_id del usuario creado
      - Valida que el usuario que ejecuta sea admin
      - Crea el usuario en auth.users y user_profiles
    
    - `update_user_status` - Permite a admins cambiar el estado de un usuario
      - Parámetros: p_user_id, p_is_active
      - Valida permisos de admin
    
    - `update_user_role` - Permite a admins cambiar el rol de un usuario
      - Parámetros: p_user_id, p_role
      - Valida permisos de admin

  2. Seguridad
    - Las funciones verifican que el usuario ejecutante sea admin
    - Uso de SECURITY DEFINER para acceder a auth.users
    - Validación de parámetros

  3. Notas
    - Estas funciones permiten la gestión completa de usuarios desde el frontend
    - Solo usuarios con rol 'admin' pueden ejecutarlas
*/

-- Función para crear un nuevo usuario (solo admins)
CREATE OR REPLACE FUNCTION create_user_account(
  p_username text,
  p_full_name text,
  p_password text,
  p_role text DEFAULT 'seller',
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_requesting_user_role text;
BEGIN
  -- Verificar que el usuario que ejecuta sea admin
  SELECT role INTO v_requesting_user_role
  FROM user_profiles
  WHERE id = auth.uid();

  IF v_requesting_user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo los administradores pueden crear usuarios';
  END IF;

  -- Validar rol
  IF p_role NOT IN ('admin', 'seller') THEN
    RAISE EXCEPTION 'Rol inválido. Debe ser admin o seller';
  END IF;

  -- Generar email interno
  v_email := p_username || '@kieroquemelires.local';

  -- Crear usuario en auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token,
    recovery_token
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    v_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('username', p_username, 'full_name', p_full_name),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    ''
  ) RETURNING id INTO v_user_id;

  -- Crear perfil de usuario
  INSERT INTO user_profiles (id, username, full_name, role, is_active)
  VALUES (v_user_id, p_username, p_full_name, p_role, p_is_active);

  RETURN v_user_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'El nombre de usuario ya existe';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al crear usuario: %', SQLERRM;
END;
$$;

-- Función para actualizar el estado de un usuario (solo admins)
CREATE OR REPLACE FUNCTION update_user_status(
  p_user_id uuid,
  p_is_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requesting_user_role text;
BEGIN
  -- Verificar que el usuario que ejecuta sea admin
  SELECT role INTO v_requesting_user_role
  FROM user_profiles
  WHERE id = auth.uid();

  IF v_requesting_user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar el estado de usuarios';
  END IF;

  -- Actualizar estado
  UPDATE user_profiles
  SET is_active = p_is_active, updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- Función para actualizar el rol de un usuario (solo admins)
CREATE OR REPLACE FUNCTION update_user_role(
  p_user_id uuid,
  p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requesting_user_role text;
BEGIN
  -- Verificar que el usuario que ejecuta sea admin
  SELECT role INTO v_requesting_user_role
  FROM user_profiles
  WHERE id = auth.uid();

  IF v_requesting_user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar roles de usuarios';
  END IF;

  -- Validar rol
  IF p_role NOT IN ('admin', 'seller') THEN
    RAISE EXCEPTION 'Rol inválido. Debe ser admin o seller';
  END IF;

  -- Actualizar rol
  UPDATE user_profiles
  SET role = p_role, updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- Función para cambiar contraseña de un usuario (solo admins)
CREATE OR REPLACE FUNCTION update_user_password(
  p_user_id uuid,
  p_new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requesting_user_role text;
BEGIN
  -- Verificar que el usuario que ejecuta sea admin
  SELECT role INTO v_requesting_user_role
  FROM user_profiles
  WHERE id = auth.uid();

  IF v_requesting_user_role != 'admin' THEN
    RAISE EXCEPTION 'Solo los administradores pueden cambiar contraseñas';
  END IF;

  -- Actualizar contraseña
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;
