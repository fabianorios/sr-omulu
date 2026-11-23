-- Tipos de pagamento (cobrança) — seed idempotente.
-- A tabela e o RLS já existem em schema.sql + pages-client.sql.
-- Rode no SQL Editor do Supabase se a lista de tipos estiver vazia
-- (não apaga nem altera tipos já cadastrados).

create table if not exists public.cobranca_tipos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  categoria text not null check (categoria in ('mensalidade', 'contribuicao', 'outro')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.cobranca_tipos enable row level security;

insert into public.cobranca_tipos (nome, categoria)
values
  ('Mensalidade do filho', 'mensalidade'),
  ('Contribuição festiva', 'contribuicao'),
  ('Contribuição de obrigação', 'contribuicao'),
  ('Outra contribuição', 'outro')
on conflict (nome) do nothing;
