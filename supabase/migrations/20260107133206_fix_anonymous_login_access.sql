/*
  # Fix Anonymous Login Access

  1. Changes
    - Recreate the get_email_from_username function with proper permissions
    - The function needs to bypass RLS to allow anonymous users to login
    
  2. Security
    - Function is SECURITY DEFINER so it runs with elevated privileges
    - Only returns email address, no sensitive data
    - Checks that user is active before returning email
*/

-- Drop and recreate the function with proper security context
DROP FUNCTION IF EXISTS get_email_from_username(text);

CREATE OR REPLACE FUNCTION get_email_from_username(p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
BEGIN
  -- Get user id from username (bypasses RLS because function is SECURITY DEFINER)
  SELECT id INTO v_user_id
  FROM public.user_profiles
  WHERE username = p_username AND is_active = true;
  
  -- If username not found, return null
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get email from auth.users
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_user_id;
  
  RETURN v_email;
END;
$$;

-- Grant execute permissions to both authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_email_from_username(text) TO anon;
GRANT EXECUTE ON FUNCTION get_email_from_username(text) TO authenticated;

-- Add a comment explaining the function
COMMENT ON FUNCTION get_email_from_username(text) IS 'Converts a username to email for authentication. Bypasses RLS for login purposes.';
