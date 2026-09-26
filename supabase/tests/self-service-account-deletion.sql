-- REVIEW ONLY. Run after approved migration in a safe environment; always rolls back.
begin;

select set_config('d7.owner', gen_random_uuid()::text, true);
select set_config('d7.other', gen_random_uuid()::text, true);
insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
select id, 'authenticated', 'authenticated', 'd7-' || id || '@example.invalid', now(), now(), now()
from (values (current_setting('d7.owner')::uuid), (current_setting('d7.other')::uuid)) users(id);

select set_config('request.jwt.claim.sub', current_setting('d7.owner'), true);
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('d7.owner'), 'role', 'authenticated')::text, true);
set local role authenticated;
insert into public.sessions (user_id, title, session_date)
values (auth.uid(), 'D7 deletion fixture', current_date);
select set_config('d7.session', id::text, true)
from public.sessions where user_id = auth.uid() and title = 'D7 deletion fixture';
select set_config('d7.round', created.round_id::text, true)
from public.create_round_with_ends(current_setting('d7.session')::uuid,
  'D7 Round', 'Recurve', 70, 122, 'full_face', 1, 6) created;
insert into public.arrows (session_end_id, arrow_number, score_points, is_x, plot_x, plot_y)
select id, 1, 10, true, 0.01, 0.02 from public.session_ends
where session_round_id = current_setting('d7.round')::uuid and end_number = 1;
select set_config('d7.arrow', a.id::text, true)
from public.arrows a join public.session_ends e on e.id = a.session_end_id
where e.session_round_id = current_setting('d7.round')::uuid and a.arrow_number = 1;
insert into public.organizations (name, created_by)
values ('D7 deletion fixture organisation', auth.uid());
select set_config('d7.organization', id::text, true)
from public.organizations where name = 'D7 deletion fixture organisation'
  and created_by = auth.uid();

do $$
begin
  if (select count(*) from public.organization_members
    where organization_id = current_setting('d7.organization')::uuid
      and user_id = auth.uid() and role = 'head_coach' and status = 'active') <> 1 then
    raise exception 'FAIL: creator membership missing before deletion';
  end if;
end;
$$;

select public.delete_own_account();
reset role;
do $$
begin
  if exists (select 1 from auth.users where id = current_setting('d7.owner')::uuid)
    or exists (select 1 from public.profiles where id = current_setting('d7.owner')::uuid)
    or exists (select 1 from public.sessions where id = current_setting('d7.session')::uuid)
    or exists (select 1 from public.session_rounds where id = current_setting('d7.round')::uuid)
    or exists (select 1 from public.session_ends where session_round_id = current_setting('d7.round')::uuid)
    or exists (select 1 from public.arrows where id = current_setting('d7.arrow')::uuid)
    or exists (select 1 from public.organization_members
      where organization_id = current_setting('d7.organization')::uuid
        and user_id = current_setting('d7.owner')::uuid) then
    raise exception 'FAIL: deleted account left dependent rows';
  end if;
  if not exists (select 1 from public.organizations
    where id = current_setting('d7.organization')::uuid and created_by is null)
    or not exists (select 1 from auth.users where id = current_setting('d7.other')::uuid) then
    raise exception 'FAIL: deletion changed organisation or another user';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);
set local role anon;
do $$
declare v_denied boolean := false;
begin
  begin
    perform public.delete_own_account();
  exception when insufficient_privilege then v_denied := true;
  end;
  if not v_denied then raise exception 'FAIL: anonymous deletion was not denied'; end if;
end;
$$;
reset role;

rollback;
