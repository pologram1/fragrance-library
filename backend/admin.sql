-- Admin privileges live in the database, never in editable user metadata.
begin;
create table public.library_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','admin')),
 created_at timestamptz not null default now()
);
create table public.library_account_controls (
 user_id uuid primary key references auth.users(id) on delete cascade,
 suspended boolean not null default false,
 updated_at timestamptz not null default now()
);
create table public.library_catalog (
 id text primary key check(length(id) between 1 and 120),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<100000),
 status text not null check(status in ('draft','published','archived')),
 version integer not null default 1,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
create table public.library_activity (
 id bigint generated always as identity primary key,
 actor uuid references auth.users(id),
 action text not null,
 target text not null,
 created_at timestamptz not null default now()
);
alter table public.library_admins enable row level security;
alter table public.library_account_controls enable row level security;
alter table public.library_catalog enable row level security;
alter table public.library_activity enable row level security;
revoke all on public.library_admins,public.library_account_controls,public.library_catalog,public.library_activity from public,anon,authenticated;

create function public.library_account_active() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not exists(select 1 from public.library_account_controls where user_id=auth.uid() and suspended);
$$;
revoke all on function public.library_account_active() from public,anon;
grant execute on function public.library_account_active() to authenticated;
drop policy "Read own collection" on public.user_collections;
create policy "Read own collection" on public.user_collections for select to authenticated
 using ((select auth.uid())=user_id and (select public.library_account_active()));

-- Gate collection writes too, including already-issued sessions.
create or replace function public.save_my_collection(p_owner uuid,p_items jsonb,p_expected_version integer)
returns integer language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); next_version integer;
begin
 if uid is null or p_owner is null or uid<>p_owner or not public.library_account_active() then
  raise exception 'Not authorized' using errcode='42501';
 end if;
 if p_expected_version is null or p_expected_version<0 or p_items is null or jsonb_typeof(p_items)<>'array' then
  raise exception 'Invalid collection' using errcode='22023';
 end if;
 if jsonb_array_length(p_items)>1000 or octet_length(p_items::text)>5000000 then
  raise exception 'Collection too large' using errcode='22023';
 end if;
 if p_expected_version=0 then
  insert into public.user_collections(user_id,items,version) values(uid,p_items,1)
  on conflict(user_id) do nothing returning version into next_version;
 else
  update public.user_collections set items=p_items,version=version+1,updated_at=now()
  where user_id=uid and version=p_expected_version returning version into next_version;
 end if;
 if next_version is null then raise exception 'COLLECTION_CONFLICT' using errcode='40001'; end if;
 return next_version;
end; $$;

-- Public endpoint returns only published records and archive tombstones, never drafts.
create function public.library_catalog_updates(p_offset integer default 0)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
  select id,status,case when status='published' then payload else null end payload
  from public.library_catalog where status in ('published','archived') order by id
  limit 200 offset greatest(0,least(p_offset,100000))
 ) x;
$$;
revoke all on function public.library_catalog_updates(integer) from public;
grant execute on function public.library_catalog_updates(integer) to anon,authenticated;

create function public.library_admin(p_action text,p_input jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); actor_role text; target_id uuid; record_id text;
 v integer; doc jsonb; state text; result jsonb; entry jsonb; off integer;
begin
 select role into actor_role from public.library_admins where user_id=uid;
 if actor_role is null or not public.library_account_active() then
  if p_action='context' then return null; end if;
  raise exception 'Administrator access required' using errcode='42501';
 end if;
 if p_action='context' then return jsonb_build_object('role',actor_role,'userId',uid); end if;
 off:=greatest(0,least(coalesce((p_input->>'offset')::integer,0),100000));
 if p_action='overview' then
  return jsonb_build_object('users',(select count(*) from auth.users),
   'collections',(select count(*) from public.user_collections),
   'published',(select count(*) from public.library_catalog where status='published'),
   'drafts',(select count(*) from public.library_catalog where status='draft'));
 elsif p_action='users' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (
   select u.id,coalesce(u.raw_user_meta_data->>'username',split_part(u.email,'@',1)) username,
    u.created_at,u.last_sign_in_at,coalesce(a.role,'member') role,coalesce(c.suspended,false) suspended
   from auth.users u left join public.library_admins a on a.user_id=u.id
   left join public.library_account_controls c on c.user_id=u.id
   where coalesce(u.raw_user_meta_data->>'username',split_part(u.email,'@',1)) ilike '%'||left(coalesce(p_input->>'query',''),100)||'%'
   order by u.created_at,u.id limit 50 offset off
  ) x; return result;
 elsif p_action='user_update' then
  if actor_role<>'owner' then raise exception 'Owner access required' using errcode='42501'; end if;
  target_id:=(p_input->>'id')::uuid;
  if target_id=uid or exists(select 1 from public.library_admins where user_id=target_id and role='owner') then
   raise exception 'Owner and self changes are protected' using errcode='42501';
  end if;
  if not exists(select 1 from auth.users where id=target_id) then raise exception 'User not found'; end if;
  if p_input ? 'suspended' then
   insert into public.library_account_controls(user_id,suspended) values(target_id,(p_input->>'suspended')::boolean)
   on conflict(user_id) do update set suspended=excluded.suspended,updated_at=now();
  end if;
  if p_input ? 'role' then
   if p_input->>'role'='admin' then
    insert into public.library_admins(user_id,role) values(target_id,'admin') on conflict(user_id) do update set role='admin';
   elsif p_input->>'role'='member' then delete from public.library_admins where user_id=target_id and role='admin';
   else raise exception 'Invalid role'; end if;
  end if;
  insert into public.library_activity(actor,action,target) values(uid,'user_update',target_id::text);
  return jsonb_build_object('ok',true);
 elsif p_action='catalog' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (
   select id,payload,status,version,updated_at from public.library_catalog order by id limit 200 offset off
  ) x; return result;
 elsif p_action='save_fragrance' then
  record_id:=p_input->>'id'; doc:=p_input->'payload'; state:=p_input->>'status';
  v:=(p_input->>'version')::integer;
  if record_id is null or record_id!~'^[a-zA-Z0-9_-]{1,120}$' or v is null or v<0 or doc is null or jsonb_typeof(doc)<>'object'
   or coalesce(length(trim(doc->>'brand')),0) not between 1 and 120
   or coalesce(length(trim(doc->>'name')),0) not between 1 and 200
   or coalesce(doc->>'concentration','') not in ('Eau de Parfum','Eau de Toilette','Parfum','Extrait de Parfum','Eau de Cologne','Other')
   or coalesce((doc->>'sizeMl')::numeric,0) not between 1 and 2000
   or coalesce(doc->>'type','') not in ('standard','tester')
   or state is null or state not in ('draft','published','archived') then raise exception 'Invalid fragrance' using errcode='22023'; end if;
  if doc ? 'offers' then
   if jsonb_typeof(doc->'offers')<>'array' or jsonb_array_length(doc->'offers')>30 then raise exception 'Invalid offers'; end if;
   for entry in select value from jsonb_array_elements(doc->'offers') loop
    if coalesce(entry->>'url','')!~'^https://' or coalesce(entry->>'currency','')<>'USD'
     or coalesce((entry->>'price')::numeric,0)<=0 or coalesce(entry->>'seller','')=''
     or coalesce(entry->>'kind','') not in ('retail','discount')
     or (entry->>'checked')::date>current_date then raise exception 'Invalid seller offer'; end if;
   end loop;
  end if;
  doc:=jsonb_set(doc,'{id}',to_jsonb(record_id));
  if v=0 then
   insert into public.library_catalog(id,payload,status,updated_by) values(record_id,doc,state,uid)
   on conflict(id) do nothing returning version into v;
  else
   update public.library_catalog set payload=doc,status=state,version=version+1,updated_at=now(),updated_by=uid
   where id=record_id and version=v returning version into v;
  end if;
  if not found then raise exception 'CATALOG_CONFLICT' using errcode='40001'; end if;
  insert into public.library_activity(actor,action,target) values(uid,'fragrance_'||state,record_id);
  return jsonb_build_object('version',v);
 elsif p_action='activity' then
  select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result from (
   select a.id,a.action,a.target,a.created_at,coalesce(u.raw_user_meta_data->>'username',split_part(u.email,'@',1)) actor
   from public.library_activity a left join auth.users u on u.id=a.actor order by a.id desc limit 50 offset off
  ) x; return result;
 end if;
 raise exception 'Unknown administrator action' using errcode='22023';
end; $$;
revoke all on function public.library_admin(text,jsonb) from public,anon;
grant execute on function public.library_admin(text,jsonb) to authenticated;

-- Identity confirmed by Miguel in this conversation. No password changes.
insert into public.library_admins(user_id,role)
select id,'owner' from auth.users where id='088a8c1a-e3da-49e3-878b-4a2c877ea8e4'
 and coalesce(raw_user_meta_data->>'username',split_part(email,'@',1))='pologram';
commit;
