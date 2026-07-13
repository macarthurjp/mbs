/*
  Remove obsolete RPCs left behind by the original single-store schema.

  create_user_account is no longer called by the application; user creation
  now goes through the authenticated Edge Function workflow. Its old body
  writes auth.users directly and references pgcrypto without its schema.

  The gift-card reporting RPCs target a schema that never matched the live
  tables (sales/clients, expiration_date, created_by, sale_id, etc.). Their
  only frontend consumer was an unmounted component, so keeping these broken
  public endpoints creates misleading API surface without usable behavior.
*/

DO $migration$
DECLARE
  function_signature text;
BEGIN
  FOR function_signature IN
    SELECT procedure.oid::regprocedure::text
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace
      ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.proname IN (
        'create_user_account',
        'get_gift_cards_summary',
        'get_gift_cards_transactions',
        'get_gift_cards_expiring',
        'get_sales_with_gift_cards',
        'get_gift_card_details'
      )
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', function_signature);
  END LOOP;
END
$migration$;

