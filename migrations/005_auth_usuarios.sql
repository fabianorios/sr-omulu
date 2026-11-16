-- App-level auth for public publish: users, roles, sessions.

create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  role text not null check (role in ('admin', 'medium')),
  email text,
  cpf text,
  celular text,
  password_hash text not null,
  filho_id text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usuarios_identificador_chk check (
    coalesce(nullif(trim(email), ''), nullif(trim(cpf), ''), nullif(trim(celular), '')) is not null
  )
);

create unique index if not exists usuarios_email_uidx
  on usuarios (lower(email)) where email is not null and trim(email) <> '';
create unique index if not exists usuarios_cpf_uidx
  on usuarios (cpf) where cpf is not null and trim(cpf) <> '';
create unique index if not exists usuarios_celular_uidx
  on usuarios (celular) where celular is not null and trim(celular) <> '';

create table if not exists sessoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessoes_usuario_idx on sessoes (usuario_id);
create index if not exists sessoes_expires_idx on sessoes (expires_at);
