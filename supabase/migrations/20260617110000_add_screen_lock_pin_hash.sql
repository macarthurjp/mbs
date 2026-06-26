/*
  Add the optional PIN hash used by the in-app screen lock.
*/

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS screen_lock_pin_hash text;
