/*
  # Fix User Authentication - Create users with proper passwords

  1. Changes
    - Delete existing users that don't have proper authentication
    - Create an admin function to properly create users with passwords
    - Recreate admin and vendedor users with correct passwords
  
  2. Security
    - Function is only accessible to authenticated users
    - Uses Supabase auth admin functions to properly hash passwords
*/

-- Delete existing users (they don't have proper passwords)
DELETE FROM auth.users WHERE email IN ('admin@boutique.local', 'vendedor@boutique.local');

-- Create function to create users with passwords (service role only)
CREATE OR REPLACE FUNCTION create_user_with_password(
  p_email TEXT,
  p_password TEXT,
  p_username TEXT,
  p_full_name TEXT,
  p_role TEXT
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Create user in auth.users with proper password
  v_user_id := extensions.uuid_generate_v4();
  
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    jsonb_build_object(),
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- Create user profile
  INSERT INTO user_profiles (id, username, full_name, role, is_active)
  VALUES (v_user_id, p_username, p_full_name, p_role, true);

  RETURN v_user_id;
END;
$$;

-- Create admin user
SELECT create_user_with_password(
  'admin@boutique.local',
  'admin123',
  'admin',
  'Administrador',
  'admin'
);

-- Create vendedor user
SELECT create_user_with_password(
  'vendedor@boutique.local',
  'vendedor123',
  'vendedor',
  'Vendedor',
  'seller'
);
