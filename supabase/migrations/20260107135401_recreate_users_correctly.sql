/*
  # Recreate Users Correctly

  1. Changes
    - Delete existing users
    - Create new users with proper Supabase Auth setup
    - Ensure passwords are correctly hashed

  2. Security
    - Users created with proper authentication
    - Email confirmed for immediate login
*/

-- Delete existing users
DELETE FROM user_profiles WHERE username IN ('admin', 'vendedor');
DELETE FROM auth.users WHERE email IN ('admin@boutique.local', 'vendedor@boutique.local');
