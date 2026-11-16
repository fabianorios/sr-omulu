import { json, requireAdmin, requireAppSession, sql } from '../lib/auth'
import { dbMode } from '../lib/db'

const CATS = new Set(['mensalidade', 'contribuicao', 'outro'])

export async function GET(request: Request): Promise<Response> {
  const session = await requireAppSession(request)
  if (session instanceof Response) return session

  try {
    const tipos = await sql(`select * from cobranca_tipos order by nome asc`)
    return json({ source: dbMode(), tipos })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'db_error' },
      500,
    )
  }
}

export async function POST(request: Request): Promise<Response> {
  const session = await requireAppSession(request)
  if (session instanceof Response) return session
  const admin = requireAdmin(session)
  if (admin instanceof Response) return admin

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const nome = String(body.nome ?? '').trim()
  const categoria = String(body.categoria ?? 'outro').trim()
  if (!nome) return json({ error: 'nome_required' }, 400)
  if (!CATS.has(categoria)) return json({ error: 'invalid_categoria' }, 400)

  try {
    const rows = await sql(
      `insert into cobranca_tipos (nome, categoria)
       values ($1, $2)
       on conflict (nome) do update set ativo = true, categoria = excluded.categoria
       returning *`,
      [nome, categoria],
    )
    return json({ source: dbMode(), tipo: rows[0] }, 201)
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'db_error' },
      500,
    )
  }
}
