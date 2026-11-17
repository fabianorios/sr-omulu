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

-- Bridge so the Node sql() helper can run parameterized statements over PostgREST RPC.
create or replace function public.app_sql(query text, params jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q text := query;
  n int := coalesce(jsonb_array_length(params), 0);
  i int;
  val jsonb;
  lit text;
  result jsonb;
  trimmed text := ltrim(query);
begin
  if trimmed !~* '^(select|insert|update|delete|with)\b' then
    raise exception 'app_sql: disallowed statement';
  end if;

  -- Replace $N placeholders from highest index so $10 is not eaten by $1.
  for i in reverse 0..greatest(n - 1, 0) loop
    exit when n = 0;
    val := params -> i;
    if val is null or jsonb_typeof(val) = 'null' then
      lit := 'NULL';
    elsif jsonb_typeof(val) = 'number' then
      lit := trim(both '"' from val::text);
    elsif jsonb_typeof(val) = 'boolean' then
      lit := val::text;
    else
      lit := quote_literal(val #>> '{}');
    end if;
    q := regexp_replace(q, '\$' || (i + 1)::text || '(?!\d)', lit, 'g');
  end loop;

  if trimmed ~* '^(insert|update|delete)\b' and trimmed !~* '\yreturning\y' then
    execute q;
    return '[]'::jsonb;
  end if;

  execute format(
    'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (%s) as t',
    q
  ) into result;

  return result;
end;
$$;

revoke all on function public.app_sql(text, jsonb) from public;
revoke all on function public.app_sql(text, jsonb) from anon, authenticated;
grant execute on function public.app_sql(text, jsonb) to service_role;
