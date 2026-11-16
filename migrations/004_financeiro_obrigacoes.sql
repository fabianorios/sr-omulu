-- Agenda financeira + itens de obrigações

create table if not exists cobranca_tipos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  categoria text not null check (categoria in ('mensalidade', 'contribuicao', 'outro')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

insert into cobranca_tipos (nome, categoria)
values
  ('Mensalidade do filho', 'mensalidade'),
  ('Contribuição festiva', 'contribuicao'),
  ('Contribuição de obrigação', 'contribuicao'),
  ('Outra contribuição', 'outro')
on conflict (nome) do nothing;

create table if not exists cobrancas (
  id uuid primary key default gen_random_uuid(),
  filho_id text not null,
  tipo_id uuid references cobranca_tipos (id) on delete set null,
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

create index if not exists cobrancas_filho_idx on cobrancas (filho_id);
create index if not exists cobrancas_vencimento_idx on cobrancas (vencimento);
create index if not exists cobrancas_pago_idx on cobrancas (pago);

create table if not exists obrigacoes (
  id uuid primary key default gen_random_uuid(),
  filho_id text not null,
  tipo_id text not null,
  data date not null,
  ultima_data date,
  itens jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists obrigacoes_filho_idx on obrigacoes (filho_id);
create index if not exists obrigacoes_data_idx on obrigacoes (data);
