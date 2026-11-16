# Tenda de Umbanda Senhor Omulu Irmãos de Fé

Agenda e controle inteligente de obrigações dos médiuns da casa.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- Lucide + date-fns + React Router
- **Supabase** (preferred when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set)
- Cursor Postgres fallback (`cursor-app.json` → `DATABASE_URL`) or local **PGlite**
- ViaCEP (busca de endereço)

## Scripts

```bash
npm install
npm run dev      # http://127.0.0.1:5173 (PGlite unless Supabase env is set)
npm run build   # vite build + migrate when DATABASE_URL is set
npm run preview
```

## Database

Priority at runtime:

1. **Supabase** — `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (optional `SUPABASE_ANON_KEY` for future client use)
2. **Postgres** — `DATABASE_URL` (Cursor platform DB)
3. **PGlite** — in-memory local when neither is set

### Apply schema on Supabase

1. Open the project SQL Editor: https://nwvzgtaaezgxmaizzuyw.supabase.co (Project → SQL → New query)
2. Paste and run the full contents of `supabase/schema.sql` (creates tables, RLS, and `app_sql` RPC used by the server)
3. Confirm in Table Editor that `filhos`, `cobrancas`, `obrigacoes`, `usuarios`, `sessoes` exist

Do not commit or paste secret keys or `DATABASE_URL`.

Migrations `001`–`005` mirror the same schema for PGlite / Cursor Postgres builds.

## Cadastro de filhos

Pai/mãe de cabeça (listas fixas A–Z). Entidades: linhas Entidade (select A–Z) + Nome (texto livre); o mesmo tipo pode repetir com nomes diferentes. Nascimento, entrada no terreiro, iniciação, até 2 telefones, endereço + CEP (ViaCEP).

## Agenda financeira

Cobranças por filho: **Mensalidade** (valor fixo + dia do mês 1–28 → vencimento do ciclo) e contribuições extensíveis (festivas, obrigações, tipos custom). Status pago / em aberto / vencido. Dashboard: mensalidades vencidas + filhos em débito.

## Obrigações — itens

Ao agendar/editar tipos, liste **itens** e **quantidade**. Persistidos em `obrigacoes.itens` (jsonb) e exibidos no histórico.

## Autenticação e papéis (modelo público + login in-app)

O app pode ser publicado como **público**. A proteção é o **login in-app** (CPF, e-mail ou celular + senha) com cookie HttpOnly `sr_omulu_sess`.

| Papel | Acesso |
|-------|--------|
| **Administrador** | CRUD filhos, financeiro, obrigações, config, usuários |
| **Médium** | Somente o próprio filho vinculado (`usuarios.filho_id`) |

APIs exigem sessão de app. Médiuns não listam tabelas inteiras — filtro por `filho_id`.

### Bootstrap do primeiro admin

Exige **`BOOTSTRAP_SECRET`**. Sem o segredo → `503`. Depois que qualquer admin existir → `403 bootstrap_closed`.

## Publicação

Configure secrets no host (`SUPABASE_*`, `BOOTSTRAP_SECRET`) e aplique `supabase/schema.sql` **antes** de republicar para Supabase. Auth/ownership already on `main` stays unchanged.
