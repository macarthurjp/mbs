/*
  # Fix Username Login Function v3

  1. Changes
    - Recreate the get_email_from_username function with proper permissions
    - Ensure it can access both user_profiles and auth.users
    - Add better error handling

  2. Security
    - SECURITY DEFINER to bypass RLS
    - Returns only email, no sensitive data
    - Accessible to anon users for login
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_email_from_username(text);

-- Recreate function with proper setup
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
  -- Get user id from username (SECURITY DEFINER bypasses RLS)
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

-- Revoke all existing permissions
REVOKE ALL ON FUNCTION get_email_from_username(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_email_from_username(text) FROM anon;
REVOKE ALL ON FUNCTION get_email_from_username(text) FROM authenticated;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION get_email_from_username(text) TO anon;
GRANT EXECUTE ON FUNCTION get_email_from_username(text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_email_from_username(text) IS 'Converts username to email for authentication';
