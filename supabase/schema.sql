-- Kept as a Supabase-equivalent reference for a future migration.
-- Active schema for Cursor Postgres lives in migrations/001_create_filhos.sql
-- (same columns). To move later: create a Supabase project and run this file.

create extension if not exists "pgcrypto";

create table if not exists public.filhos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  orixa text not null,
  pai_de_cabeca text,
  mae_de_cabeca text,
  guias text[] not null default '{}',
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
create index if not exists filhos_orixa_idx on public.filhos (orixa);

alter table public.filhos enable row level security;
