alter table public.negocios
  add column if not exists email_alias text,
  add column if not exists email_from_name text,
  add column if not exists email_reply_to text;

update public.negocios
set email_alias = lower(
  trim(both '-' from regexp_replace(coalesce(nombre, 'business') || '-' || left(id::text, 6), '[^a-zA-Z0-9]+', '-', 'g'))
)
where email_alias is null or btrim(email_alias) = '';

update public.negocios
set email_from_name = nombre
where email_from_name is null or btrim(email_from_name) = '';

update public.negocios
set email_reply_to = email
where (email_reply_to is null or btrim(email_reply_to) = '')
  and email is not null
  and btrim(email) <> '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'negocios_email_alias_format'
  ) then
    alter table public.negocios
      add constraint negocios_email_alias_format
      check (
        email_alias is null
        or email_alias ~ '^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$'
      );
  end if;
end $$;

create unique index if not exists idx_negocios_email_alias_lower
  on public.negocios (lower(email_alias))
  where email_alias is not null;
