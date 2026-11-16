# Tenda de Umbanda Senhor Omulu Irmãos de Fé

Agenda e controle inteligente de obrigações dos médiuns da casa.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Lucide React (ícones)
- date-fns (datas em pt-BR)
- React Router
- Supabase (cadastro de filhos, server-side)
- ViaCEP (busca de endereço)

## Scripts

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build
npm run preview
```

## Rotas

| Rota | Tela |
|------|------|
| `/` | Dashboard da Casa |
| `/agenda` | Agenda (calendário mensal) |
| `/filhos` | Lista de Filhos |
| `/config` | Obrigações & Configurações |

## Dados

Sem Supabase configurado, o app usa **dados de exemplo anonimizados** (ou rascunho no `localStorage` ao cadastrar). Com Supabase + secrets no Cursor, filhos passam a ir/voltar pela API `/api/filhos` (service role só no servidor).

## Supabase (setup)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No SQL Editor, rode `supabase/schema.sql`.
3. Em Project Settings → API, copie:
   - Project URL → secret `SUPABASE_URL`
   - `service_role` key → secret `SUPABASE_SERVICE_ROLE_KEY`
   - `anon` `public` key → secret `SUPABASE_ANON_KEY` (reservada para uso futuro; escrita usa service role)
4. Adicione esses 3 nomes nas Secrets do app no Cursor (já declarados via bind-app-secrets). **Não cole as chaves no chat nem no Git.**

## Publicação

Não publique como público: o cadastro contém PII. Quando for publicar, use **Private** ou **Team** e confirme antes.
