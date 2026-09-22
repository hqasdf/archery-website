begin;

alter table public.sessions
  add column session_type text not null default 'training',
  add constraint sessions_type_valid check (session_type in ('training', 'competition'));

commit;


