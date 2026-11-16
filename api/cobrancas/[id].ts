import { requireIdentity } from '../../cursor/identity'
import { dbMode, json, sql } from '../../lib/db'

type CobrancaRow = Record<string, unknown>
const CATS = new Set(['mensalidade', 'contribuicao', 'outro'])

function idFromUrl(request: Request): string | null {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean)
  const last = parts[parts.length - 1]
  return last && last !== 'cobrancas' ? decodeURIComponent(last) : null
}

export async function PATCH(request: Request): Promise<Response> {
  const identity = await requireIdentity(request)
  if (identity instanceof Response) return identity

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

  if ('filhoId' in body || 'filho_id' in body) {
    push('filho_id', String(body.filhoId ?? body.filho_id).trim())
  }
  if ('tipoNome' in body || 'tipo_nome' in body) {
    push('tipo_nome', String(body.tipoNome ?? body.tipo_nome).trim())
  }
  if ('tipoId' in body || 'tipo_id' in body) {
    push('tipo_id', emptyToNull(body.tipoId ?? body.tipo_id))
  }
  if ('categoria' in body) {
    const cat = String(body.categoria)
    if (!CATS.has(cat)) return json({ error: 'invalid_categoria' }, 400)
    push('categoria', cat)
  }
  if ('valor' in body) push('valor', Number(body.valor))
  if ('vencimento' in body) {
    push('vencimento', String(body.vencimento).slice(0, 10))
  }
  if ('diaVencimento' in body || 'dia_vencimento' in body) {
    const raw = body.diaVencimento ?? body.dia_vencimento
    push(
      'dia_vencimento',
      raw == null || raw === ''
        ? null
        : Math.min(28, Math.max(1, Number(raw))),
    )
  }
  if ('referencia' in body) push('referencia', emptyToNull(body.referencia))
  if ('descricao' in body) push('descricao', emptyToNull(body.descricao))

  if ('pago' in body) {
    const pago = body.pago === true
    push('pago', pago)
    if (pago) {
      push('pago_em', new Date().toISOString())
    } else {
      push('pago_em', null)
    }
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
  const identity = await requireIdentity(request)
  if (identity instanceof Response) return identity

  const id = idFromUrl(request)
  if (!id) return json({ error: 'missing_id' }, 400)

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
