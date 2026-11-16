-- Supabase-equivalent reference (keep in sync with migrations/).
-- Active Cursor Postgres schema: migrations/001 + 002 + 003.

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

alter table public.filhos enable row level security;
