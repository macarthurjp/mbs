-- Preserve the customer-facing receipt exactly as it was issued so it can be
-- reprinted later even if products, business settings, or customer data change.
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS cliente_nombre text,
  ADD COLUMN IF NOT EXISTS recibo_datos jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.ventas.cliente_nombre IS
  'Customer display name captured when the sale was created, including walk-in customers.';

COMMENT ON COLUMN public.ventas.recibo_datos IS
  'Immutable customer-facing receipt snapshot used for exact historical reprints.';

-- Recover registered customer names for existing sales.
UPDATE public.ventas AS venta
SET cliente_nombre = cliente.nombre
FROM public.clientes AS cliente
WHERE venta.cliente_id = cliente.id
  AND venta.negocio_id = cliente.negocio_id
  AND NULLIF(BTRIM(venta.cliente_nombre), '') IS NULL;

-- Best-effort recovery for older sales: CREATE_SALE audit entries already hold
-- the informal customer name, payment values, and the original product names.
DO $migration$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    EXECUTE $sql$
      UPDATE public.ventas AS venta
      SET
        cliente_nombre = COALESCE(
          NULLIF(BTRIM(venta.cliente_nombre), ''),
          NULLIF(BTRIM((
            SELECT audit.new_data ->> 'cliente_nombre'
            FROM public.audit_logs AS audit
            WHERE audit.negocio_id = venta.negocio_id
              AND audit.record_id = venta.id::text
              AND audit.action = 'CREATE_SALE'
            LIMIT 1
          )), '')
        ),
        recibo_datos = COALESCE((
          SELECT audit.new_data
          FROM public.audit_logs AS audit
          WHERE audit.negocio_id = venta.negocio_id
            AND audit.record_id = venta.id::text
            AND audit.action = 'CREATE_SALE'
          LIMIT 1
        ), '{}'::jsonb) || jsonb_build_object('version', 1)
      WHERE venta.recibo_datos = '{}'::jsonb
    $sql$;
  END IF;
END
$migration$;
