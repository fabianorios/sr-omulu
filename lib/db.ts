import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import pg from 'pg'

const databaseUrl = process.env.DATABASE_URL?.trim() ?? ''
let pool: pg.Pool | undefined
let local: Promise<PGlite> | undefined

export function dbMode(): 'postgres' | 'pglite' {
  return databaseUrl !== '' ? 'postgres' : 'pglite'
}

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== '') {
    pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 })
    return (await pool.query(text, params)).rows as T[]
  }
  local ??= startLocal().catch((error: unknown) => {
    local = undefined
    throw error
  })
  return (await (await local).query<T>(text, params)).rows
}

async function startLocal(): Promise<PGlite> {
  const db = new PGlite()
  const dir = path.join(process.cwd(), 'migrations')
  const files = (await readdir(dir).catch(() => []))
    .filter((f) => f.endsWith('.sql'))
    .sort()
  for (const file of files) {
    await db.exec(await readFile(path.join(dir, file), 'utf8'))
  }
  return db
}

export function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
      ...headers,
    },
  })
}

export type FilhoRow = {
  id: string
  nome: string
  orixa?: string | null
  pai_de_cabeca: string | null
  mae_de_cabeca: string | null
  guias: string[] | null
  entidades?: unknown
  data_nascimento: string | null
  data_entrada: string | null
  iniciacao: string | null
  telefone1: string | null
  telefone2: string | null
  email: string | null
  endereco_cep: string | null
  endereco_logradouro: string | null
  endereco_numero: string | null
  endereco_complemento: string | null
  endereco_bairro: string | null
  endereco_cidade: string | null
  endereco_uf: string | null
  created_at?: string
  updated_at?: string
}
