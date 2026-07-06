/*
  Make productos.costo / productos.proveedor (and their compras equivalents)
  readable and writable ONLY by the business owner, enforced at the database
  level rather than just hidden in the UI.

  Every authenticated app user (owner/admin/seller/superadmin) shares the same
  Postgres role, `authenticated` — role distinction lives in usuarios.rol, not
  in Postgres roles — so a real restriction can't be a static column GRANT: it
  has to be logic that checks is_business_owner() on every access, combined
  with revoking raw column privileges so nothing can go around that logic.

  compras.costo was NOT NULL with no default; dropped to allow Admin-created
  purchases (quantity only, no cost) to leave it unset until the owner fills
  it in via set_purchase_cost().
*/

ALTER TABLE public.compras ALTER COLUMN costo DROP NOT NULL;

REVOKE SELECT (costo, proveedor), INSERT (costo, proveedor), UPDATE (costo, proveedor)
  ON public.productos FROM authenticated, anon;

REVOKE SELECT (costo, proveedor), INSERT (costo, proveedor), UPDATE (costo, proveedor)
  ON public.compras FROM authenticated, anon;

-- Masked read of the product catalog: costo/proveedor are NULL unless the
-- caller is the business owner.
CREATE OR REPLACE FUNCTION public.get_productos_for_business(p_negocio_id uuid)
RETURNS TABLE (
  id bigint,
  negocio_id uuid,
  nombre text,
  unidad text,
  precio numeric,
  costo numeric,
  stock numeric,
  minimo numeric,
  created_at timestamp without time zone,
  proveedor text,
  precio_anterior numeric,
  precio_cambio text,
  precio_actualizado_en timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.negocio_id, p.nombre, p.unidad, p.precio,
    CASE WHEN public.is_business_owner() THEN p.costo ELSE NULL END,
    p.stock, p.minimo, p.created_at,
    CASE WHEN public.is_business_owner() THEN p.proveedor ELSE NULL END,
    p.precio_anterior, p.precio_cambio, p.precio_actualizado_en
  FROM public.productos p
  WHERE p.negocio_id = p_negocio_id
    AND (public.is_platform_admin() OR p.negocio_id = public.current_user_negocio_id());
$$;

GRANT EXECUTE ON FUNCTION public.get_productos_for_business(uuid) TO authenticated;

-- Owner-only setter for a product's cost/supplier; silently no-ops for
-- everyone else (defense in depth alongside the column REVOKE above).
CREATE OR REPLACE FUNCTION public.upsert_producto_costo(
  p_producto_id bigint,
  p_costo numeric,
  p_proveedor text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_business_owner() THEN
    RETURN;
  END IF;

  UPDATE public.productos
  SET costo = p_costo,
      proveedor = p_proveedor
  WHERE id = p_producto_id
    AND negocio_id = public.current_user_negocio_id();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_producto_costo(bigint, numeric, text) TO authenticated;

-- Registers a purchase in one atomic call: always increments productos.stock;
-- only writes costo/proveedor (on both compras and productos) when the
-- caller is the owner, otherwise leaves them NULL/unchanged regardless of
-- what was passed in — so Admin registers quantity, Owner completes cost
-- later via set_purchase_cost().
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

  UPDATE public.productos
  SET stock = COALESCE(stock, 0) + p_cantidad,
      costo = CASE WHEN v_effective_costo IS NOT NULL THEN v_effective_costo ELSE costo END,
      proveedor = CASE WHEN v_effective_costo IS NOT NULL THEN v_effective_proveedor ELSE proveedor END
  WHERE id = p_producto_id
    AND negocio_id = v_negocio_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no encontrado para este negocio';
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

GRANT EXECUTE ON FUNCTION public.create_purchase(bigint, numeric, numeric, text, date) TO authenticated;

-- Owner backfills cost/supplier on a purchase Admin registered without it,
-- and syncs productos.costo to match (same last-purchase-cost-wins
-- semantics the app already had before this migration).
CREATE OR REPLACE FUNCTION public.set_purchase_cost(
  p_compra_id bigint,
  p_costo numeric,
  p_proveedor text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_negocio_id uuid := public.current_user_negocio_id();
  v_producto_id bigint;
  v_cantidad numeric;
BEGIN
  IF NOT public.is_business_owner() THEN
    RAISE EXCEPTION 'Solo el dueño puede completar el costo de una compra';
  END IF;

  UPDATE public.compras
  SET costo = p_costo,
      proveedor = p_proveedor,
      total = cantidad * p_costo
  WHERE id = p_compra_id
    AND negocio_id = v_negocio_id
  RETURNING producto_id, cantidad INTO v_producto_id, v_cantidad;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compra no encontrada para este negocio';
  END IF;

  IF v_producto_id IS NOT NULL THEN
    UPDATE public.productos
    SET costo = p_costo,
        proveedor = p_proveedor
    WHERE id = v_producto_id
      AND negocio_id = v_negocio_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_purchase_cost(bigint, numeric, text) TO authenticated;

-- Masked read of the purchase ledger: costo/proveedor/total (total leaks
-- costo via cantidad*costo, so it's masked too) are NULL unless owner.
CREATE OR REPLACE FUNCTION public.get_compras_for_business(p_negocio_id uuid)
RETURNS TABLE (
  id bigint,
  negocio_id uuid,
  proveedor text,
  producto_id bigint,
  fecha date,
  cantidad numeric,
  costo numeric,
  total numeric,
  created_at timestamp without time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id, c.negocio_id,
    CASE WHEN public.is_business_owner() THEN c.proveedor ELSE NULL END,
    c.producto_id, c.fecha, c.cantidad,
    CASE WHEN public.is_business_owner() THEN c.costo ELSE NULL END,
    CASE WHEN public.is_business_owner() THEN c.total ELSE NULL END,
    c.created_at
  FROM public.compras c
  WHERE c.negocio_id = p_negocio_id
    AND (public.is_platform_admin() OR c.negocio_id = public.current_user_negocio_id());
$$;

GRANT EXECUTE ON FUNCTION public.get_compras_for_business(uuid) TO authenticated;
