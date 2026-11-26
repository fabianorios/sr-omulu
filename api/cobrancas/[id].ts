import {
  canAccessFilho,
  json,
  requireAdmin,
  requireAppSession,
  sql,
} from '../../lib/auth'
import { dbMode } from '../../lib/db'

type CobrancaRow = Record<string, unknown> & { filho_id?: string }
const CATS = new Set(['mensalidade', 'contribuicao', 'outro'])
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function idFromUrl(request: Request): string | null {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean)
  const last = parts[parts.length - 1]
  return last && last !== 'cobrancas' ? decodeURIComponent(last) : null
}

async function loadCobranca(id: string) {
  const rows = await sql<CobrancaRow>(`select * from cobrancas where id = $1`, [
    id,
  ])
  return rows[0] ?? null
}

export async function PATCH(request: Request): Promise<Response> {
  const session = await requireAppSession(request)
  if (session instanceof Response) return session

  const id = idFromUrl(request)
  if (!id) return json({ error: 'missing_id' }, 400)
  if (!UUID_RE.test(id.trim())) {
    return json({ error: 'invalid_id' }, 400)
  }

  const existing = await loadCobranca(id)
  if (!existing) return json({ error: 'not_found' }, 404)
  if (!canAccessFilho(session, String(existing.filho_id))) {
    return json({ error: 'forbidden' }, 403)
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const isAdmin = session.user.role === 'admin'
  // Médium may only mark own charges as paid
  if (!isAdmin) {
    const keys = Object.keys(body).filter((k) => k !== 'pago')
    if (keys.length > 0) return json({ error: 'forbidden' }, 403)
  }

  const sets: string[] = []
  const params: unknown[] = []
  const push = (col: string, value: unknown) => {
    params.push(value)
    sets.push(`${col} = $${params.length}`)
  }

  if (isAdmin && ('filhoId' in body || 'filho_id' in body)) {
    const filhoId = String(body.filhoId ?? body.filho_id).trim()
    if (!UUID_RE.test(filhoId)) {
      return json({ error: 'invalid_id' }, 400)
    }
    push('filho_id', filhoId)
  }
  if (isAdmin && ('tipoNome' in body || 'tipo_nome' in body)) {
    push('tipo_nome', String(body.tipoNome ?? body.tipo_nome).trim())
  }
  if (isAdmin && ('tipoId' in body || 'tipo_id' in body)) {
    push('tipo_id', emptyToNull(body.tipoId ?? body.tipo_id))
  }
  if (isAdmin && 'categoria' in body) {
    const cat = String(body.categoria)
    if (!CATS.has(cat)) return json({ error: 'invalid_categoria' }, 400)
    push('categoria', cat)
  }
  if (isAdmin && 'valor' in body) push('valor', Number(body.valor))
  if (isAdmin && 'vencimento' in body) {
    push('vencimento', String(body.vencimento).slice(0, 10))
  }
  if (isAdmin && ('diaVencimento' in body || 'dia_vencimento' in body)) {
    const raw = body.diaVencimento ?? body.dia_vencimento
    push(
      'dia_vencimento',
      raw == null || raw === ''
        ? null
        : Math.min(28, Math.max(1, Number(raw))),
    )
  }
  if (isAdmin && 'referencia' in body) {
    push('referencia', emptyToNull(body.referencia))
  }
  if (isAdmin && 'descricao' in body) {
    push('descricao', emptyToNull(body.descricao))
  }

  if ('pago' in body) {
    const pago = body.pago === true
    push('pago', pago)
    push('pago_em', pago ? new Date().toISOString() : null)
  }

  if (sets.length === 0) return json({ error: 'empty_patch' }, 400)
  sets.push('updated_at = now()')
  params.push(id)

  try {
    const rows = await sql<CobrancaRow>(
      `update cobrancas set ${sets.join(', ')} where id = $${params.length} returning *`,
      params,
    )
    if (!rows[0]) return json({ error: 'not_found' }, 404)
    return json({ source: dbMode(), cobranca: rows[0] })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'db_error' },
      500,
    )
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const session = await requireAppSession(request)
  if (session instanceof Response) return session
  const admin = requireAdmin(session)
  if (admin instanceof Response) return admin

  const id = idFromUrl(request)
  if (!id) return json({ error: 'missing_id' }, 400)
  if (!UUID_RE.test(id.trim())) {
    return json({ error: 'invalid_id' }, 400)
  }

  try {
    const rows = await sql<{ id: string }>(
      `delete from cobrancas where id = $1 returning id`,
      [id],
    )
    if (!rows[0]) return json({ error: 'not_found' }, 404)
    return json({ deleted: true, id: rows[0].id })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'db_error' },
      500,
    )
  }
}

function emptyToNull(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s === '' ? null : s
}
