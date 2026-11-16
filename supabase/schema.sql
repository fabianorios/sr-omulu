-- Supabase-equivalent reference (keep in sync with migrations/).
-- Active Cursor Postgres schema: migrations/001–004.

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

alter table public.filhos enable row level security;
alter table public.cobranca_tipos enable row level security;
alter table public.cobrancas enable row level security;
alter table public.obrigacoes enable row level security;
