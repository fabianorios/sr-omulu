-- Senhor Omulu — apply once in Supabase SQL Editor (Project → SQL → New query).
-- Keep in sync with migrations/001–005. Server uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).

create extension if not exists "pgcrypto";

create table if not exists public.filhos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  orixa text default '',
  pai_de_cabeca text,
  mae_de_cabeca text,
  guias text[] not null default '{}',
  entidades jsonb not null default '[]'::jsonb,
  data_nascimento date,
  data_entrada date,
  iniciacao date,
  telefone1 text,
  telefone2 text,
  email text,
  endereco_cep text,
  endereco_logradouro text,
  endereco_numero text,
  endereco_complemento text,
  endereco_bairro text,
  endereco_cidade text,
  endereco_uf char(2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists filhos_nome_idx on public.filhos (nome);
create index if not exists filhos_pai_idx on public.filhos (pai_de_cabeca);
create index if not exists filhos_mae_idx on public.filhos (mae_de_cabeca);

create table if not exists public.cobranca_tipos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  categoria text not null check (categoria in ('mensalidade', 'contribuicao', 'outro')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cobrancas (
  id uuid primary key default gen_random_uuid(),
  filho_id text not null,
  tipo_id uuid references public.cobranca_tipos (id) on delete set null,
  tipo_nome text not null,
  categoria text not null default 'outro'
    check (categoria in ('mensalidade', 'contribuicao', 'outro')),
  valor numeric(12, 2) not null check (valor >= 0),
  vencimento date not null,
  dia_vencimento int check (dia_vencimento is null or (dia_vencimento >= 1 and dia_vencimento <= 28)),
  referencia text,
  descricao text,
  pago boolean not null default false,
  pago_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cobrancas_filho_idx on public.cobrancas (filho_id);
create index if not exists cobrancas_vencimento_idx on public.cobrancas (vencimento);

create table if not exists public.obrigacoes (
  id uuid primary key default gen_random_uuid(),
  filho_id text not null,
  tipo_id text not null,
  data date not null,
  ultima_data date,
  itens jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists obrigacoes_filho_idx on public.obrigacoes (filho_id);
create index if not exists obrigacoes_data_idx on public.obrigacoes (data);

create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  role text not null check (role in ('admin', 'medium')),
  email text,
  cpf text,
  celular text,
  password_hash text not null,
  filho_id text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usuarios_identificador_chk check (
    coalesce(nullif(trim(email), ''), nullif(trim(cpf), ''), nullif(trim(celular), '')) is not null
  )
);

create unique index if not exists usuarios_email_uidx
  on public.usuarios (lower(email)) where email is not null and trim(email) <> '';
create unique index if not exists usuarios_cpf_uidx
  on public.usuarios (cpf) where cpf is not null and trim(cpf) <> '';
create unique index if not exists usuarios_celular_uidx
  on public.usuarios (celular) where celular is not null and trim(celular) <> '';

create table if not exists public.sessoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessoes_usuario_idx on public.sessoes (usuario_id);
create index if not exists sessoes_expires_idx on public.sessoes (expires_at);

alter table public.filhos enable row level security;
alter table public.cobranca_tipos enable row level security;
alter table public.cobrancas enable row level security;
alter table public.obrigacoes enable row level security;
alter table public.usuarios enable row level security;
alter table public.sessoes enable row level security;

-- No anon/authenticated policies: browser never talks to PostgREST directly.
-- Server uses the service role key (bypasses RLS) via app_sql / supabase-js.

-- Parameterized SQL bridge (bound via EXECUTE … USING — no string substitution).
-- Re-run this function definition if you already applied an older schema.sql.
create or replace function public.app_sql(query text, params jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n int := coalesce(jsonb_array_length(params), 0);
  result jsonb;
  trimmed text := ltrim(query);
  returns_rows boolean;
  p text[] := array[]::text[];
  elem jsonb;
begin
  if trimmed !~* '^(select|insert|update|delete|with)\b' then
    raise exception 'app_sql: disallowed statement';
  end if;
  if n > 24 then
    raise exception 'app_sql: too many parameters';
  end if;

  for elem in select value from jsonb_array_elements(params) as t(value)
  loop
    if elem is null or jsonb_typeof(elem) = 'null' then
      p := p || array[null::text];
    elsif jsonb_typeof(elem) = 'string' then
      p := p || array[elem #>> '{}'];
    elsif jsonb_typeof(elem) = 'number' then
      p := p || array[trim(both '"' from elem::text)];
    elsif jsonb_typeof(elem) = 'boolean' then
      p := p || array[elem::text];
    else
      -- object/array JSON passed through for ::jsonb casts in app queries
      p := p || array[elem::text];
    end if;
  end loop;

  returns_rows := not (
    trimmed ~* '^(insert|update|delete)\b' and trimmed !~* '\yreturning\y'
  );

  if not returns_rows then
    case n
      when 0 then execute query;
      when 1 then execute query using p[1];
      when 2 then execute query using p[1], p[2];
      when 3 then execute query using p[1], p[2], p[3];
      when 4 then execute query using p[1], p[2], p[3], p[4];
      when 5 then execute query using p[1], p[2], p[3], p[4], p[5];
      when 6 then execute query using p[1], p[2], p[3], p[4], p[5], p[6];
      when 7 then execute query using p[1], p[2], p[3], p[4], p[5], p[6], p[7];
      when 8 then execute query using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8];
      when 9 then execute query using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9];
      when 10 then execute query using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10];
      when 11 then execute query using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11];
      when 12 then execute query using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12];
      when 13 then execute query using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13];
      when 14 then execute query using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14];
      when 15 then execute query using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15];
      when 16 then execute query using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15], p[16];
      when 17 then execute query using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15], p[16], p[17];
      when 18 then execute query using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15], p[16], p[17], p[18];
      when 19 then execute query using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15], p[16], p[17], p[18], p[19];
      when 20 then execute query using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15], p[16], p[17], p[18], p[19], p[20];
      when 21 then execute query using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15], p[16], p[17], p[18], p[19], p[20], p[21];
      when 22 then execute query using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15], p[16], p[17], p[18], p[19], p[20], p[21], p[22];
      when 23 then execute query using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15], p[16], p[17], p[18], p[19], p[20], p[21], p[22], p[23];
      when 24 then execute query using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15], p[16], p[17], p[18], p[19], p[20], p[21], p[22], p[23], p[24];
      else raise exception 'app_sql: too many parameters';
    end case;
    return '[]'::jsonb;
  end if;

  case n
      when 0 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) into result;
      when 1 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1] into result;
      when 2 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2] into result;
      when 3 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3] into result;
      when 4 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4] into result;
      when 5 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5] into result;
      when 6 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6] into result;
      when 7 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6], p[7] into result;
      when 8 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8] into result;
      when 9 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9] into result;
      when 10 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10] into result;
      when 11 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11] into result;
      when 12 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12] into result;
      when 13 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13] into result;
      when 14 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14] into result;
      when 15 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15] into result;
      when 16 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15], p[16] into result;
      when 17 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15], p[16], p[17] into result;
      when 18 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15], p[16], p[17], p[18] into result;
      when 19 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15], p[16], p[17], p[18], p[19] into result;
      when 20 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15], p[16], p[17], p[18], p[19], p[20] into result;
      when 21 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15], p[16], p[17], p[18], p[19], p[20], p[21] into result;
      when 22 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15], p[16], p[17], p[18], p[19], p[20], p[21], p[22] into result;
      when 23 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15], p[16], p[17], p[18], p[19], p[20], p[21], p[22], p[23] into result;
      when 24 then
        execute format(
          'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
          query
        ) using p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10], p[11], p[12], p[13], p[14], p[15], p[16], p[17], p[18], p[19], p[20], p[21], p[22], p[23], p[24] into result;
    else raise exception 'app_sql: too many parameters';
  end case;

  return coalesce(result, '[]'::jsonb);
end;
$$;

revoke all on function public.app_sql(text, jsonb) from public;
revoke all on function public.app_sql(text, jsonb) from anon, authenticated;
grant execute on function public.app_sql(text, jsonb) to service_role;
