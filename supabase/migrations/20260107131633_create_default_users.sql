/*
  # Create Default Users

  1. Creates two default users in auth.users
    - Admin user: username 'admin', password 'admin123'
    - Seller user: username 'vendedor', password 'vendedor123'

  2. Creates corresponding profiles in user_profiles

  3. Notes
    - Uses raw_user_meta_data to store username
    - Passwords are hashed using pgcrypto extension
    - These are test users for development
*/

-- Insert admin user into auth.users
DO $$
DECLARE
  admin_user_id uuid;
  seller_user_id uuid;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@boutique.local';
  
  IF admin_user_id IS NULL THEN
    -- Create admin user
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
      aud
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'admin@boutique.local',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"username":"admin","full_name":"Administrador"}',
      now(),
      now(),
      'authenticated',
      'authenticated'
    ) RETURNING id INTO admin_user_id;

    -- Create admin profile
    INSERT INTO user_profiles (id, username, full_name, role, is_active)
    VALUES (admin_user_id, 'admin', 'Administrador', 'admin', true);
  END IF;

  -- Check if seller user already exists
  SELECT id INTO seller_user_id FROM auth.users WHERE email = 'vendedor@boutique.local';
  
  IF seller_user_id IS NULL THEN
    -- Create seller user
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
      aud
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'vendedor@boutique.local',
      crypt('vendedor123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"username":"vendedor","full_name":"Vendedor"}',
      now(),
      now(),
      'authenticated',
      'authenticated'
    ) RETURNING id INTO seller_user_id;

    -- Create seller profile
    INSERT INTO user_profiles (id, username, full_name, role, is_active)
    VALUES (seller_user_id, 'vendedor', 'Vendedor', 'seller', true);
  END IF;
END $$;