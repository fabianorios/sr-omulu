import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { PGlite } from '@electric-sql/pglite'
import pg from 'pg'

const databaseUrl = process.env.DATABASE_URL?.trim() ?? ''

let pool: pg.Pool | undefined
let local: Promise<PGlite> | undefined
let supabaseAdmin: SupabaseClient | null | undefined

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  )
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseConfigured()) return null
  if (supabaseAdmin !== undefined) return supabaseAdmin
  const url = process.env.SUPABASE_URL!.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim()
  supabaseAdmin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return supabaseAdmin
}

/**
 * Prefer Supabase when URL + service role are set (migration target).
 * Else Cursor/platform Postgres via DATABASE_URL, else in-memory PGlite.
 */
export function dbMode(): 'supabase' | 'postgres' | 'pglite' {
  if (supabaseConfigured()) return 'supabase'
  return databaseUrl !== '' ? 'postgres' : 'pglite'
}

function toJsonParam(value: unknown): unknown {
  if (value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  return value
}

async function sqlViaSupabase<T>(
  text: string,
  params: unknown[],
): Promise<T[]> {
  const client = getSupabaseAdmin()
  if (!client) throw new Error('supabase_unavailable')
  const { data, error } = await client.rpc('app_sql', {
    query: text,
    params: params.map(toJsonParam),
  })
  if (error) {
    throw new Error(error.message || 'supabase_rpc_error')
  }
  if (data == null) return []
  if (Array.isArray(data)) return data as T[]
  return []
}

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (supabaseConfigured()) {
    return sqlViaSupabase<T>(text, params)
  }
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
