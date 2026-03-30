/*
  # Fix User Authentication v2

  1. Changes
    - Delete and recreate users with proper authentication setup
    - Ensure email_confirmed_at is set correctly
    - Use proper password hashing

  2. Security
    - Users are email confirmed and ready to login
    - Proper role assignment
*/

-- Delete existing users
DELETE FROM user_profiles WHERE username IN ('admin', 'vendedor');
DELETE FROM auth.users WHERE email IN ('admin@boutique.local', 'vendedor@boutique.local');

-- Create admin user with proper auth setup
DO $$
DECLARE
  admin_id uuid := gen_random_uuid();
  seller_id uuid := gen_random_uuid();
BEGIN
  -- Insert admin into auth.users
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
    aud,
    role
  ) VALUES (
    admin_id,
    '00000000-0000-0000-0000-000000000000',
    'admin@boutique.local',
    crypt('admin123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    'authenticated',
    'authenticated'
  );

  -- Insert admin profile
  INSERT INTO user_profiles (id, username, full_name, role, is_active)
  VALUES (admin_id, 'admin', 'Administrador', 'admin', true);

  -- Insert seller into auth.users
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
    aud,
    role
  ) VALUES (
    seller_id,
    '00000000-0000-0000-0000-000000000000',
    'vendedor@boutique.local',
    crypt('vendedor123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    'authenticated',
    'authenticated'
  );

  -- Insert seller profile
  INSERT INTO user_profiles (id, username, full_name, role, is_active)
  VALUES (seller_id, 'vendedor', 'Vendedor', 'seller', true);
END $$;
