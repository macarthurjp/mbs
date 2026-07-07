/*
  Neutralize the legacy demo accounts for fresh deployments.

  supabase/migrations/20260107131633_create_default_users.sql and its
  follow-up fixes (20260107133437, 20260107133821, 20260107134844,
  20260107144651) create admin@boutique.local / vendedor@boutique.local
  with publicly-documented passwords (admin123 / vendedor123). Those old
  migration files are left untouched (already-applied history on the
  production database), but anyone bootstrapping a brand-new project from
  this repo (`supabase db reset` / `db push` on a fresh instance) would
  replay them and recreate the same publicly-known accounts.

  This migration runs after all of them in sequence and removes those
  accounts if present, so a fresh deployment never ends up with a live,
  publicly-documented login. Safe to run repeatedly / when the accounts
  don't exist (already deleted from production on 2026-07-07).
*/

DELETE FROM auth.users
WHERE email IN ('admin@boutique.local', 'vendedor@boutique.local', 'cajero@boutique.local');
