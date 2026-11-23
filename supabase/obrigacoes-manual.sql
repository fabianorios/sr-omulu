-- Obrigações manuais (nome / observações / lote) — idempotente.
-- Rode no SQL Editor do Supabase (Dashboard → SQL Editor → New query → Run).
-- Não apaga dados existentes. RLS das obrigações permanece o de pages-client.sql
-- (select scoped + write admin); as novas colunas herdam as mesmas policies.

alter table public.obrigacoes
  add column if not exists nome text;

alter table public.obrigacoes
  add column if not exists observacoes text;

alter table public.obrigacoes
  add column if not exists lote_id uuid;

-- Uma obrigação por filho dentro do mesmo lote de replicação.
create unique index if not exists obrigacoes_filho_lote_uidx
  on public.obrigacoes (filho_id, lote_id)
  where lote_id is not null;

create index if not exists obrigacoes_lote_idx
  on public.obrigacoes (lote_id)
  where lote_id is not null;

create index if not exists obrigacoes_nome_idx
  on public.obrigacoes (lower(trim(nome)))
  where nome is not null and trim(nome) <> '';

comment on column public.obrigacoes.nome is
  'Título livre (obrigações manuais). Tipos ciclicos continuam usando tipo_id.';
comment on column public.obrigacoes.observacoes is
  'Observações gerais da obrigação (informadas na criação manual).';
comment on column public.obrigacoes.lote_id is
  'UUID do lote de replicação aos filhos; evita duplicar no mesmo lote.';
