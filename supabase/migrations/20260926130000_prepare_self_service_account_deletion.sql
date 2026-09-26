-- REVIEW ONLY. Do not apply without separate approval and database fixture validation.
-- A single Auth-row deletion uses the existing FK cascades for the user's data.
begin;

create function private.delete_own_account()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_deleted integer;
begin
  if v_user_id is null then
    raise exception 'Sign in is required.' using errcode = '42501';
  end if;

  delete from auth.users where id = v_user_id;
  get diagnostics v_deleted = row_count;
  if v_deleted <> 1 then
    raise exception 'Account no longer exists.' using errcode = '42501';
  end if;
  return true;
end;
$$;

revoke all on function private.delete_own_account() from public, anon, authenticated;
grant execute on function private.delete_own_account() to authenticated;

create function public.delete_own_account()
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.delete_own_account();
$$;

revoke all on function public.delete_own_account() from public, anon, authenticated;
grant execute on function public.delete_own_account() to authenticated;

commit;
