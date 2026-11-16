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
- Migrations: `migrations/001_create_filhos.sql`, `002_*`, `003_filhos_entidades.jsonb.sql`
- Local API uses **PGlite** when `DATABASE_URL` is unset
- Production DB is provisioned on **private/team publish** (platform sets `DATABASE_URL`)

Do not commit or paste `DATABASE_URL`.

## Cadastro de filhos

Pai/mãe de cabeça (listas fixas A–Z). Entidades: linhas Entidade (select A–Z) + Nome (texto livre); o mesmo tipo pode repetir com nomes diferentes. Nascimento, entrada no terreiro, iniciação, até 2 telefones, endereço + CEP (ViaCEP).

## Publicação

Não publique como público (PII). Quando for publicar, use **Private** ou **Team** — o Postgres da plataforma é criado nesse publish.
