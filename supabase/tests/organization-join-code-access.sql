-- Run only after the proposed join-code migration is approved and applied.
-- Fixture creates temporary Auth users and records; every change rolls back.
begin;

create function pg_temp.expect_rejection(statement text)
returns void language plpgsql as $$
begin
  execute statement;
  raise exception 'Expected rejection was not raised';
exception when others then
  if sqlerrm = 'Expected rejection was not raised' then raise; end if;
end;
$$;

select set_config('s6.coach_a', gen_random_uuid()::text, true);
select set_config('s6.coach_b', gen_random_uuid()::text, true);
select set_config('s6.coach_c', gen_random_uuid()::text, true);
select set_config('s6.coach_a2', gen_random_uuid()::text, true);
select set_config('s6.archer_a', gen_random_uuid()::text, true);
select set_config('s6.archer_b', gen_random_uuid()::text, true);
select set_config('s6.before_session', gen_random_uuid()::text, true);
select set_config('s6.after_session', gen_random_uuid()::text, true);
select set_config('s6.coach_session', gen_random_uuid()::text, true);
select set_config('s6.archer_b_session', gen_random_uuid()::text, true);
select set_config('s6.round', gen_random_uuid()::text, true);
select set_config('s6.end', gen_random_uuid()::text, true);
select set_config('s6.arrow', gen_random_uuid()::text, true);

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
select id, 'authenticated', 'authenticated', 'join-' || id || '@example.invalid', now(), now(), now()
from (values
  (current_setting('s6.coach_a')::uuid), (current_setting('s6.coach_b')::uuid),
  (current_setting('s6.coach_c')::uuid), (current_setting('s6.coach_a2')::uuid),
  (current_setting('s6.archer_a')::uuid), (current_setting('s6.archer_b')::uuid)
) fixture(id);

-- Create owner Sessions before any Archer joins; no organisation tag is used.
select set_config('request.jwt.claim.sub', current_setting('s6.archer_a'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('s6.archer_a'), 'role', 'authenticated')::text, true);
set local role authenticated;
insert into public.sessions (id, user_id, title, session_date)
values (current_setting('s6.before_session')::uuid, auth.uid(), 'Before joining', current_date);
insert into public.session_rounds
  (id, session_id, round_number, name, division, distance_metres, face_diameter_cm, face_type, planned_ends, arrows_per_end)
values (current_setting('s6.round')::uuid, current_setting('s6.before_session')::uuid,
  1, 'Fixture Round', 'Recurve', 70, 122, 'full_face', 1, 1);
insert into public.session_ends (id, session_round_id, end_number)
values (current_setting('s6.end')::uuid, current_setting('s6.round')::uuid, 1);
insert into public.arrows (id, session_end_id, arrow_number, score_points, is_x)
values (current_setting('s6.arrow')::uuid, current_setting('s6.end')::uuid, 1, 9, false);

reset role;
select set_config('request.jwt.claim.sub', current_setting('s6.coach_a'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('s6.coach_a'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ declare v_id uuid; begin
  if private.has_organization_membership_record(gen_random_uuid()) then
    raise exception 'Creator bootstrap check found a membership before creation';
  end if;
  insert into public.organizations (name, created_by) values ('Join fixture A', auth.uid()) returning id into v_id;
  perform set_config('s6.org_a', v_id::text, true);
end $$;
do $$ begin
  if not private.has_organization_membership_record(current_setting('s6.org_a')::uuid)
    or not private.is_active_organization_member(current_setting('s6.org_a')::uuid)
    or not exists (select 1 from public.organizations where id = current_setting('s6.org_a')::uuid)
    or not exists (select 1 from public.organization_members
      where organization_id = current_setting('s6.org_a')::uuid and user_id = auth.uid()
        and role = 'head_coach' and status = 'active') then
    raise exception 'INSERT RETURNING or creator Head Coach bootstrap failed';
  end if;
end $$;
insert into public.sessions (id, user_id, title, session_date)
values (current_setting('s6.coach_session')::uuid, auth.uid(), 'Coach private', current_date);

reset role;
select set_config('request.jwt.claim.sub', current_setting('s6.coach_b'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('s6.coach_b'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ declare v_id uuid; begin
  insert into public.organizations (name, created_by) values ('Join fixture B', auth.uid()) returning id into v_id;
  perform set_config('s6.org_b', v_id::text, true);
end $$;

reset role;
select set_config('request.jwt.claim.sub', current_setting('s6.coach_c'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('s6.coach_c'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ declare v_id uuid; begin
  insert into public.organizations (name, created_by) values ('Join fixture C', auth.uid()) returning id into v_id;
  perform set_config('s6.org_c', v_id::text, true);
end $$;

reset role;
insert into public.organization_members (organization_id, user_id, role, status)
values (current_setting('s6.org_a')::uuid, current_setting('s6.coach_a2')::uuid, 'head_coach', 'active');
select set_config('s6.old_code', join_code, true) from public.organizations
  where id = current_setting('s6.org_a')::uuid;
do $$ begin
  if (select count(distinct join_code) from public.organizations
      where id in (current_setting('s6.org_a')::uuid, current_setting('s6.org_b')::uuid, current_setting('s6.org_c')::uuid)) <> 3 then
    raise exception 'Join codes must be unique';
  end if;
end $$;

-- Invalid code, case-insensitive join, duplicate join, and Archer-only role.
select set_config('request.jwt.claim.sub', current_setting('s6.archer_a'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('s6.archer_a'), 'role', 'authenticated')::text, true);
set local role authenticated;
select pg_temp.expect_rejection('select public.join_organization_by_code(''INVALID!'')');
do $$ begin
  if exists (select 1 from public.organizations where id = current_setting('s6.org_a')::uuid)
    or private.has_organization_membership_record(current_setting('s6.org_a')::uuid) then
    raise exception 'Nonmember can read organisation or has an unexpected membership';
  end if;
  if public.join_organization_by_code('  ' || lower(current_setting('s6.old_code')) || '  ') <> 'joined'
    or public.join_organization_by_code(current_setting('s6.old_code')) <> 'already_member' then
    raise exception 'Code joining or duplicate joining failed';
  end if;
end $$;
do $$ begin
  if not exists (select 1 from public.organizations where id = current_setting('s6.org_a')::uuid)
    or not private.has_organization_membership_record(current_setting('s6.org_a')::uuid) then
    raise exception 'Active Archer cannot read organisation';
  end if;
  if exists (select 1 from public.sessions where id = current_setting('s6.coach_session')::uuid) then
    raise exception 'Archer can read Head Coach Session';
  end if;
end $$;
select pg_temp.expect_rejection(format(
  'select * from public.read_coach_athlete_roster(%L::uuid)', current_setting('s6.org_a')));
select pg_temp.expect_rejection('select join_code from public.organizations');
select pg_temp.expect_rejection(format(
  'select public.read_organization_join_code(%L::uuid)', current_setting('s6.org_a')));

reset role;
do $$ begin
  if (select count(*) from public.organization_members where organization_id = current_setting('s6.org_a')::uuid
    and user_id = current_setting('s6.archer_a')::uuid and role = 'archer' and status = 'active') <> 1 then
    raise exception 'Join created wrong membership';
  end if;
end $$;

-- Coach A sees all active Archer scoring, including pre-join descendants.
select set_config('request.jwt.claim.sub', current_setting('s6.coach_a'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('s6.coach_a'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if not exists (select 1 from public.sessions where id = current_setting('s6.before_session')::uuid)
    or not exists (select 1 from public.session_rounds where id = current_setting('s6.round')::uuid)
    or not exists (select 1 from public.session_ends where id = current_setting('s6.end')::uuid)
    or not exists (select 1 from public.arrows where id = current_setting('s6.arrow')::uuid)
    or (select count(*) from public.read_coach_athlete_roster(current_setting('s6.org_a')::uuid)) <> 1 then
    raise exception 'Head Coach cannot read active Archer data';
  end if;
end $$;
do $$ begin
  if public.read_organization_join_code(current_setting('s6.org_a')::uuid) <> current_setting('s6.old_code') then
    raise exception 'Head Coach could not read join code';
  end if;
end $$;
do $$ declare v_id uuid; begin
  update public.arrows set score_points = 10 where id = current_setting('s6.arrow')::uuid returning id into v_id;
  if v_id is not null then raise exception 'Coach updated an Archer Arrow'; end if;
  if public.join_organization_by_code(current_setting('s6.old_code')) <> 'already_member' then
    raise exception 'Head Coach join changed membership';
  end if;
end $$;
do $$ declare v_code text; begin
  v_code := public.regenerate_organization_join_code(current_setting('s6.org_a')::uuid);
  if v_code = current_setting('s6.old_code') then raise exception 'Code did not change'; end if;
  perform set_config('s6.new_code', v_code, true);
end $$;

-- The previous code is invalid; a new user joins using only the replacement.
reset role;
select set_config('request.jwt.claim.sub', current_setting('s6.archer_b'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('s6.archer_b'), 'role', 'authenticated')::text, true);
set local role authenticated;
select pg_temp.expect_rejection(format('select public.join_organization_by_code(%L)', current_setting('s6.old_code')));
do $$ begin
  if public.join_organization_by_code(current_setting('s6.new_code')) <> 'joined' then
    raise exception 'New code did not admit Archer';
  end if;
  if exists (select 1 from public.sessions where id = current_setting('s6.before_session')::uuid) then
    raise exception 'Archers can read one another';
  end if;
end $$;
insert into public.sessions (id, user_id, title, session_date)
values (current_setting('s6.archer_b_session')::uuid, auth.uid(), 'B scoring', current_date);

-- Another Head Coach in A sees Archers but not the other Head Coach's Session.
reset role;
select set_config('request.jwt.claim.sub', current_setting('s6.coach_a2'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('s6.coach_a2'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if not exists (select 1 from public.sessions where id = current_setting('s6.before_session')::uuid)
    or exists (select 1 from public.sessions where id = current_setting('s6.coach_session')::uuid) then
    raise exception 'Second coach visibility is incorrect';
  end if;
end $$;

-- A can join B too: both coaches see all A Sessions; unrelated C cannot.
reset role;
select set_config('s6.code_b', join_code, true) from public.organizations where id = current_setting('s6.org_b')::uuid;
select set_config('request.jwt.claim.sub', current_setting('s6.archer_a'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('s6.archer_a'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if exists (select 1 from public.sessions where id = current_setting('s6.archer_b_session')::uuid) then
    raise exception 'Archer A can read Archer B';
  end if;
end $$;
do $$ begin
  if public.join_organization_by_code(current_setting('s6.code_b')) <> 'joined' then raise exception 'Second organisation join failed'; end if;
end $$;
insert into public.sessions (id, user_id, title, session_date)
values (current_setting('s6.after_session')::uuid, auth.uid(), 'After joining', current_date);
do $$ begin
  if not public.leave_organization(current_setting('s6.org_a')::uuid) then raise exception 'Archer could not leave A'; end if;
end $$;

-- After leaving A, A loses all access; B retains access; owner keeps data.
reset role;
select set_config('request.jwt.claim.sub', current_setting('s6.coach_a'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('s6.coach_a'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if exists (select 1 from public.sessions where id in (current_setting('s6.before_session')::uuid, current_setting('s6.after_session')::uuid))
    or exists (select 1 from public.arrows where id = current_setting('s6.arrow')::uuid) then
    raise exception 'Coach retained departed Archer access';
  end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', current_setting('s6.coach_b'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('s6.coach_b'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if not exists (select 1 from public.sessions where id = current_setting('s6.before_session')::uuid)
    or not exists (select 1 from public.sessions where id = current_setting('s6.after_session')::uuid) then
    raise exception 'Second organisation coach lost Archer data';
  end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', current_setting('s6.coach_c'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('s6.coach_c'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if exists (select 1 from public.sessions where id = current_setting('s6.before_session')::uuid) then
    raise exception 'Unrelated coach gained access';
  end if;
end $$;

-- Rejoining restores access; the final coach can leave without removing members.
reset role;
select set_config('request.jwt.claim.sub', current_setting('s6.archer_a'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('s6.archer_a'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if not exists (select 1 from public.sessions where id = current_setting('s6.before_session')::uuid)
    or public.join_organization_by_code(current_setting('s6.new_code')) <> 'joined' then
    raise exception 'Owner access or rejoin failed';
  end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', current_setting('s6.coach_a'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('s6.coach_a'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if not exists (select 1 from public.sessions where id = current_setting('s6.before_session')::uuid) then
    raise exception 'Coach access did not resume after rejoin';
  end if;
  if not public.leave_organization(current_setting('s6.org_a')::uuid) then
    raise exception 'Head Coach could not leave';
  end if;
end $$;
do $$ begin
  if not private.has_organization_membership_record(current_setting('s6.org_a')::uuid)
    or exists (select 1 from public.organizations where id = current_setting('s6.org_a')::uuid) then
    raise exception 'Former creator retained organisation SELECT access';
  end if;
end $$;
select pg_temp.expect_rejection(format(
  'select public.read_organization_join_code(%L::uuid)', current_setting('s6.org_a')));
reset role;
select set_config('request.jwt.claim.sub', current_setting('s6.coach_a2'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('s6.coach_a2'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  if not public.leave_organization(current_setting('s6.org_a')::uuid) then
    raise exception 'Last Head Coach could not leave';
  end if;
end $$;
select pg_temp.expect_rejection(format(
  'select * from public.read_coach_athlete_roster(%L::uuid)', current_setting('s6.org_a')));
reset role;
select set_config('request.jwt.claim.sub', current_setting('s6.archer_a'), true);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('s6.archer_a'), 'role', 'authenticated')::text, true);
set local role authenticated;
insert into public.sessions (user_id, title, session_date)
values (auth.uid(), 'Zero-coach scoring', current_date);
reset role;
do $$ begin
  if not exists (select 1 from public.organizations where id = current_setting('s6.org_a')::uuid)
    or not exists (select 1 from public.organizations where id = current_setting('s6.org_a')::uuid
      and created_by = current_setting('s6.coach_a')::uuid)
    or (select count(*) from public.organization_members where organization_id = current_setting('s6.org_a')::uuid
      and role = 'head_coach' and status = 'active') <> 0
    or (select count(*) from public.organization_members where organization_id = current_setting('s6.org_a')::uuid
      and role = 'archer' and status = 'active') <> 2 then
    raise exception 'Zero-coach organisation state is incorrect';
  end if;
end $$;

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select pg_temp.expect_rejection('select * from public.organizations');
select pg_temp.expect_rejection('select * from public.sessions');
select pg_temp.expect_rejection(format('select public.join_organization_by_code(%L)', current_setting('s6.new_code')));
select pg_temp.expect_rejection(format('select * from public.read_coach_athlete_roster(%L::uuid)', current_setting('s6.org_a')));

rollback;
