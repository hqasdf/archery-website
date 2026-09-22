begin;

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  session_date date not null,
  created_at timestamptz not null default now()
);
create index sessions_user_date_idx on public.sessions (user_id, session_date desc, created_at desc);

create table public.session_rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  round_number smallint not null,
  name text not null,
  division text not null,
  distance_metres smallint not null,
  face_diameter_cm smallint not null,
  face_type text not null,
  planned_ends smallint not null,
  arrows_per_end smallint not null,
  created_at timestamptz not null default now(),
  constraint session_rounds_number_unique unique (session_id, round_number)
);

create table public.session_ends (
  id uuid primary key default gen_random_uuid(),
  session_round_id uuid not null references public.session_rounds(id) on delete cascade,
  end_number smallint not null,
  created_at timestamptz not null default now(),
  constraint session_ends_number_unique unique (session_round_id, end_number)
);

create table public.arrows (
  id uuid primary key default gen_random_uuid(),
  session_end_id uuid not null references public.session_ends(id) on delete cascade,
  arrow_number smallint not null,
  score_points smallint not null,
  is_x boolean not null default false,
  plot_x double precision,
  plot_y double precision,
  face_index smallint,
  created_at timestamptz not null default now(),
  constraint arrows_score_valid check (score_points between 0 and 10),
  constraint arrows_x_valid check (not is_x or score_points = 10),
  constraint arrows_plot_pair_valid check ((plot_x is null and plot_y is null) or (plot_x is not null and plot_y is not null)),
  constraint arrows_face_index_valid check (face_index is null or (face_index between 0 and 2 and plot_x is not null and plot_y is not null)),
  constraint arrows_number_unique unique (session_end_id, arrow_number)
);

alter table public.sessions enable row level security;
alter table public.session_rounds enable row level security;
alter table public.session_ends enable row level security;
alter table public.arrows enable row level security;

revoke all on table public.sessions from public, anon, authenticated;
revoke all on table public.session_rounds from public, anon, authenticated;
revoke all on table public.session_ends from public, anon, authenticated;
revoke all on table public.arrows from public, anon, authenticated;

grant select, insert, delete on table public.sessions to authenticated;
grant select, insert, delete on table public.session_rounds to authenticated;
grant select, insert on table public.session_ends to authenticated;
grant select, insert, update, delete on table public.arrows to authenticated;

create policy sessions_select_own on public.sessions for select to authenticated using (user_id = (select auth.uid()));
create policy sessions_insert_own on public.sessions for insert to authenticated with check (user_id = (select auth.uid()));
create policy sessions_delete_own on public.sessions for delete to authenticated using (user_id = (select auth.uid()));

create policy session_rounds_select_own on public.session_rounds for select to authenticated using (
  exists (select 1 from public.sessions where sessions.id = session_rounds.session_id and sessions.user_id = (select auth.uid()))
);
create policy session_rounds_insert_own on public.session_rounds for insert to authenticated with check (
  exists (select 1 from public.sessions where sessions.id = session_rounds.session_id and sessions.user_id = (select auth.uid()))
);
create policy session_rounds_delete_own on public.session_rounds for delete to authenticated using (
  exists (select 1 from public.sessions where sessions.id = session_rounds.session_id and sessions.user_id = (select auth.uid()))
);

create policy session_ends_select_own on public.session_ends for select to authenticated using (
  exists (select 1 from public.session_rounds join public.sessions on sessions.id = session_rounds.session_id where session_rounds.id = session_ends.session_round_id and sessions.user_id = (select auth.uid()))
);
create policy session_ends_insert_own on public.session_ends for insert to authenticated with check (
  exists (select 1 from public.session_rounds join public.sessions on sessions.id = session_rounds.session_id where session_rounds.id = session_ends.session_round_id and sessions.user_id = (select auth.uid()))
);

create policy arrows_select_own on public.arrows for select to authenticated using (
  exists (select 1 from public.session_ends join public.session_rounds on session_rounds.id = session_ends.session_round_id join public.sessions on sessions.id = session_rounds.session_id where session_ends.id = arrows.session_end_id and sessions.user_id = (select auth.uid()))
);
create policy arrows_insert_own on public.arrows for insert to authenticated with check (
  exists (select 1 from public.session_ends join public.session_rounds on session_rounds.id = session_ends.session_round_id join public.sessions on sessions.id = session_rounds.session_id where session_ends.id = arrows.session_end_id and sessions.user_id = (select auth.uid()))
);
create policy arrows_update_own on public.arrows for update to authenticated using (
  exists (select 1 from public.session_ends join public.session_rounds on session_rounds.id = session_ends.session_round_id join public.sessions on sessions.id = session_rounds.session_id where session_ends.id = arrows.session_end_id and sessions.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.session_ends join public.session_rounds on session_rounds.id = session_ends.session_round_id join public.sessions on sessions.id = session_rounds.session_id where session_ends.id = arrows.session_end_id and sessions.user_id = (select auth.uid()))
);
create policy arrows_delete_own on public.arrows for delete to authenticated using (
  exists (select 1 from public.session_ends join public.session_rounds on session_rounds.id = session_ends.session_round_id join public.sessions on sessions.id = session_rounds.session_id where session_ends.id = arrows.session_end_id and sessions.user_id = (select auth.uid()))
);

commit;
