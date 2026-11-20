-- Senhor Omulu — Cloudflare Pages (browser) access via Supabase Auth + anon key.
-- Apply AFTER supabase/schema.sql in the SQL Editor.
-- Never expose the service_role key to the browser / VITE_*.

-- Supabase installs pgcrypto in schema `extensions` (not public).
-- Without this, set_bootstrap_secret fails: gen_salt does not exist.
create extension if not exists pgcrypto with schema extensions;

-- Link app users to Supabase Auth
alter table public.usuarios
  add column if not exists auth_user_id uuid unique references auth.users (id) on delete cascade;

alter table public.usuarios
  alter column password_hash set default '';

-- Allow Auth-backed rows (password lives in auth.users)
do $$
begin
  alter table public.usuarios alter column password_hash drop not null;
exception
  when others then null;
end $$;

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Run once in SQL Editor (replace the placeholder; do not commit real secrets):
--   select public.set_bootstrap_secret('<BOOTSTRAP_SECRET>');
create or replace function public.set_bootstrap_secret(raw text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if raw is null or length(trim(raw)) < 8 then
    raise exception 'bootstrap_secret_too_short';
  end if;
  insert into public.app_settings (key, value)
  values (
    'bootstrap_secret_hash',
    extensions.crypt(trim(raw), extensions.gen_salt('bf'))
  )
  on conflict (key) do update
    set value = excluded.value, updated_at = now();
end;
$$;

revoke all on function public.set_bootstrap_secret(text) from public, anon, authenticated;
-- SQL Editor (postgres/supabase_admin) can still call it.

create or replace function public.needs_bootstrap()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.usuarios where role = 'admin'
  );
$$;

grant execute on function public.needs_bootstrap() to anon, authenticated;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from public.usuarios u
  where u.auth_user_id = auth.uid() and u.ativo = true
  limit 1;
$$;

grant execute on function public.current_app_role() to authenticated;

create or replace function public.current_filho_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.filho_id
  from public.usuarios u
  where u.auth_user_id = auth.uid() and u.ativo = true
  limit 1;
$$;

grant execute on function public.current_filho_id() to authenticated;

create or replace function public.claim_bootstrap(install_code text, p_nome text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  expected text;
  email_val text;
  row_usuarios public.usuarios;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if exists (select 1 from public.usuarios where role = 'admin') then
    raise exception 'bootstrap_closed';
  end if;
  select s.value into expected
  from public.app_settings s
  where s.key = 'bootstrap_secret_hash';
  if expected is null then
    raise exception 'bootstrap_unavailable';
  end if;
  if install_code is null
     or extensions.crypt(trim(install_code), expected) is distinct from expected then
    raise exception 'invalid_bootstrap_secret';
  end if;
  if p_nome is null or length(trim(p_nome)) < 1 then
    raise exception 'nome_required';
  end if;

  select u.email into email_val from auth.users u where u.id = uid;

  insert into public.usuarios (
    auth_user_id, nome, role, email, password_hash, ativo
  ) values (
    uid, trim(p_nome), 'admin', email_val, '', true
  )
  on conflict (auth_user_id) do update
    set nome = excluded.nome,
        role = 'admin',
        email = excluded.email,
        ativo = true,
        updated_at = now()
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

grant execute on function public.claim_bootstrap(text, text) to authenticated;

create or replace function public.my_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  row_usuarios public.usuarios;
begin
  if auth.uid() is null then
    return null;
  end if;
  select * into row_usuarios
  from public.usuarios u
  where u.auth_user_id = auth.uid() and u.ativo = true
  limit 1;
  if not found then
    return null;
  end if;
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

grant execute on function public.my_profile() to authenticated;

-- RLS policies for authenticated browser clients (anon: none on tables)
drop policy if exists usuarios_select_own_or_admin on public.usuarios;
create policy usuarios_select_own_or_admin on public.usuarios
  for select to authenticated
  using (
    auth_user_id = auth.uid()
    or public.current_app_role() = 'admin'
  );

drop policy if exists usuarios_update_admin on public.usuarios;
create policy usuarios_update_admin on public.usuarios
  for update to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

drop policy if exists filhos_select_scoped on public.filhos;
create policy filhos_select_scoped on public.filhos
  for select to authenticated
  using (
    public.current_app_role() = 'admin'
    or id::text = public.current_filho_id()
  );

drop policy if exists filhos_write_admin on public.filhos;
create policy filhos_write_admin on public.filhos
  for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

drop policy if exists obrigacoes_select_scoped on public.obrigacoes;
create policy obrigacoes_select_scoped on public.obrigacoes
  for select to authenticated
  using (
    public.current_app_role() = 'admin'
    or filho_id = public.current_filho_id()
  );

drop policy if exists obrigacoes_write_admin on public.obrigacoes;
create policy obrigacoes_write_admin on public.obrigacoes
  for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

drop policy if exists cobrancas_select_scoped on public.cobrancas;
create policy cobrancas_select_scoped on public.cobrancas
  for select to authenticated
  using (
    public.current_app_role() = 'admin'
    or filho_id = public.current_filho_id()
  );

drop policy if exists cobrancas_write_admin on public.cobrancas;
create policy cobrancas_write_admin on public.cobrancas
  for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

drop policy if exists cobranca_tipos_select_auth on public.cobranca_tipos;
create policy cobranca_tipos_select_auth on public.cobranca_tipos
  for select to authenticated
  using (true);

drop policy if exists cobranca_tipos_write_admin on public.cobranca_tipos;
create policy cobranca_tipos_write_admin on public.cobranca_tipos
  for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

-- sessoes stay server-only (no policies for anon/authenticated)
