# Tenda de Umbanda Senhor Omulu Irmãos de Fé

Agenda e controle inteligente de obrigações dos médiuns da casa.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- Lucide + date-fns + React Router
- **Cursor Postgres** (`cursor-app.json` → platform `DATABASE_URL`)
- ViaCEP (busca de endereço)
- Schema espelhado em `supabase/schema.sql` para migração futura

## Scripts

```bash
npm install
npm run dev      # http://127.0.0.1:5173 (PGlite in-memory; no DATABASE_URL)
npm run build   # vite build + migrate when DATABASE_URL is set
npm run preview
```

## Database

- Declare: `cursor-app.json` `{ "database": "postgres" }`
- Migrations: `001`–`005` (filhos, entidades jsonb, financeiro, obrigações/itens, auth)
- Local API uses **PGlite** when `DATABASE_URL` is unset
- Production DB is provisioned on publish when `cursor-app.json` declares database

Do not commit or paste `DATABASE_URL`.

## Cadastro de filhos

Pai/mãe de cabeça (listas fixas A–Z). Entidades: linhas Entidade (select A–Z) + Nome (texto livre); o mesmo tipo pode repetir com nomes diferentes. Nascimento, entrada no terreiro, iniciação, até 2 telefones, endereço + CEP (ViaCEP).

## Agenda financeira

Cobranças por filho: **Mensalidade** (valor fixo + dia do mês 1–28 → vencimento do ciclo) e contribuições extensíveis (festivas, obrigações, tipos custom). Status pago / em aberto / vencido. Dashboard: mensalidades vencidas + filhos em débito.

## Obrigações — itens

Ao agendar/editar tipos, liste **itens** e **quantidade**. Persistidos em `obrigacoes.itens` (jsonb) e exibidos no histórico.

## Autenticação e papéis (modelo público + login in-app)

O app pode ser publicado como **público**. O host Cursor não exige login Cursor para abrir a URL; a proteção é o **login in-app** (CPF, e-mail ou celular + senha) com cookie HttpOnly `sr_omulu_sess`.

| Papel | Acesso |
|-------|--------|
| **Administrador** | CRUD filhos, financeiro, obrigações, config, usuários |
| **Médium** | Somente o próprio filho vinculado (`usuarios.filho_id`): cadastro, obrigações e cobranças; pode marcar pagamento próprio |

APIs de dados exigem sessão de app (`requireAppSession`). Médiuns **não** listam tabelas inteiras — filtro por `filho_id` / ownership em GET, POST, PATCH e DELETE. Cadastro de usuários é só admin.

Login tem throttle por IP+identificador (8 tentativas / 15 min). Cadastro e financeiro **não** são guardados em `localStorage`.

### Bootstrap do primeiro admin

Criar o primeiro administrador exige o segredo de instalação **`BOOTSTRAP_SECRET`** (body `bootstrapSecret` ou header `x-bootstrap-secret`). Sem o segredo o endpoint responde `503 bootstrap_unavailable`. Depois que **qualquer** linha `role=admin` existir, o endpoint fecha (`403 bootstrap_closed`) — desativar o último admin **não** reabre o bootstrap.

- Publicado: declare o secret no host (`BOOTSTRAP_SECRET` via Cursor app secrets).
- Local: `export BOOTSTRAP_SECRET=…` antes de `npm run dev`.

Novos usuários depois do bootstrap: tela **Usuários** (só admin). Migration: `migrations/005_auth_usuarios.sql`.

## Publicação

Publicação **pública** é suportada com o modelo acima: sessão de app + papéis + ownership, não só identity do Cursor. Configure `BOOTSTRAP_SECRET` no host antes do primeiro acesso admin.
