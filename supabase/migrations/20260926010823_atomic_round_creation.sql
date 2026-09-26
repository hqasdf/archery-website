begin;

create function private.create_round_with_ends(
  p_session_id uuid,
  p_name text,
  p_division text,
  p_distance_metres integer,
  p_face_diameter_cm integer,
  p_face_type text,
  p_planned_ends integer,
  p_arrows_per_end integer
)
returns table (round_id uuid, round_number smallint)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_name text := pg_catalog.btrim(p_name);
  v_round_id uuid;
  v_round_number integer;
begin
  if v_user_id is null then
    raise exception 'Sign in is required.' using errcode = '42501';
  end if;

  perform 1
  from public.sessions s
  where s.id = p_session_id and s.user_id = v_user_id
  for update;
  if not found then
    raise exception 'The Session is not owned by the signed-in user.' using errcode = '42501';
  end if;

  if v_name is null or pg_catalog.char_length(v_name) not between 1 and 80
    or p_division is null or p_division not in ('Recurve', 'Compound', 'Barebow', 'Other')
    or p_face_type is null or p_face_type not in ('full_face', 'six_ring', 'triple_face')
    or p_distance_metres is null or p_distance_metres not between 1 and 32767
    or p_face_diameter_cm is null or p_face_diameter_cm not between 1 and 32767
    or p_planned_ends is null or p_planned_ends not between 1 and 32767
    or p_arrows_per_end is null or p_arrows_per_end not between 1 and 32767 then
    raise exception 'Invalid Round configuration.' using errcode = '22023';
  end if;

  select coalesce(pg_catalog.max(r.round_number), 0) + 1
  into v_round_number
  from public.session_rounds r
  where r.session_id = p_session_id;

  if v_round_number > 32767 then
    raise exception 'This Session has reached its Round number limit.' using errcode = '22023';
  end if;

  insert into public.session_rounds (
    session_id, round_number, name, division, distance_metres,
    face_diameter_cm, face_type, planned_ends, arrows_per_end
  ) values (
    p_session_id, v_round_number, v_name, p_division, p_distance_metres,
    p_face_diameter_cm, p_face_type, p_planned_ends, p_arrows_per_end
  ) returning id into v_round_id;

  insert into public.session_ends (session_round_id, end_number)
  select v_round_id, generated.end_number
  from pg_catalog.generate_series(1, p_planned_ends) as generated(end_number);

  return query select v_round_id, v_round_number::smallint;
end;
$$;

revoke all on function private.create_round_with_ends(uuid, text, text, integer, integer, text, integer, integer)
  from public, anon, authenticated;
grant execute on function private.create_round_with_ends(uuid, text, text, integer, integer, text, integer, integer)
  to authenticated;

create function public.create_round_with_ends(
  p_session_id uuid,
  p_name text,
  p_division text,
  p_distance_metres integer,
  p_face_diameter_cm integer,
  p_face_type text,
  p_planned_ends integer,
  p_arrows_per_end integer
)
returns table (round_id uuid, round_number smallint)
language sql
volatile
security invoker
set search_path = ''
as $$
  select created.round_id, created.round_number
  from private.create_round_with_ends(
    p_session_id, p_name, p_division, p_distance_metres,
    p_face_diameter_cm, p_face_type, p_planned_ends, p_arrows_per_end
  ) as created;
$$;

revoke all on function public.create_round_with_ends(uuid, text, text, integer, integer, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.create_round_with_ends(uuid, text, text, integer, integer, text, integer, integer)
  to authenticated;

commit;
