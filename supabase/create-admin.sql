-- Additive: run in SQL Editor if pages-client.sql was already applied without create_admin.
-- Idempotent (create or replace). Requires current_app_role() from pages-client.sql.
-- Never expose service_role to the browser.

create or replace function public.create_admin(
  p_email text,
  p_nome text,
  p_auth_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row_usuarios public.usuarios;
  email_norm text;
  auth_id uuid;
  auth_email text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'admin_required';
  end if;
  if p_nome is null or length(trim(p_nome)) < 1 then
    raise exception 'nome_required';
  end if;
  if p_email is null or position('@' in trim(p_email)) < 1 then
    raise exception 'email_required';
  end if;

  email_norm := lower(trim(p_email));
  auth_id := p_auth_user_id;

  if auth_id is null then
    select u.id into auth_id
    from auth.users u
    where lower(u.email) = email_norm
    limit 1;
  end if;

  if auth_id is null then
    raise exception 'auth_user_not_found';
  end if;

  select lower(u.email) into auth_email
  from auth.users u
  where u.id = auth_id;

  if auth_email is null then
    raise exception 'auth_user_not_found';
  end if;
  if auth_email is distinct from email_norm then
    raise exception 'email_mismatch';
  end if;

  if exists (
    select 1 from public.usuarios u
    where u.auth_user_id = auth_id or lower(u.email) = email_norm
  ) then
    raise exception 'user_already_exists';
  end if;

  insert into public.usuarios (
    auth_user_id, nome, role, email, password_hash, ativo
  ) values (
    auth_id, trim(p_nome), 'admin', email_norm, '', true
  )
  returning * into row_usuarios;

  return jsonb_build_object(
    'id', row_usuarios.id,
    'nome', row_usuarios.nome,
    'role', row_usuarios.role,
    'email', row_usuarios.email,
    'cpf', row_usuarios.cpf,
    'celular', row_usuarios.celular,
    'filhoId', row_usuarios.filho_id
  );
end;
$$;

grant execute on function public.create_admin(text, text, uuid) to authenticated;
