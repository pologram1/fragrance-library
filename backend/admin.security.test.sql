-- Transaction-only fixtures. Never persist test accounts or catalog records.
begin;
insert into auth.users(id,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000091','{"username":"admin_security_owner"}'),
 ('00000000-0000-4000-8000-000000000092','{"username":"admin_security_member","role":"owner"}'),
 ('00000000-0000-4000-8000-000000000093','{"username":"admin_security_editor"}');
insert into public.library_admins(user_id,role) values
 ('00000000-0000-4000-8000-000000000091','owner'),
 ('00000000-0000-4000-8000-000000000093','admin');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
do $$ begin
 if public.library_admin('context') is not null then raise exception 'Metadata escalated privileges'; end if;
 begin perform public.library_admin('users');raise exception 'Member read admin data';exception when insufficient_privilege then null;end;
 begin insert into public.library_admins(user_id,role) values(auth.uid(),'owner');raise exception 'Direct privilege escalation';exception when insufficient_privilege then null;end;
end $$;
select public.save_my_collection('00000000-0000-4000-8000-000000000092','[]',0);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',true);
select public.library_admin('save_fragrance','{"id":"admin-security-fixture","version":0,"status":"draft","payload":{"brand":"Test brand","name":"Test fragrance","concentration":"Eau de Parfum","sizeMl":50,"type":"standard"}}');
do $$ begin
 if exists(select 1 from jsonb_array_elements(public.library_catalog_updates()) x where x->>'id'='admin-security-fixture') then raise exception 'Draft leaked';end if;
 begin perform public.library_admin('save_fragrance','{"id":"admin-security-fixture","version":0,"status":"published","payload":{"brand":"Test","name":"Test","concentration":"Eau de Parfum","sizeMl":50,"type":"standard"}}');raise exception 'Conflict not detected';exception when serialization_failure then null;end;
 begin perform public.library_admin('user_update','{"id":"00000000-0000-4000-8000-000000000091","suspended":true}');raise exception 'Owner lockout';exception when insufficient_privilege then null;end;
end $$;
select public.library_admin('save_fragrance','{"id":"admin-security-fixture","version":1,"status":"published","payload":{"brand":"Test brand","name":"Test fragrance","concentration":"Eau de Parfum","sizeMl":50,"type":"standard"}}');
select public.library_admin('user_update','{"id":"00000000-0000-4000-8000-000000000092","suspended":true}');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000092',true);
do $$ begin
 if (select count(*) from public.user_collections)<>0 then raise exception 'Suspended collection read allowed';end if;
 begin perform public.save_my_collection(auth.uid(),'[]',1);raise exception 'Suspended collection write allowed';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000093',true);
do $$ begin
 begin perform public.library_admin('user_update','{"id":"00000000-0000-4000-8000-000000000092","role":"admin"}');raise exception 'Editor changed user role';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role anon;
do $$ begin
 if not exists(select 1 from jsonb_array_elements(public.library_catalog_updates()) x where x->>'id'='admin-security-fixture') then raise exception 'Published record missing';end if;
 begin perform public.library_admin('context');raise exception 'Anonymous admin execution allowed';exception when insufficient_privilege then null;end;
 begin perform 1 from public.library_activity;raise exception 'Audit leaked';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
