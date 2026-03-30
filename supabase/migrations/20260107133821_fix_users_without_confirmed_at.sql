/*
  # Fix Users Without Generated Columns

  1. Changes
    - Delete and recreate users without confirmed_at (generated column)
    - Include all required NOT NULL fields
    - Set email_confirmed_at to confirm the email

  2. Security
    - Complete user records compatible with Supabase Auth
*/

-- Delete existing users
DELETE FROM user_profiles WHERE username IN ('admin', 'vendedor');
DELETE FROM auth.users WHERE email IN ('admin@boutique.local', 'vendedor@boutique.local');

-- Create users with proper fields
DO $$
DECLARE
  admin_user_id uuid;
  seller_user_id uuid;
BEGIN
  -- Create admin user
  admin_user_id := gen_random_uuid();
  
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
    confirmation_token,
    aud,
    role,
    is_sso_user,
    is_anonymous
  ) VALUES (
    admin_user_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@boutique.local',
    crypt('admin123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    'authenticated',
    'authenticated',
    false,
    false
  );

  -- Create admin profile
  INSERT INTO user_profiles (id, username, full_name, role, is_active)
  VALUES (admin_user_id, 'admin', 'Administrador', 'admin', true);

  -- Create seller user
  seller_user_id := gen_random_uuid();
  
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
    confirmation_token,
    aud,
    role,
    is_sso_user,
    is_anonymous
  ) VALUES (
    seller_user_id,
    '00000000-0000-0000-0000-000000000000',
    'vendedor@boutique.local',
    crypt('vendedor123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    'authenticated',
    'authenticated',
    false,
    false
  );

  -- Create seller profile
  INSERT INTO user_profiles (id, username, full_name, role, is_active)
  VALUES (seller_user_id, 'vendedor', 'Vendedor', 'seller', true);
END $$;
