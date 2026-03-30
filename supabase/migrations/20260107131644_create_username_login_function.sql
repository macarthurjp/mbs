/*
  # Create Username Login Helper Function

  1. New Functions
    - `get_email_from_username(username text)` - Returns email for a given username

  2. Security
    - Function is accessible to anon users (needed for login)
    - Returns only the email, no sensitive data

  3. Notes
    - Used by the frontend to convert username to email for authentication
    - Supabase auth requires email, so we need this conversion step
*/

-- Function to get email from username
CREATE OR REPLACE FUNCTION get_email_from_username(p_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
BEGIN
  -- Get user id from username
  SELECT id INTO v_user_id
  FROM user_profiles
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

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION get_email_from_username(text) TO anon, authenticated;