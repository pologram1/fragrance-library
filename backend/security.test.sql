-- Run in Supabase SQL Editor after schema.sql. All test data rolls back.
begin;
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select public.save_my_collection('00000000-0000-4000-8000-000000000001','[]',0);
do $$
begin
  if (select count(*) from public.user_collections) <> 1 then raise exception 'Owner read failed'; end if;
  begin
    perform public.save_my_collection('00000000-0000-4000-8000-000000000002','[]',0);
    raise exception 'Cross-owner write unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_my_collection('00000000-0000-4000-8000-000000000001','[]',0);
    raise exception 'Stale version unexpectedly allowed';
  exception when serialization_failure then null; end;
  begin
    update public.user_collections set items='[]';
    raise exception 'Direct update unexpectedly allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$
begin
  if (select count(*) from public.user_collections) <> 0 then raise exception 'Other user collection leaked'; end if;
end $$;
select public.save_my_collection('00000000-0000-4000-8000-000000000002','[]',0);
do $$
begin
  if (select count(*) from public.user_collections) <> 1 then raise exception 'Second owner isolation failed'; end if;
end $$;
reset role;
rollback;
