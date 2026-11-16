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
- Migrations: `001`–`004` (filhos, entidades jsonb, financeiro, obrigações/itens)
- Local API uses **PGlite** when `DATABASE_URL` is unset
- Production DB is provisioned on **private/team publish** (platform sets `DATABASE_URL`)

Do not commit or paste `DATABASE_URL`.

## Cadastro de filhos

Pai/mãe de cabeça (listas fixas A–Z). Entidades: linhas Entidade (select A–Z) + Nome (texto livre); o mesmo tipo pode repetir com nomes diferentes. Nascimento, entrada no terreiro, iniciação, até 2 telefones, endereço + CEP (ViaCEP).

## Agenda financeira

Cobranças por filho: **Mensalidade** (valor fixo + dia do mês 1–28 → vencimento do ciclo) e contribuições extensíveis (festivas, obrigações, tipos custom). Status pago / em aberto / vencido. Dashboard: mensalidades vencidas + filhos em débito.

## Obrigações — itens

Ao agendar/editar tipos, liste **itens** e **quantidade**. Persistidos em `obrigacoes.itens` (jsonb) e exibidos no histórico.

## Autenticação e papéis (app público)

Login com **CPF**, **e-mail** ou **celular** + senha (cookie HttpOnly `sr_omulu_sess`).

| Papel | Acesso |
|-------|--------|
| **Administrador** | CRUD filhos, financeiro, obrigações, config, usuários |
| **Médium** | Somente o próprio filho vinculado (cadastro, obrigações, cobranças); pode marcar pagamento próprio |

APIs exigem sessão. Médiuns não listam tabelas inteiras — filtro por `filho_id`.

### Bootstrap do primeiro admin

Se não houver administradores ativos, a tela de login vira **Criar administrador** (`POST /api/auth/bootstrap`). Depois disso o endpoint fecha (`403 bootstrap_closed`). Novos usuários são criados em **Usuários** (só admin).

Migration: `migrations/005_auth_usuarios.sql`.

## Publicação

Pode publicar como **público** com o login in-app acima. Postgres da plataforma continua disponível quando `cursor-app.json` declara database.
