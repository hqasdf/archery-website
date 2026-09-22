-- Run as the project database administrator. Every fixture change rolls back.
begin;

select set_config('stage3.user_a', gen_random_uuid()::text, true);
select set_config('stage3.user_b', gen_random_uuid()::text, true);
select set_config('stage3.fixture_session_id', gen_random_uuid()::text, true);
select set_config('stage3.competition_session_id', gen_random_uuid()::text, true);
select set_config('stage3.fixture_round_id', gen_random_uuid()::text, true);
select set_config('stage3.fixture_end_id', gen_random_uuid()::text, true);
select set_config('stage3.cascade_round_id', gen_random_uuid()::text, true);
select set_config('stage3.cascade_end_id', gen_random_uuid()::text, true);

insert into auth.users (id, aud, role, email, created_at, updated_at)
select id, 'authenticated', 'authenticated',
       'stage3-' || id || '@example.invalid', now(), now()
from (values (current_setting('stage3.user_a')::uuid),
             (current_setting('stage3.user_b')::uuid)) as fixtures(id);

select set_config('request.jwt.claim.sub', current_setting('stage3.user_a'), true);
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('stage3.user_a'), 'role', 'authenticated')::text, true);
set local role authenticated;

insert into public.sessions (id, user_id, title, session_date)
values (current_setting('stage3.fixture_session_id')::uuid, auth.uid(), 'Stage 3.1 fixture', current_date);

insert into public.session_rounds (
  id, session_id, round_number, name, division, distance_metres,
  face_diameter_cm, face_type, planned_ends, arrows_per_end
) values (
  current_setting('stage3.fixture_round_id')::uuid, current_setting('stage3.fixture_session_id')::uuid,
  1, 'Fixture round', 'Recurve', 70,
  122, 'full_face', 2, 2
) ;

insert into public.session_ends (id, session_round_id, end_number)
values (current_setting('stage3.fixture_end_id')::uuid, current_setting('stage3.fixture_round_id')::uuid, 1),
       (gen_random_uuid(), current_setting('stage3.fixture_round_id')::uuid, 2);

insert into public.arrows (
  session_end_id, arrow_number, score_points, is_x, plot_x, plot_y, face_index
) values (current_setting('stage3.fixture_end_id')::uuid, 1, 10, true, 0.01, -0.02, null);

do $$
begin
  if (select count(*) from public.sessions) <> 1 then
    raise exception 'FAIL: owner cannot read their Session';
  end if;
  if not exists (select 1 from public.sessions where arrow_count=0) then
    raise exception 'FAIL: Session Arrow count must default to zero';
  end if;
  if not exists (select 1 from public.sessions where session_type='training') then
    raise exception 'FAIL: existing Sessions must default to training';
  end if;
  insert into public.sessions (id, user_id, title, session_date, session_type)
  values (current_setting('stage3.competition_session_id')::uuid, auth.uid(), 'Fixture competition', current_date, 'competition');
  if not exists (select 1 from public.sessions where id=current_setting('stage3.competition_session_id')::uuid and session_type='competition') then
    raise exception 'FAIL: owner could not create a Competition';
  end if;
  delete from public.sessions where id=current_setting('stage3.competition_session_id')::uuid;
  begin
    insert into public.sessions (user_id, title, session_date, session_type)
    values (auth.uid(), 'Invalid type', current_date, 'invalid');
    raise exception 'FAIL: invalid Session type allowed';
  exception when check_violation then null;
  end;
  update public.sessions set arrow_count=72 where id=current_setting('stage3.fixture_session_id')::uuid;
  if not exists (select 1 from public.sessions where arrow_count=72) then
    raise exception 'FAIL: owner could not update Session Arrow count';
  end if;
  begin
    update public.sessions set arrow_count=-1 where id=current_setting('stage3.fixture_session_id')::uuid;
    raise exception 'FAIL: negative Session Arrow count allowed';
  exception when check_violation then null;
  end;
  if (select count(*) from public.session_rounds) <> 1 then
    raise exception 'FAIL: owner cannot read their Round';
  end if;
  if (select count(*) from public.session_ends) <> 2 then
    raise exception 'FAIL: planned Ends were not created';
  end if;
  if not exists (
    select 1 from public.arrows
    where score_points=10 and is_x and plot_x=0.01 and plot_y=-0.02
  ) then
    raise exception 'FAIL: Arrow score or plot did not persist';
  end if;
  begin
    insert into public.arrows (session_end_id, arrow_number, score_points, is_x)
    values (current_setting('stage3.fixture_end_id')::uuid, 2, 9, true);
    raise exception 'FAIL: invalid X combination accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.arrows (session_end_id, arrow_number, score_points, plot_x)
    values (current_setting('stage3.fixture_end_id')::uuid, 2, 9, 0.2);
    raise exception 'FAIL: unpaired plot accepted';
  exception when check_violation then null;
  end;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', current_setting('stage3.user_b'), true);
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('stage3.user_b'), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare affected integer;
begin
  if exists (select 1 from public.sessions)
      or exists (select 1 from public.session_rounds)
      or exists (select 1 from public.session_ends)
      or exists (select 1 from public.arrows) then
    raise exception 'FAIL: cross-user SELECT exposed scoring data';
  end if;
  begin
    insert into public.session_rounds (
      session_id, round_number, name, division, distance_metres,
      face_diameter_cm, face_type, planned_ends, arrows_per_end
    ) values (
      current_setting('stage3.fixture_session_id')::uuid, 2, 'Forbidden', 'Other', 18,
      40, 'full_face', 1, 1
    );
    raise exception 'FAIL: cross-user Round INSERT allowed';
  exception when insufficient_privilege then null;
  end;
  update public.arrows set score_points=8
  where session_end_id=current_setting('stage3.fixture_end_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: cross-user Arrow UPDATE allowed'; end if;
  delete from public.sessions where id=current_setting('stage3.fixture_session_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: cross-user Session DELETE allowed'; end if;
  update public.sessions set arrow_count=12 where id=current_setting('stage3.fixture_session_id')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: cross-user Session Arrow-count UPDATE allowed'; end if;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
set local role anon;
do $$
begin
  begin
    perform id from public.sessions;
    raise exception 'FAIL: anonymous Session SELECT allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.sessions (user_id, title, session_date)
    values (current_setting('stage3.user_a')::uuid, 'Forbidden', current_date);
    raise exception 'FAIL: anonymous Session INSERT allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.sessions set arrow_count=1;
    raise exception 'FAIL: anonymous Session UPDATE allowed';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', current_setting('stage3.user_a'), true);
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('stage3.user_a'), 'role', 'authenticated')::text, true);
set local role authenticated;
delete from public.session_rounds where id=current_setting('stage3.fixture_round_id')::uuid;

reset role;
do $$
begin
  if exists (select 1 from public.session_ends where session_round_id=current_setting('stage3.fixture_round_id')::uuid)
      or exists (select 1 from public.arrows where session_end_id=current_setting('stage3.fixture_end_id')::uuid) then
    raise exception 'FAIL: Round deletion did not cascade';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('stage3.user_a'), true);
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('stage3.user_a'), 'role', 'authenticated')::text, true);
set local role authenticated;
insert into public.session_rounds (
  id, session_id, round_number, name, division, distance_metres,
  face_diameter_cm, face_type, planned_ends, arrows_per_end
) values (
  current_setting('stage3.cascade_round_id')::uuid, current_setting('stage3.fixture_session_id')::uuid,
  2, 'Cascade round', 'Compound', 50,
  80, 'six_ring', 1, 1
) ;
insert into public.session_ends (id, session_round_id, end_number)
values (current_setting('stage3.cascade_end_id')::uuid, current_setting('stage3.cascade_round_id')::uuid, 1);
insert into public.arrows (session_end_id, arrow_number, score_points, is_x, plot_x, plot_y)
values (current_setting('stage3.cascade_end_id')::uuid, 1, 10, false, 0.08, 0.01);
delete from public.sessions where id=current_setting('stage3.fixture_session_id')::uuid;

reset role;
do $$
begin
  if exists (select 1 from public.session_rounds where session_id=current_setting('stage3.fixture_session_id')::uuid)
      or exists (select 1 from public.session_ends where session_round_id=current_setting('stage3.cascade_round_id')::uuid)
      or exists (select 1 from public.arrows where session_end_id=current_setting('stage3.cascade_end_id')::uuid) then
    raise exception 'FAIL: Session deletion did not cascade';
  end if;
end;
$$;

select 'PASS: ownership, RLS, anonymous denial, integrity checks, Round cascade and Session cascade' as result;
rollback;
