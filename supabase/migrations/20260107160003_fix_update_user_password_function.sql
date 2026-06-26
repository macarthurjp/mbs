/*
  # Fix update_user_password function
  
  1. Changes
    - Update search_path to include extensions schema where pgcrypto is installed
    - This fixes the issue where changing passwords would cause the app to freeze
  
  2. Security
    - Maintains SECURITY DEFINER for admin-only access
    - Keeps all existing security checks
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.update_user_password(p_user_id uuid, p_new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
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
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;
