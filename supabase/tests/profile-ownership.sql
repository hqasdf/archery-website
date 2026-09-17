-- Run as the project database administrator. All fixture changes roll back.
-- These tests exercise database roles/RLS, not browser login or email delivery.
begin;

select set_config('stage2.user_a', gen_random_uuid()::text, true);
select set_config('stage2.user_b', gen_random_uuid()::text, true);

insert into auth.users (id, aud, role, email, created_at, updated_at)
select id, 'authenticated', 'authenticated',
       'stage2-' || id || '@example.invalid', now(), now()
from (values (current_setting('stage2.user_a')::uuid),
             (current_setting('stage2.user_b')::uuid)) as fixtures(id);

do $$
begin
  if (select count(*) from public.profiles
      where id in (current_setting('stage2.user_a')::uuid, current_setting('stage2.user_b')::uuid)) <> 2 then
    raise exception 'FAIL: trigger must create exactly one profile for each fixture';
  end if;
  if exists (select 1 from public.profiles
      where id in (current_setting('stage2.user_a')::uuid, current_setting('stage2.user_b')::uuid)
      and display_name is not null) then
    raise exception 'FAIL: profiles must start empty';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.profiles'::regclass) then
    raise exception 'FAIL: RLS disabled';
  end if;
  begin
    insert into public.profiles (id) values (current_setting('stage2.user_a')::uuid);
    raise exception 'FAIL: duplicate profile allowed';
  exception when unique_violation then null;
  end;
end;
$$;

update public.profiles set updated_at = '2000-01-01'
where id=current_setting('stage2.user_a')::uuid;
-- The update trigger sets now() even for admin updates. Check the timestamp
-- against a separate statement snapshot after the user update below.

select set_config('request.jwt.claim.sub', current_setting('stage2.user_a'), true);
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('stage2.user_a'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare affected integer;
begin
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'FAIL: user A must see exactly their own profile';
  end if;
  if not exists (select 1 from public.profiles where id=auth.uid()) then
    raise exception 'FAIL: owner cannot read own row';
  end if;
  if exists (select 1 from public.profiles where id=current_setting('stage2.user_b')::uuid) then
    raise exception 'FAIL: cross-user SELECT leaked a profile';
  end if;
  update public.profiles set display_name='Stage 2 Archer' where id=auth.uid();
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'FAIL: owner save failed'; end if;
  if not exists (select 1 from public.profiles where id=auth.uid()
      and display_name='Stage 2 Archer' and updated_at=now()) then
    raise exception 'FAIL: saved name/timestamp did not persist';
  end if;
  update public.profiles set display_name='Unauthorized' where id=current_setting('stage2.user_b')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: cross-user UPDATE changed a row'; end if;
  begin
    update public.profiles set id=current_setting('stage2.user_b')::uuid where id=auth.uid();
    raise exception 'FAIL: ownership update allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set created_at=now() where id=auth.uid();
    raise exception 'FAIL: created_at update allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.profiles (id) values (auth.uid());
    raise exception 'FAIL: authenticated INSERT allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.profiles where id=auth.uid();
    raise exception 'FAIL: authenticated DELETE allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set display_name=repeat('a',81) where id=auth.uid();
    raise exception 'FAIL: overlong display name allowed';
  exception when check_violation then null;
  end;
  update public.profiles set display_name=null where id=auth.uid();
  if not exists (select 1 from public.profiles where id=auth.uid() and display_name is null) then
    raise exception 'FAIL: clearing name failed';
  end if;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', current_setting('stage2.user_b'), true);
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('stage2.user_b'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
begin
  if (select count(*) from public.profiles) <> 1
      or not exists (select 1 from public.profiles where id=auth.uid() and display_name is null) then
    raise exception 'FAIL: user B isolation or cross-user update protection';
  end if;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
set local role anon;
do $$
begin
  begin
    perform id from public.profiles;
    raise exception 'FAIL: anonymous SELECT allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set display_name='Anonymous';
    raise exception 'FAIL: anonymous UPDATE allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;


-- Stage 2.1: all optional details use the same owner policies and grants.
reset role;
select set_config('request.jwt.claim.sub', current_setting('stage2.user_a'), true);
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('stage2.user_a'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare
  affected integer;
  whitespace text := U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF';
  c text;
begin
  update public.profiles set club_or_team='Stage 2.1 Club', division='Barebow',
    shooting_hand='Left', experience_level='Advanced', bio=E'First line\n\n  Second line\r\nThird line'
    where id=auth.uid();
  if not exists (select 1 from public.profiles where id=auth.uid()
      and club_or_team='Stage 2.1 Club' and division='Barebow' and shooting_hand='Left'
      and experience_level='Advanced' and bio=E'First line\n\n  Second line\r\nThird line') then
    raise exception 'FAIL: new fields did not persist';
  end if;
  update public.profiles set club_or_team='Unauthorized', division='Other',
    shooting_hand='Right', experience_level='Beginner', bio='Unauthorized'
    where id=current_setting('stage2.user_b')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: cross-user detail update allowed'; end if;
  if exists (select bio from public.profiles where id=current_setting('stage2.user_b')::uuid) then
    raise exception 'FAIL: cross-user details readable';
  end if;
  begin
    update public.profiles set experience_level='Competitive' where id=auth.uid();
    raise exception 'FAIL: Competitive accepted';
  exception when check_violation then null;
  end;
  begin
    update public.profiles set division='Invalid' where id=auth.uid();
    raise exception 'FAIL: invalid division accepted';
  exception when check_violation then null;
  end;
  begin
    update public.profiles set shooting_hand='Invalid' where id=auth.uid();
    raise exception 'FAIL: invalid hand accepted';
  exception when check_violation then null;
  end;
  begin
    update public.profiles set club_or_team=repeat('a',121) where id=auth.uid();
    raise exception 'FAIL: club length accepted';
  exception when check_violation then null;
  end;
  begin
    update public.profiles set bio=repeat('a',501) where id=auth.uid();
    raise exception 'FAIL: bio length accepted';
  exception when check_violation then null;
  end;
  update public.profiles set bio=repeat('🏹',500) where id=auth.uid();
  foreach c in array string_to_array(whitespace, null) loop
    update public.profiles set bio=btrim(c || E'First\nSecond' || c, whitespace) where id=auth.uid();
    if not exists (select 1 from public.profiles where id=auth.uid() and bio=E'First\nSecond') then
      raise exception 'FAIL: normalized multiline bio rejected or altered';
    end if;
    begin
      update public.profiles set bio=c || 'Text' where id=auth.uid();
      raise exception 'FAIL: leading whitespace accepted';
    exception when check_violation then null;
    end;
    begin
      update public.profiles set bio='Text' || c where id=auth.uid();
      raise exception 'FAIL: trailing whitespace accepted';
    exception when check_violation then null;
    end;
    update public.profiles set bio=nullif(btrim(c,whitespace),'') where id=auth.uid();
  end loop;
  update public.profiles set club_or_team=null, division=null, shooting_hand=null,
    experience_level=null, bio=null where id=auth.uid();
  if not exists (select 1 from public.profiles where id=auth.uid()
      and club_or_team is null and division is null and shooting_hand is null
      and experience_level is null and bio is null) then
    raise exception 'FAIL: fields did not clear';
  end if;
end;
$$;
reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
set local role anon;
do $$
begin
  begin
    perform club_or_team, division, shooting_hand, experience_level, bio from public.profiles;
    raise exception 'FAIL: anonymous details readable';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set bio='Anonymous';
    raise exception 'FAIL: anonymous bio update allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
delete from auth.users where id=current_setting('stage2.user_a')::uuid;
do $$
begin
  if exists (select 1 from public.profiles where id=current_setting('stage2.user_a')::uuid) then
    raise exception 'FAIL: account deletion did not cascade to profile';
  end if;
end;
$$;

select 'PASS: creation, uniqueness, own read/save/clear of all fields, timestamps, cross-user SELECT/UPDATE denial, immutable ownership, INSERT/DELETE denial, length/choice/Unicode bio constraints, anonymous denial, cascade' as result;
rollback;
