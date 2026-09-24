begin;

-- Return only the identity fields needed for a Head Coach's athlete roster.
-- The private function reads protected membership/profile rows after checking
-- the caller's active Head Coach membership in the selected organisation.
create function private.read_coach_athlete_roster(p_organization_id uuid)
returns table (
  user_id uuid,
  display_name text,
  membership_role text,
  membership_status text,
  joined_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or p_organization_id is null
     or not private.is_active_head_coach(p_organization_id) then
    raise exception 'Only an active Head Coach may read this organisation roster.'
      using errcode = '42501';
  end if;

  return query
    select m.user_id, p.display_name, m.role, m.status, m.joined_at
    from public.organization_members m
    left join public.profiles p on p.id = m.user_id
    where m.organization_id = p_organization_id and m.role = 'archer'
    order by (m.status = 'active') desc, m.joined_at, m.user_id;
end;
$$;

revoke all on function private.read_coach_athlete_roster(uuid)
  from public, anon, authenticated;
grant execute on function private.read_coach_athlete_roster(uuid)
  to authenticated;

-- Exposed RPC remains invoker; the private function applies the identity check.
create function public.read_coach_athlete_roster(p_organization_id uuid)
returns table (
  user_id uuid,
  display_name text,
  membership_role text,
  membership_status text,
  joined_at timestamptz
)
language sql stable security invoker set search_path = '' as $$
  select * from private.read_coach_athlete_roster(p_organization_id);
$$;

revoke all on function public.read_coach_athlete_roster(uuid)
  from public, anon, authenticated;
grant execute on function public.read_coach_athlete_roster(uuid)
  to authenticated;

commit;
