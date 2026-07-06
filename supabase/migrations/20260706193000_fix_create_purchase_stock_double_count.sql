/*
  Fix create_purchase() double-counting productos.stock.

  Discovered while verifying the owner-only cost/supplier migration
  (20260706190000): there is a pre-existing trigger `trg_stock_compra`
  (AFTER INSERT ON compras -> actualizar_stock_compra()) that already
  increments productos.stock by NEW.cantidad on every purchase insert.
  This trigger is NOT tracked in any migration file (compras itself has no
  tracked migration), but is live in the database.

  create_purchase() also explicitly incremented productos.stock before
  inserting into compras, so every purchase went through BOTH the explicit
  UPDATE and the trigger — doubling the stock increase. This bug predates
  this session: the original PurchasesPage.tsx code (before being routed
  through create_purchase) did the same explicit stock update + compras
  insert, so it was already double-counting stock on every purchase ever
  registered through the app. Historical productos.stock values are
  therefore likely inflated and may need a manual reconciliation against a
  physical inventory count — this migration does not attempt to correct
  historical data, only stops the bug going forward.

  Fix: remove the explicit stock increment from create_purchase(); the
  existing trigger remains the single source of truth for stock changes
  from purchases. costo/proveedor (owner-only) are still written explicitly
  here since the legacy trigger only ever touched stock.
*/

CREATE OR REPLACE FUNCTION public.create_purchase(
  p_producto_id bigint,
  p_cantidad numeric,
  p_costo numeric DEFAULT NULL,
  p_proveedor text DEFAULT NULL,
  p_fecha date DEFAULT CURRENT_DATE
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_negocio_id uuid := public.current_user_negocio_id();
  v_effective_costo numeric := CASE WHEN public.is_business_owner() THEN p_costo ELSE NULL END;
  v_effective_proveedor text := CASE WHEN public.is_business_owner() THEN p_proveedor ELSE NULL END;
  v_compra_id bigint;
BEGIN
  IF NOT public.can_manage_current_business() THEN
    RAISE EXCEPTION 'No tienes permiso para registrar compras';
  END IF;

  IF v_negocio_id IS NULL THEN
    RAISE EXCEPTION 'Usuario sin negocio asignado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.productos WHERE id = p_producto_id AND negocio_id = v_negocio_id) THEN
    RAISE EXCEPTION 'Producto no encontrado para este negocio';
  END IF;

  -- productos.stock is incremented by the existing trg_stock_compra trigger
  -- (fires below on the compras insert) — not here, to avoid double-counting.
  IF v_effective_costo IS NOT NULL THEN
    UPDATE public.productos
    SET costo = v_effective_costo,
        proveedor = v_effective_proveedor
    WHERE id = p_producto_id
      AND negocio_id = v_negocio_id;
  END IF;

  INSERT INTO public.compras (negocio_id, proveedor, producto_id, fecha, cantidad, costo, total)
  VALUES (
    v_negocio_id, v_effective_proveedor, p_producto_id, p_fecha, p_cantidad,
    v_effective_costo,
    p_cantidad * COALESCE(v_effective_costo, 0)
  )
  RETURNING id INTO v_compra_id;

  RETURN v_compra_id;
END;
$$;
