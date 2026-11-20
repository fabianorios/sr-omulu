-- Additive: full admin user CRUD for Cloudflare Pages (anon + Auth).
-- Run in SQL Editor if pages-client.sql was already applied without these RPCs.
-- Idempotent (create or replace). Requires current_app_role() from pages-client.sql.
-- Never expose service_role to the browser.

create or replace function public.usuario_to_jsonb(row_usuarios public.usuarios)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', row_usuarios.id,
    'nome', row_usuarios.nome,
    'role', row_usuarios.role,
    'email', row_usuarios.email,
    'cpf', row_usuarios.cpf,
    'celular', row_usuarios.celular,
    'filhoId', row_usuarios.filho_id,
    'ativo', row_usuarios.ativo
  );
$$;

-- Create admin or medium: Auth user already created via ephemeral anon signUp.
create or replace function public.create_app_user(
  p_email text,
  p_nome text,
  p_role text,
  p_auth_user_id uuid default null,
  p_cpf text default null,
  p_celular text default null,
  p_filho_id text default null
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
  role_norm text;
  cpf_norm text;
  cel_norm text;
  filho_norm text;
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

  role_norm := lower(trim(p_role));
  if role_norm is distinct from 'admin' and role_norm is distinct from 'medium' then
    raise exception 'invalid_role';
  end if;

  email_norm := lower(trim(p_email));
  cpf_norm := nullif(regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g'), '');
  cel_norm := nullif(regexp_replace(coalesce(p_celular, ''), '\D', '', 'g'), '');
  filho_norm := nullif(trim(coalesce(p_filho_id, '')), '');

  if role_norm = 'medium' and filho_norm is null then
    raise exception 'medium_requires_filho';
  end if;
  if role_norm = 'admin' then
    filho_norm := null;
  end if;

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

  if cpf_norm is not null and exists (
    select 1 from public.usuarios u where u.cpf = cpf_norm
  ) then
    raise exception 'cpf_em_uso';
  end if;
  if cel_norm is not null and exists (
    select 1 from public.usuarios u where u.celular = cel_norm
  ) then
    raise exception 'celular_em_uso';
  end if;

  insert into public.usuarios (
    auth_user_id, nome, role, email, cpf, celular, filho_id, password_hash, ativo
  ) values (
    auth_id, trim(p_nome), role_norm, email_norm, cpf_norm, cel_norm, filho_norm, '', true
  )
  returning * into row_usuarios;

  return public.usuario_to_jsonb(row_usuarios);
end;
$$;

grant execute on function public.create_app_user(text, text, text, uuid, text, text, text)
  to authenticated;

-- Back-compat wrapper (TER-21): still creates role=admin only.
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
begin
  return public.create_app_user(
    p_email, p_nome, 'admin', p_auth_user_id, null, null, null
  );
end;
$$;

grant execute on function public.create_admin(text, text, uuid) to authenticated;

-- Edit nome / role / ativo / cpf / celular / filho_id (soft deactivate via p_ativo=false).
create or replace function public.update_app_user(
  p_id uuid,
  p_nome text default null,
  p_role text default null,
  p_ativo boolean default null,
  p_cpf text default null,
  p_celular text default null,
  p_filho_id text default null,
  p_clear_cpf boolean default false,
  p_clear_celular boolean default false,
  p_clear_filho boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  row_usuarios public.usuarios;
  role_norm text;
  cpf_norm text;
  cel_norm text;
  filho_norm text;
  next_role text;
  next_ativo boolean;
  active_admins int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'admin_required';
  end if;
  if p_id is null then
    raise exception 'missing_id';
  end if;

  select * into row_usuarios
  from public.usuarios u
  where u.id = p_id
  for update;

  if not found then
    raise exception 'not_found';
  end if;

  next_role := row_usuarios.role;
  next_ativo := row_usuarios.ativo;

  if p_nome is not null then
    if length(trim(p_nome)) < 1 then
      raise exception 'nome_required';
    end if;
    row_usuarios.nome := trim(p_nome);
  end if;

  if p_role is not null then
    role_norm := lower(trim(p_role));
    if role_norm is distinct from 'admin' and role_norm is distinct from 'medium' then
      raise exception 'invalid_role';
    end if;
    next_role := role_norm;
  end if;

  if p_ativo is not null then
    next_ativo := p_ativo;
  end if;

  -- Never leave the app without an active admin.
  if row_usuarios.role = 'admin' and row_usuarios.ativo = true
     and (next_role is distinct from 'admin' or next_ativo is distinct from true) then
    select count(*)::int into active_admins
    from public.usuarios u
    where u.role = 'admin' and u.ativo = true and u.id is distinct from p_id;
    if coalesce(active_admins, 0) < 1 then
      raise exception 'last_admin';
    end if;
  end if;

  row_usuarios.role := next_role;
  row_usuarios.ativo := next_ativo;

  if p_clear_cpf then
    row_usuarios.cpf := null;
  elsif p_cpf is not null then
    cpf_norm := nullif(regexp_replace(p_cpf, '\D', '', 'g'), '');
    if cpf_norm is not null and exists (
      select 1 from public.usuarios u
      where u.cpf = cpf_norm and u.id is distinct from p_id
    ) then
      raise exception 'cpf_em_uso';
    end if;
    row_usuarios.cpf := cpf_norm;
  end if;

  if p_clear_celular then
    row_usuarios.celular := null;
  elsif p_celular is not null then
    cel_norm := nullif(regexp_replace(p_celular, '\D', '', 'g'), '');
    if cel_norm is not null and exists (
      select 1 from public.usuarios u
      where u.celular = cel_norm and u.id is distinct from p_id
    ) then
      raise exception 'celular_em_uso';
    end if;
    row_usuarios.celular := cel_norm;
  end if;

  if p_clear_filho then
    filho_norm := null;
  elsif p_filho_id is not null then
    filho_norm := nullif(trim(p_filho_id), '');
  else
    filho_norm := row_usuarios.filho_id;
  end if;

  if next_role = 'medium' and filho_norm is null then
    raise exception 'medium_requires_filho';
  end if;
  if next_role = 'admin' then
    filho_norm := null;
  end if;
  row_usuarios.filho_id := filho_norm;

  update public.usuarios u
  set
    nome = row_usuarios.nome,
    role = row_usuarios.role,
    ativo = row_usuarios.ativo,
    cpf = row_usuarios.cpf,
    celular = row_usuarios.celular,
    filho_id = row_usuarios.filho_id,
    updated_at = now()
  where u.id = p_id
  returning * into row_usuarios;

  return public.usuario_to_jsonb(row_usuarios);
end;
$$;

grant execute on function public.update_app_user(
  uuid, text, text, boolean, text, text, text, boolean, boolean, boolean
) to authenticated;
