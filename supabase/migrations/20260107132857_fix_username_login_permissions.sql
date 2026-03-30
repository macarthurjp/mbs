/*
  # Fix Username Login Function Permissions

  1. Changes
    - Grant necessary permissions to the authenticated role for the login function
    - Ensure the function can access auth.users and user_profiles tables
    - Add explicit grants for the function execution

  2. Security
    - Function remains SECURITY DEFINER for safe access to auth schema
    - Only returns minimal information (email) needed for authentication
*/

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION get_email_from_username(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_email_from_username(text) TO anon;

-- Ensure the function owner has proper access
-- The function needs to read from both auth.users and user_profiles
GRANT SELECT ON auth.users TO postgres;
GRANT SELECT ON user_profiles TO postgres;
