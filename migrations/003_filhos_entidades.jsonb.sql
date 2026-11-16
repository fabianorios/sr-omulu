-- Entidades: [{ "tipo": "Caboclo", "nome": "..." }, ...]
-- Keep legacy guias text[] unused (additive only).
alter table filhos
  add column if not exists entidades jsonb not null default '[]'::jsonb;
