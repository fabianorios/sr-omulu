-- Catálogo de tipos de obrigação (espelho de supabase/obrigacao-tipos.sql)

create table if not exists obrigacao_tipos (
  id text primary key,
  nome text not null,
  description text not null default '',
  years_offset int,
  is_festiva boolean not null default false,
  color text not null default '#6B5B4A',
  ativo boolean not null default true,
  itens_padrao jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint obrigacao_tipos_years_chk check (
    years_offset is null or years_offset > 0
  )
);

create unique index if not exists obrigacao_tipos_nome_uidx
  on obrigacao_tipos (lower(trim(nome)));

create index if not exists obrigacao_tipos_ativo_idx
  on obrigacao_tipos (ativo);

insert into obrigacao_tipos (
  id, nome, description, years_offset, is_festiva, color, ativo, itens_padrao
) values
  (
    '1_ano',
    'Obrigação de 1 Ano',
    'Confirmação anual após a feitura ou última obrigação.',
    1,
    false,
    '#3B6EA5',
    true,
    '[{"nome":"Vela branca","quantidade":2},{"nome":"Flor","quantidade":1}]'::jsonb
  ),
  (
    '3_anos',
    'Obrigação de 3 Anos',
    'Ciclo trienal de consolidação espiritual.',
    3,
    false,
    '#1E4D7B',
    true,
    '[{"nome":"Vela","quantidade":3}]'::jsonb
  ),
  (
    '7_anos',
    'Obrigação de 7 Anos',
    'Grande ciclo de amadurecimento na corrente.',
    7,
    false,
    '#0F2F4A',
    true,
    '[]'::jsonb
  ),
  (
    'feitura',
    'Feitura',
    'Iniciação / fechamento de corpo do filho.',
    null,
    false,
    '#7BA3C4',
    true,
    '[{"nome":"Kit de feitura","quantidade":1},{"nome":"Contas","quantidade":1}]'::jsonb
  ),
  (
    'troca_guia',
    'Troca de Guia',
    'Renovação ou troca de guia espiritual.',
    null,
    false,
    '#C4A35A',
    true,
    '[{"nome":"Guia","quantidade":1}]'::jsonb
  ),
  (
    'festiva',
    'Obrigação Festiva',
    'Compromisso ligado a festa de Orixá ou gira especial.',
    1,
    true,
    '#8B9A7D',
    true,
    '[{"nome":"Contribuição de mesa","quantidade":1},{"nome":"Flor","quantidade":3}]'::jsonb
  ),
  (
    'manual',
    'Obrigação manual',
    'Legado: obrigações criadas antes do catálogo unificado (sem ciclo automático).',
    null,
    false,
    '#6B5B4A',
    true,
    '[]'::jsonb
  )
on conflict (id) do nothing;
