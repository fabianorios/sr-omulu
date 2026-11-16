-- Orixá de cabeça removed from the product; keep column nullable for old rows.
alter table filhos alter column orixa drop not null;
alter table filhos alter column orixa set default '';
