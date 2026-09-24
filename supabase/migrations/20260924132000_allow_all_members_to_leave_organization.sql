begin;

create or replace function private.leave_organization(p_organization_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Sign in is required.'; end if;
  update public.organization_members
  set status = 'left', left_at = now()
  where organization_id = p_organization_id
    and user_id = (select auth.uid())
    and status = 'active';
  return found;
end;
$$;

commit;
