-- Tenda Senhor Omulu — schema de filhos (rode no SQL Editor do Supabase)
-- Projeto: crie um projeto Postgres no Supabase e cole este script.

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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists filhos_set_updated_at on public.filhos;
create trigger filhos_set_updated_at
before update on public.filhos
for each row execute function public.set_updated_at();

-- Acesso apenas via service role no servidor do app (não exponha a service role no browser).
alter table public.filhos enable row level security;

-- Sem policies para anon/authenticated: o app usa SUPABASE_SERVICE_ROLE_KEY só no backend.
comment on table public.filhos is
  'Cadastro de filhos da casa. Escrita/leitura via API server-side do app Cursor.';
