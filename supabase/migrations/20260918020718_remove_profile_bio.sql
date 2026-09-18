begin;

alter table public.profiles
  drop column bio;

commit;
