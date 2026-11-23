import { json, requireAdmin, requireAppSession, sql } from '../../lib/auth'
import { dbMode } from '../../lib/db'

const CATS = new Set(['mensalidade', 'contribuicao', 'outro'])

function idFromUrl(request: Request): string | null {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean)
  const last = parts[parts.length - 1]
  return last && last !== 'cobranca-tipos' ? decodeURIComponent(last) : null
}

export async function PATCH(request: Request): Promise<Response> {
  const session = await requireAppSession(request)
  if (session instanceof Response) return session
  const admin = requireAdmin(session)
  if (admin instanceof Response) return admin

  const id = idFromUrl(request)
  if (!id) return json({ error: 'missing_id' }, 400)

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const sets: string[] = []
  const params: unknown[] = []
  const push = (col: string, value: unknown) => {
    params.push(value)
    sets.push(`${col} = $${params.length}`)
  }

  if ('nome' in body) {
    const nome = String(body.nome ?? '').trim()
    if (!nome) return json({ error: 'nome_required' }, 400)
    push('nome', nome)
  }
  if ('categoria' in body) {
    const cat = String(body.categoria ?? '').trim()
    if (!CATS.has(cat)) return json({ error: 'invalid_categoria' }, 400)
    push('categoria', cat)
  }
  if ('ativo' in body) {
    push('ativo', Boolean(body.ativo))
  }

  if (sets.length === 0) return json({ error: 'empty_patch' }, 400)

  params.push(id)
  try {
    const rows = await sql(
      `update cobranca_tipos set ${sets.join(', ')} where id = $${params.length} returning *`,
      params,
    )
    if (!rows[0]) return json({ error: 'not_found' }, 404)
    if ('nome' in body) {
      await sql(
        `update cobrancas set tipo_nome = $1, updated_at = now() where tipo_id = $2`,
        [String(body.nome).trim(), id],
      )
    }
    return json({ source: dbMode(), tipo: rows[0] })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'db_error' },
      500,
    )
  }
}
