import {
  bootstrapAvailable,
  countAdminRows,
  dbMode,
  json,
  sql,
} from '../lib/auth'
import { supabaseConfigured } from '../lib/db'

/**
 * Public diagnostics for deploy smoke tests. No secrets leaked.
 */
export async function GET(): Promise<Response> {
  const mode = dbMode()
  let dbOk = false
  let dbError: string | undefined
  let adminRows: number | undefined
  try {
    await sql<{ x: number }>(`select 1::int as x`)
    dbOk = true
    adminRows = await countAdminRows()
  } catch (error) {
    dbError = error instanceof Error ? error.message : 'db_error'
  }

  return json({
    ok: dbOk,
    service: 'sr-omulu',
    dbMode: mode,
    supabaseConfigured: supabaseConfigured(),
    bootstrapConfigured: bootstrapAvailable(),
    needsBootstrap: dbOk ? adminRows === 0 && bootstrapAvailable() : undefined,
    dbError: dbOk ? undefined : dbError,
  })
}
