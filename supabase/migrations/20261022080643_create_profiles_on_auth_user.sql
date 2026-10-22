create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    role
  )
  values (
    new.id,
    new.email,
    'user'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

  -------建立新的 Supabase 環境時，才讓 migrations 從空資料庫依序執行。
  -------先把 migration 檔放進 VS Code / Git
  -------先不要 db push