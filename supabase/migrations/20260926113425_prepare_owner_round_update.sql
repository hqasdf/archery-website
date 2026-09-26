-- REVIEW ONLY. Do not apply without separate approval.
begin;

create function private.update_owned_round_settings(
  p_round_id uuid, p_name text, p_division text,
  p_distance_metres integer, p_face_diameter_cm integer, p_planned_ends integer
)
returns table (round_id uuid, planned_ends smallint)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_name text := pg_catalog.btrim(p_name);
  v_previous_ends smallint;
begin
  if v_user_id is null then
    raise exception 'Sign in is required.' using errcode = '42501';
  end if;

  -- The Round row serializes simultaneous configuration changes to this Round.
  -- Owner verification is explicit because this function uses SECURITY DEFINER.
  select r.planned_ends into v_previous_ends
  from public.session_rounds r
  join public.sessions s on s.id = r.session_id
  where r.id = p_round_id and s.user_id = v_user_id
  for update of r;
  if not found then
    raise exception 'The Round is not owned by the signed-in user.' using errcode = '42501';
  end if;

  if v_name is null or pg_catalog.char_length(v_name) not between 1 and 80
    or p_division is null or p_division not in ('Recurve', 'Compound', 'Barebow', 'Other')
    or p_distance_metres is null or p_distance_metres not between 1 and 32767
    or p_face_diameter_cm is null or p_face_diameter_cm not between 1 and 32767
    or p_planned_ends is null or p_planned_ends not between v_previous_ends and 32767 then
    raise exception 'Invalid Round settings or planned-End decrease.' using errcode = '22023';
  end if;

  update public.session_rounds r
  set name = v_name, division = p_division,
      distance_metres = p_distance_metres,
      face_diameter_cm = p_face_diameter_cm,
      planned_ends = p_planned_ends
  where r.id = p_round_id;

  insert into public.session_ends (session_round_id, end_number)
  select p_round_id, generated.end_number
  from pg_catalog.generate_series(v_previous_ends + 1, p_planned_ends) as generated(end_number);

  return query select p_round_id, p_planned_ends::smallint;
end;
$$;

revoke all on function private.update_owned_round_settings(uuid, text, text, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function private.update_owned_round_settings(uuid, text, text, integer, integer, integer)
  to authenticated;

create function public.update_owned_round_settings(
  p_round_id uuid, p_name text, p_division text,
  p_distance_metres integer, p_face_diameter_cm integer, p_planned_ends integer
)
returns table (round_id uuid, planned_ends smallint)
language sql
volatile
security invoker
set search_path = ''
as $$
  select updated.round_id, updated.planned_ends
  from private.update_owned_round_settings(
    p_round_id, p_name, p_division,
    p_distance_metres, p_face_diameter_cm, p_planned_ends
  ) as updated;
$$;

revoke all on function public.update_owned_round_settings(uuid, text, text, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.update_owned_round_settings(uuid, text, text, integer, integer, integer)
  to authenticated;

commit;
