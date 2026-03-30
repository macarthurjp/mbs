/*
  # Fix create_user_account function
  
  1. Changes
    - Update search_path to include extensions schema where pgcrypto is installed
    - This ensures password hashing works correctly when creating new users
  
  2. Security
    - Maintains SECURITY DEFINER for admin-only access
    - Keeps all existing security checks
*/

CREATE OR REPLACE FUNCTION public.create_user_account(
  p_username text, 
  p_full_name text, 
  p_password text, 
  p_role text DEFAULT 'seller', 
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
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
