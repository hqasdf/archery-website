begin;

alter table public.sessions
  add column arrow_count integer not null default 0,
  add constraint sessions_arrow_count_nonnegative check (arrow_count >= 0);

grant update (arrow_count) on table public.sessions to authenticated;

create policy sessions_update_own
on public.sessions
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

commit;


