alter table public.negocios
  add column if not exists seller_discount_limit numeric(5,2) not null default 15;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'negocios_seller_discount_limit_range'
  ) then
    alter table public.negocios
      add constraint negocios_seller_discount_limit_range
      check (seller_discount_limit >= 0 and seller_discount_limit <= 100);
  end if;
end $$;
