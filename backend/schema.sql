-- Install using Supabase SQL Editor or an authorized Management API connection.
-- Public fragrance catalog data remains separate from private user collections.
begin;
create table if not exists public.user_collections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  constraint collection_is_array check (jsonb_typeof(items) = 'array'),
  constraint collection_limit check (jsonb_array_length(items) <= 1000),
  constraint collection_size check (octet_length(items::text) <= 5000000)
);
alter table public.user_collections enable row level security;
revoke all on public.user_collections from anon, authenticated;
grant select on public.user_collections to authenticated;
drop policy if exists "Read own collection" on public.user_collections;
create policy "Read own collection" on public.user_collections
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.save_my_collection(p_owner uuid, p_items jsonb, p_expected_version integer)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  next_version integer;
begin
  if uid is null or p_owner is null or uid <> p_owner then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_expected_version is null or p_expected_version < 0 or p_items is null
     or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Invalid collection' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 1000 or octet_length(p_items::text) > 5000000 then
    raise exception 'Collection too large' using errcode = '22023';
  end if;
  if p_expected_version = 0 then
    insert into public.user_collections(user_id,items,version)
    values(uid,p_items,1) on conflict (user_id) do nothing
    returning version into next_version;
  else
    update public.user_collections set items=p_items,version=version+1,updated_at=now()
    where user_id=uid and version=p_expected_version
    returning version into next_version;
  end if;
  if next_version is null then
    raise exception 'COLLECTION_CONFLICT' using errcode = '40001';
  end if;
  return next_version;
end;
$$;
revoke all on function public.save_my_collection(uuid,jsonb,integer) from public, anon;
grant execute on function public.save_my_collection(uuid,jsonb,integer) to authenticated;
commit;
