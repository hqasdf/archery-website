begin;

-- A code is an Archer-joining credential, never a scoring-data credential.
create function private.new_organization_join_code()
returns text language sql volatile security invoker set search_path = '' as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    get_byte(bytes, n) % 32 + 1, 1), '' order by n)
  from (select extensions.gen_random_bytes(8) as bytes) random_bytes,
       generate_series(0, 7) as positions(n);
$$;
revoke all on function private.new_organization_join_code() from public, anon, authenticated;

alter table public.organizations add column join_code text;
update public.organizations set join_code = private.new_organization_join_code();
alter table public.organizations alter column join_code set not null;
alter table public.organizations add constraint organizations_join_code_unique unique (join_code);
alter table public.organizations add constraint organizations_join_code_format
  check (join_code ~ '^[A-HJ-NP-Z2-9]{8}$');
revoke select on table public.organizations from authenticated;
grant select (id, name) on table public.organizations to authenticated;

-- Keep the creator visible during creation only while no membership row exists.
-- The existing AFTER INSERT trigger establishes the permanent member access.
create function private.has_organization_membership_record(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
  );
$$;
revoke all on function private.has_organization_membership_record(uuid)
  from public, anon, authenticated;
grant execute on function private.has_organization_membership_record(uuid)
  to authenticated;
alter policy organizations_select_member on public.organizations
  using (
    private.is_active_organization_member(id)
    or (created_by = (select auth.uid())
      and not private.has_organization_membership_record(id))
  );

create function private.set_organization_join_code()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.join_code := private.new_organization_join_code();
  return new;
end;
$$;
revoke all on function private.set_organization_join_code() from public, anon, authenticated;
create trigger organizations_set_join_code before insert on public.organizations
for each row execute function private.set_organization_join_code();

create function private.read_organization_join_code(p_organization_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_code text;
begin
  if (select auth.uid()) is null or not private.is_active_head_coach(p_organization_id) then
    raise exception 'Only an active Head Coach may read this join code.' using errcode = '42501';
  end if;
  select join_code into v_code from public.organizations where id = p_organization_id;
  return v_code;
end;
$$;
revoke all on function private.read_organization_join_code(uuid) from public, anon, authenticated;
grant execute on function private.read_organization_join_code(uuid) to authenticated;
create function public.read_organization_join_code(p_organization_id uuid)
returns text language sql stable security invoker set search_path = '' as $$
  select private.read_organization_join_code(p_organization_id);
$$;
revoke all on function public.read_organization_join_code(uuid) from public, anon, authenticated;
grant execute on function public.read_organization_join_code(uuid) to authenticated;

-- No direct UPDATE grant on organizations: these RPCs are the only join-code writes.
create function private.regenerate_organization_join_code(p_organization_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text; v_previous_code text;
begin
  if (select auth.uid()) is null or not private.is_active_head_coach(p_organization_id) then
    raise exception 'Only an active Head Coach may regenerate this join code.' using errcode = '42501';
  end if;
  select join_code into v_previous_code from public.organizations
    where id = p_organization_id for update;
  loop
    v_code := private.new_organization_join_code();
    exit when v_code <> v_previous_code and not exists (
      select 1 from public.organizations where join_code = v_code);
  end loop;
  update public.organizations set join_code = v_code where id = p_organization_id;
  return v_code;
end;
$$;
revoke all on function private.regenerate_organization_join_code(uuid) from public, anon, authenticated;
grant execute on function private.regenerate_organization_join_code(uuid) to authenticated;
create function public.regenerate_organization_join_code(p_organization_id uuid)
returns text language sql security invoker set search_path = '' as $$
  select private.regenerate_organization_join_code(p_organization_id);
$$;
revoke all on function public.regenerate_organization_join_code(uuid) from public, anon, authenticated;
grant execute on function public.regenerate_organization_join_code(uuid) to authenticated;

create function private.join_organization_by_code(p_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_organization_id uuid; v_joined_user_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in is required.' using errcode = '42501';
  end if;
  select id into v_organization_id from public.organizations
    where join_code = upper(btrim(p_code));
  if v_organization_id is null then
    raise exception 'Invalid join code.' using errcode = '22023';
  end if;
  insert into public.organization_members (organization_id, user_id, role, status)
    values (v_organization_id, (select auth.uid()), 'archer', 'active')
    on conflict (organization_id, user_id) do update
      set role = 'archer', status = 'active', joined_at = now(), left_at = null
      where public.organization_members.status = 'left'
    returning user_id into v_joined_user_id;
  return case when v_joined_user_id is null then 'already_member' else 'joined' end;
end;
$$;
revoke all on function private.join_organization_by_code(text) from public, anon, authenticated;
grant execute on function private.join_organization_by_code(text) to authenticated;
create function public.join_organization_by_code(p_code text)
returns text language sql security invoker set search_path = '' as $$
  select private.join_organization_by_code(p_code);
$$;
revoke all on function public.join_organization_by_code(text) from public, anon, authenticated;
grant execute on function public.join_organization_by_code(text) to authenticated;

-- Membership RLS stays owner-only. This helper reads both memberships privately.
create function private.can_current_head_coach_read_archer(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.organization_members coach
    join public.organization_members archer
      on archer.organization_id = coach.organization_id
    where coach.user_id = (select auth.uid())
      and coach.role = 'head_coach' and coach.status = 'active'
      and archer.user_id = p_user_id
      and archer.role = 'archer' and archer.status = 'active'
  );
$$;
revoke all on function private.can_current_head_coach_read_archer(uuid) from public, anon, authenticated;
grant execute on function private.can_current_head_coach_read_archer(uuid) to authenticated;

alter policy sessions_insert_own on public.sessions
  with check (user_id = (select auth.uid()));
drop policy sessions_select_coach on public.sessions;
create policy sessions_select_coach on public.sessions for select to authenticated
  using (private.can_current_head_coach_read_archer(user_id));
drop policy session_rounds_select_coach on public.session_rounds;
create policy session_rounds_select_coach on public.session_rounds for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_rounds.session_id
    and private.can_current_head_coach_read_archer(s.user_id)));
drop policy session_ends_select_coach on public.session_ends;
create policy session_ends_select_coach on public.session_ends for select to authenticated
  using (exists (select 1 from public.session_rounds r
    join public.sessions s on s.id = r.session_id
    where r.id = session_ends.session_round_id
      and private.can_current_head_coach_read_archer(s.user_id)));
drop policy arrows_select_coach on public.arrows;
create policy arrows_select_coach on public.arrows for select to authenticated
  using (exists (select 1 from public.session_ends e
    join public.session_rounds r on r.id = e.session_round_id
    join public.sessions s on s.id = r.session_id
    where e.id = arrows.session_end_id
      and private.can_current_head_coach_read_archer(s.user_id)));

-- Only active Archers appear; no former-athlete identity or scoring access.
drop function public.read_coach_athlete_roster(uuid);
drop function private.read_coach_athlete_roster(uuid);
create function private.read_coach_athlete_roster(p_organization_id uuid)
returns table (user_id uuid, display_name text, joined_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not private.is_active_head_coach(p_organization_id) then
    raise exception 'Only an active Head Coach may read this organisation roster.' using errcode = '42501';
  end if;
  return query select m.user_id, p.display_name, m.joined_at
    from public.organization_members m left join public.profiles p on p.id = m.user_id
    where m.organization_id = p_organization_id and m.role = 'archer' and m.status = 'active'
    order by m.joined_at, m.user_id;
end;
$$;
revoke all on function private.read_coach_athlete_roster(uuid) from public, anon, authenticated;
grant execute on function private.read_coach_athlete_roster(uuid) to authenticated;
create function public.read_coach_athlete_roster(p_organization_id uuid)
returns table (user_id uuid, display_name text, joined_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from private.read_coach_athlete_roster(p_organization_id);
$$;
revoke all on function public.read_coach_athlete_roster(uuid) from public, anon, authenticated;
grant execute on function public.read_coach_athlete_roster(uuid) to authenticated;

drop function public.issue_organization_invitation(uuid, text, text);
drop function public.accept_organization_invitation(text);
drop function public.cancel_organization_invitation(uuid);
drop function private.issue_organization_invitation(uuid, text, text);
drop function private.accept_organization_invitation(text);
drop function private.cancel_organization_invitation(uuid);
drop table public.organization_invitations;
drop index public.sessions_organization_date_idx;
alter table public.sessions drop column organization_id;

commit;
