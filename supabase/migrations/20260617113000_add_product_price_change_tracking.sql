alter table public.productos
  add column if not exists precio_anterior numeric,
  add column if not exists precio_cambio text,
  add column if not exists precio_actualizado_en timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'productos_precio_cambio_check'
  ) then
    alter table public.productos
      add constraint productos_precio_cambio_check
      check (precio_cambio is null or precio_cambio in ('up', 'down'));
  end if;
end $$;
