/*
  # Fix User Profiles RLS Recursion

  1. Problem
    - Policies on user_profiles table cause infinite recursion
    - They try to read from user_profiles to check if user is admin
    - This creates a circular dependency

  2. Solution
    - Create helper function with SECURITY DEFINER to get user role
    - This function bypasses RLS checks
    - Update all policies to use this function instead of subqueries

  3. Changes
    - Drop existing admin policies that cause recursion
    - Create get_user_role() helper function
    - Recreate policies using the helper function

  4. Security Notes
    - SECURITY DEFINER function is safe because it only reads user's own role
    - No privilege escalation possible
    - All policies still enforce proper access control
*/

-- Drop problematic policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

-- Create helper function to get current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'seller');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;

-- Recreate admin policies using the helper function
CREATE POLICY "Admins can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can insert profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can delete profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');