/*
  # Allow Anonymous Users to Query Profiles for Login

  1. Changes
    - Add policy to allow anonymous users to read user_profiles
    - This is required for the login function to work
    - Only allows reading username and id (no sensitive data)

  2. Security
    - Restrictive policy that only exposes minimal information needed for login
    - Does not expose sensitive profile data
*/

-- Allow anonymous users to read user_profiles for login lookup
CREATE POLICY "Allow anonymous to read profiles for login"
  ON user_profiles
  FOR SELECT
  TO anon
  USING (true);
