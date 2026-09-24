begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120 and name = btrim(name)),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('archer', 'head_coach')),
  status text not null check (status in ('active', 'left')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (organization_id, user_id),
  constraint organization_members_left_at_valid check (
    (status = 'active' and left_at is null) or (status = 'left' and left_at is not null)
  )
);
create index organization_members_user_status_idx
  on public.organization_members (user_id, status);

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email_normalized text not null check (
    char_length(email_normalized) between 3 and 320
    and email_normalized = lower(btrim(email_normalized))
  ),
  role text not null check (role in ('archer', 'head_coach')),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid references auth.users(id) on delete set null,
  status text not null check (status in ('pending', 'accepted', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  constraint organization_invitations_accepted_at_valid check (
    (status = 'accepted' and accepted_at is not null)
    or (status <> 'accepted' and accepted_at is null)
  ),
  constraint organization_invitations_expiry_valid check (expires_at > created_at)
);
create unique index organization_invitations_pending_unique
  on public.organization_invitations (organization_id, email_normalized)
  where status = 'pending';
create index organization_invitations_org_created_idx
  on public.organization_invitations (organization_id, created_at desc);

alter table public.sessions
  add column organization_id uuid references public.organizations(id);
create index sessions_organization_date_idx
  on public.sessions (organization_id, session_date desc)
  where organization_id is not null;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;

revoke all on table public.organizations from public, anon, authenticated;
revoke all on table public.organization_members from public, anon, authenticated;
revoke all on table public.organization_invitations from public, anon, authenticated;
grant select on table public.organizations to authenticated;
grant insert (name, created_by) on table public.organizations to authenticated;
grant select on table public.organization_members to authenticated;
grant select (id, organization_id, email_normalized, role, invited_by, status, created_at, expires_at, accepted_at)
  on table public.organization_invitations to authenticated;

create function private.is_active_organization_member(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create function private.is_active_head_coach(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = 'head_coach'
  );
$$;

revoke all on function private.is_active_organization_member(uuid) from public, anon, authenticated;
revoke all on function private.is_active_head_coach(uuid) from public, anon, authenticated;
grant execute on function private.is_active_organization_member(uuid) to authenticated;
grant execute on function private.is_active_head_coach(uuid) to authenticated;

create policy organizations_select_member on public.organizations
for select to authenticated
using (created_by = (select auth.uid()) or private.is_active_organization_member(id));

create policy organizations_insert_creator on public.organizations
for insert to authenticated
with check (created_by = (select auth.uid()));

create policy organization_members_select_own on public.organization_members
for select to authenticated
using (user_id = (select auth.uid()));

create policy organization_invitations_select_coach on public.organization_invitations
for select to authenticated
using (private.is_active_head_coach(organization_id));

create function private.create_organization_owner_membership()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.organization_members (organization_id, user_id, role, status)
  values (new.id, new.created_by, 'head_coach', 'active');
  return new;
end;
$$;
revoke all on function private.create_organization_owner_membership() from public, anon, authenticated;
create trigger organizations_create_owner_membership
after insert on public.organizations
for each row execute function private.create_organization_owner_membership();

-- Replace rather than add: permissive INSERT policies combine with OR.
alter policy sessions_insert_own on public.sessions
with check (
  user_id = (select auth.uid())
  and (organization_id is null or private.is_active_organization_member(organization_id))
);

create policy sessions_select_coach on public.sessions
for select to authenticated
using (organization_id is not null and private.is_active_head_coach(organization_id));

create policy session_rounds_select_coach on public.session_rounds
for select to authenticated
using (exists (
  select 1 from public.sessions s
  where s.id = session_rounds.session_id
    and s.organization_id is not null
    and private.is_active_head_coach(s.organization_id)
));

create policy session_ends_select_coach on public.session_ends
for select to authenticated
using (exists (
  select 1 from public.session_rounds r
  join public.sessions s on s.id = r.session_id
  where r.id = session_ends.session_round_id
    and s.organization_id is not null
    and private.is_active_head_coach(s.organization_id)
));

create policy arrows_select_coach on public.arrows
for select to authenticated
using (exists (
  select 1 from public.session_ends e
  join public.session_rounds r on r.id = e.session_round_id
  join public.sessions s on s.id = r.session_id
  where e.id = arrows.session_end_id
    and s.organization_id is not null
    and private.is_active_head_coach(s.organization_id)
));

create function private.issue_organization_invitation(
  p_organization_id uuid, p_email text, p_role text
)
returns table (invitation_id uuid, token text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(p_email));
  v_token text;
  v_hash text;
begin
  if (select auth.uid()) is null or not private.is_active_head_coach(p_organization_id) then
    raise exception 'Only an active Head Coach may invite members.';
  end if;
  if p_role is null or p_role not in ('archer', 'head_coach') or v_email is null
     or char_length(v_email) > 320
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid invitation details.';
  end if;
  if exists (
    select 1 from public.organization_members m
    join auth.users u on u.id = m.user_id
    where m.organization_id = p_organization_id and m.status = 'active'
      and lower(btrim(u.email)) = v_email
  ) then
    raise exception 'This user is already an active member.';
  end if;

  update public.organization_invitations i
  set status = 'expired'
  where i.organization_id = p_organization_id and i.email_normalized = v_email
    and i.status = 'pending' and i.expires_at <= now();

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(decode(v_token, 'hex'), 'sha256'), 'hex');
  return query
    insert into public.organization_invitations
      (organization_id, email_normalized, role, token_hash, invited_by, status, expires_at)
    values (p_organization_id, v_email, p_role, v_hash, (select auth.uid()), 'pending', now() + interval '7 days')
    on conflict (organization_id, email_normalized) where status = 'pending'
    do update set role = excluded.role, token_hash = excluded.token_hash,
      invited_by = excluded.invited_by, created_at = now(),
      expires_at = excluded.expires_at
    returning id, v_token, public.organization_invitations.expires_at;
end;
$$;

create function private.accept_organization_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_invitation public.organization_invitations%rowtype;
  v_email text;
  v_confirmed_at timestamptz;
  v_member uuid;
begin
  if (select auth.uid()) is null or p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid invitation.';
  end if;
  select lower(btrim(u.email)), u.email_confirmed_at
    into v_email, v_confirmed_at
  from auth.users u where u.id = (select auth.uid());
  if v_email is null or v_confirmed_at is null then
    raise exception 'A confirmed email is required.';
  end if;
  select * into v_invitation from public.organization_invitations i
  where i.token_hash = encode(extensions.digest(decode(p_token, 'hex'), 'sha256'), 'hex')
  for update;
  if not found or v_invitation.status <> 'pending' or v_invitation.expires_at <= now()
     or v_invitation.email_normalized <> v_email then
    raise exception 'Invitation is invalid, expired, or addressed to another email.';
  end if;

  insert into public.organization_members (organization_id, user_id, role, status, joined_at, left_at)
  values (v_invitation.organization_id, (select auth.uid()), v_invitation.role, 'active', now(), null)
  on conflict (organization_id, user_id) do update
    set role = excluded.role, status = 'active', joined_at = now(), left_at = null
    where public.organization_members.status = 'left'
  returning user_id into v_member;
  if v_member is null then
    raise exception 'Already an active member.';
  end if;
  update public.organization_invitations
  set status = 'accepted', accepted_at = now()
  where id = v_invitation.id;
  return v_invitation.organization_id;
end;
$$;

create function private.cancel_organization_invitation(p_invitation_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_organization_id uuid;
begin
  select i.organization_id into v_organization_id
  from public.organization_invitations i where i.id = p_invitation_id;
  if (select auth.uid()) is null or v_organization_id is null
     or not private.is_active_head_coach(v_organization_id) then
    raise exception 'Only an active Head Coach may cancel an invitation.';
  end if;
  update public.organization_invitations
  set status = 'cancelled'
  where id = p_invitation_id and status = 'pending';
  return found;
end;
$$;

create function private.leave_organization(p_organization_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_role text;
begin
  if (select auth.uid()) is null then raise exception 'Sign in is required.'; end if;
  perform 1 from public.organizations where id = p_organization_id for update;
  select m.role into v_role from public.organization_members m
  where m.organization_id = p_organization_id and m.user_id = (select auth.uid())
    and m.status = 'active' for update;
  if v_role is null then return false; end if;
  if v_role = 'head_coach' and not exists (
    select 1 from public.organization_members m
    where m.organization_id = p_organization_id and m.user_id <> (select auth.uid())
      and m.role = 'head_coach' and m.status = 'active'
  ) then
    raise exception 'The last active Head Coach cannot leave.';
  end if;
  update public.organization_members
  set status = 'left', left_at = now()
  where organization_id = p_organization_id and user_id = (select auth.uid());
  return true;
end;
$$;

revoke all on function private.issue_organization_invitation(uuid, text, text) from public, anon, authenticated;
revoke all on function private.accept_organization_invitation(text) from public, anon, authenticated;
revoke all on function private.cancel_organization_invitation(uuid) from public, anon, authenticated;
revoke all on function private.leave_organization(uuid) from public, anon, authenticated;
grant execute on function private.issue_organization_invitation(uuid, text, text) to authenticated;
grant execute on function private.accept_organization_invitation(text) to authenticated;
grant execute on function private.cancel_organization_invitation(uuid) to authenticated;
grant execute on function private.leave_organization(uuid) to authenticated;

-- Exposed wrappers run as the caller; privileged checks and writes stay private.
create function public.issue_organization_invitation(
  p_organization_id uuid, p_email text, p_role text
)
returns table (invitation_id uuid, token text, expires_at timestamptz)
language sql security invoker set search_path = '' as $$
  select * from private.issue_organization_invitation(p_organization_id, p_email, p_role);
$$;
create function public.accept_organization_invitation(p_token text)
returns uuid language sql security invoker set search_path = '' as $$
  select private.accept_organization_invitation(p_token);
$$;
create function public.cancel_organization_invitation(p_invitation_id uuid)
returns boolean language sql security invoker set search_path = '' as $$
  select private.cancel_organization_invitation(p_invitation_id);
$$;
create function public.leave_organization(p_organization_id uuid)
returns boolean language sql security invoker set search_path = '' as $$
  select private.leave_organization(p_organization_id);
$$;

revoke all on function public.issue_organization_invitation(uuid, text, text) from public, anon, authenticated;
revoke all on function public.accept_organization_invitation(text) from public, anon, authenticated;
revoke all on function public.cancel_organization_invitation(uuid) from public, anon, authenticated;
revoke all on function public.leave_organization(uuid) from public, anon, authenticated;
grant execute on function public.issue_organization_invitation(uuid, text, text) to authenticated;
grant execute on function public.accept_organization_invitation(text) to authenticated;
grant execute on function public.cancel_organization_invitation(uuid) to authenticated;
grant execute on function public.leave_organization(uuid) to authenticated;

commit;
