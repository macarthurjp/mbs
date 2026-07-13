/*
  actualizar_saldo_credito() (untracked, pre-existing AAFTER INSERT ON
  ventas trigger, trg_saldo_credito) unconditionally ran
  `UPDATE ventas SET saldo_pendiente = new.total` with no tipo_pago guard
  — verified live via a direct SQL insert: a Contado (cash) sale inserted
  with saldo_pendiente = 0 came out as saldo_pendiente = total right after
  the trigger fired. Sampled real historical Contado sales (through
  2026-07-11) all show the correct 0.00, so this looks like a recent
  regression rather than long-standing corruption, but it was live and
  actively corrupting new inserts as of this fix.

  The same trigger's `clientes.saldo = saldo + new.total` for Crédito
  sales duplicates what SalesPage.tsx's checkout already does explicitly
  right after the sale insert — same double-count shape as the
  productos.stock bug fixed earlier this session (trg_stock_venta vs. the
  app's own stock update). new.total is exactly the value the app computed
  as totalToPay and already wrote to ventas.total in the same insert, so
  trusting the trigger for both saldo_pendiente and clientes.saldo is
  behaviorally identical to what the app's explicit code did — this fix
  guards both under `tipo_pago = 'Crédito'` (cash sales are now untouched
  by this trigger) and removes SalesPage.tsx's now-redundant explicit
  clientes.saldo update.
*/

CREATE OR REPLACE FUNCTION public.actualizar_saldo_credito()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
  if new.tipo_pago = 'Crédito' then
    update clientes
    set saldo = saldo + new.total
    where id = new.cliente_id;

    update ventas
    set saldo_pendiente = new.total
    where id = new.id;
  end if;

  return new;
end;
$function$;
