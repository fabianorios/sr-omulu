# Tenda de Umbanda Senhor Omulu Irmãos de Fé

Agenda e controle inteligente de obrigações dos médiuns da casa.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Lucide React (ícones)
- date-fns (datas em pt-BR)
- React Router

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

A aplicação inicia com **dados de exemplo** (12 filhos, obrigações, eventos da casa). Use o botão **DADOS DE EXEMPLO** no cabeçalho para restaurar o estado inicial.
