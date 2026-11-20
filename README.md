# Tenda de Umbanda Senhor Omulu Irmãos de Fé

Agenda e controle inteligente de obrigações dos médiuns da casa.

## URL pública (única)

**https://sr-omulu.pages.dev** — Cloudflare Pages (SPA estática + Supabase no browser).

Login e Agenda usam o cliente Supabase (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`). Domínio custom e outros hosts ficam fora de escopo até o DNS existir.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- Lucide + date-fns + React Router
- **Supabase** no browser (Auth + PostgREST + RLS) quando `VITE_SUPABASE_*` estão definidos
- Local: `/api/*` via Vite plugin + PGlite (ou `SUPABASE_SERVICE_ROLE_KEY` no server) quando `VITE_*` não estão setados
- ViaCEP (busca de endereço)

## Scripts

```bash
npm install
npm run dev      # http://127.0.0.1:5173 — sem VITE_* usa /api + PGlite
npm run build   # vite build (+ migrate no-op sem DATABASE_URL)
npm run preview
```

## Cloudflare Pages

1. Build command: `npm run build`
2. Output directory: `dist`
3. **Build variables** (Settings → Environment variables):

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | `https://nwvzgtaaezgxmaizzuyw.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Project Settings → API → `anon` `public` |

Nunca coloque `service_role` em variável `VITE_*` (vai para o bundle).

4. Redeploy após salvar as variáveis (build precisa reiniciar para embutir `VITE_*`).
5. `public/_redirects` faz fallback SPA (`/* → /index.html`).

## Database / schema

1. SQL Editor: rode `supabase/schema.sql` (tabelas + `app_sql` service_role).
2. Depois rode **`supabase/pages-client.sql`** (Auth link, RLS, `needs_bootstrap` / `claim_bootstrap` / `my_profile`).
3. Defina o código de instalação (uma vez):

```sql
select public.set_bootstrap_secret('<BOOTSTRAP_SECRET>');
```

4. Authentication → Providers → Email: para o primeiro acesso, desative **Confirm email** (ou confirme o link).
5. Authentication → URL configuration: Site URL = `https://sr-omulu.pages.dev`.

## Autenticação (Pages)

| Papel | Acesso |
|-------|--------|
| **Administrador** | CRUD filhos, financeiro, obrigações, config, usuários |
| **Médium** | Somente o próprio filho (`usuarios.filho_id`) |

No Pages o login é **e-mail + senha** (Supabase Auth). CPF/celular ficam só no modo local `/api`.

### Bootstrap do primeiro admin

1. Abra https://sr-omulu.pages.dev
2. Se não houver admin, o formulário pede código de instalação + nome + e-mail + senha
3. O código deve ser o mesmo passado a `set_bootstrap_secret`
4. Depois do primeiro admin, o bootstrap fecha (`bootstrap_closed`)

### Usuários (admin CRUD)

Após o bootstrap: **Usuários** — listar, criar (e-mail, nome, senha temporária, papel admin|médium), editar (nome, papel, ativo, CPF, celular) e desativar (soft). O browser chama `signUp` (anon, cliente efêmero) + RPCs `create_app_user` / `update_app_user` (somente se `current_app_role() = 'admin'`). Sem `service_role` no Pages. Se o SQL já foi aplicado sem essas funções, rode `supabase/users-crud.sql`.

## Local (sem Pages)

Sem `VITE_*`, `npm run dev` usa as rotas `/api/*` (PGlite ou server Supabase com `SUPABASE_SERVICE_ROLE_KEY` + `BOOTSTRAP_SECRET`). Ver `.env.example`.
