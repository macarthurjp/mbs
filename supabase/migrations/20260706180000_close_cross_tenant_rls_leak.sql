/*
  Close a cross-tenant RLS leak on productos, compras, clientes, pagos,
  venta_items and ventas.

  These tables each carried a leftover "admin_full_access_*" (and in a few
  cases "vendedor_*"/"consulta_*"/"inventario_*") PERMISSIVE policy from an
  earlier, pre-multi-tenant permission model. Postgres OR's all matching
  PERMISSIVE policies together, so these old policies kept granting access
  to ANY row regardless of negocio_id even after 20260617114000 added
  properly tenant-scoped policies on top — an admin or seller account in one
  business could read/write another business's products, purchases,
  clients, payments and sales.

  Confirmed via `usuarios.rol` distribution that no user has the legacy
  'consulta'/'inventario' roles, and that every access pattern these
  policies covered already has a tenant-scoped equivalent (the
  "<table> tenant <cmd>", "<table>_select_by_business/negocio",
  "<table>_all_by_negocio" etc. policies), so dropping them removes excess
  access only — nothing legitimate relies on them.

  superadmin_can_update_all_support_tickets /
  superadmin_can_view_all_support_tickets on support_tickets are NOT
  touched: platform-wide visibility there is intentional (superadmin is a
  cross-tenant support role), not a leak.
*/

DROP POLICY IF EXISTS "admin_full_access" ON public.productos;
DROP POLICY IF EXISTS "consulta_select_productos" ON public.productos;
DROP POLICY IF EXISTS "inventario_select_productos" ON public.productos;
DROP POLICY IF EXISTS "inventario_update_stock" ON public.productos;
DROP POLICY IF EXISTS "vendedor puede ver productos" ON public.productos;

DROP POLICY IF EXISTS "admin_full_access_compras" ON public.compras;
DROP POLICY IF EXISTS "consulta_select_compras" ON public.compras;
DROP POLICY IF EXISTS "inventario_select_compras" ON public.compras;
DROP POLICY IF EXISTS "inventario_insert_compras" ON public.compras;

DROP POLICY IF EXISTS "admin_full_access_clientes" ON public.clientes;
DROP POLICY IF EXISTS "consulta_select_clientes" ON public.clientes;

DROP POLICY IF EXISTS "admin_full_access_pagos" ON public.pagos;
DROP POLICY IF EXISTS "consulta_select_pagos" ON public.pagos;
DROP POLICY IF EXISTS "vendedor_insert_pagos" ON public.pagos;
DROP POLICY IF EXISTS "vendedor_select_pagos" ON public.pagos;

DROP POLICY IF EXISTS "admin_full_access_items" ON public.venta_items;
DROP POLICY IF EXISTS "consulta_select_items" ON public.venta_items;
DROP POLICY IF EXISTS "vendedor_insert_items" ON public.venta_items;

DROP POLICY IF EXISTS "admin_full_access_ventas" ON public.ventas;
DROP POLICY IF EXISTS "consulta_select_ventas" ON public.ventas;
