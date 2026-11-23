-- Obrigações manuais: nome, observações e lote de replicação

alter table obrigacoes
  add column if not exists nome text;

alter table obrigacoes
  add column if not exists observacoes text;

alter table obrigacoes
  add column if not exists lote_id uuid;

create unique index if not exists obrigacoes_filho_lote_uidx
  on obrigacoes (filho_id, lote_id)
  where lote_id is not null;

create index if not exists obrigacoes_lote_idx
  on obrigacoes (lote_id)
  where lote_id is not null;

create index if not exists obrigacoes_nome_idx
  on obrigacoes (lower(trim(nome)))
  where nome is not null and trim(nome) <> '';
