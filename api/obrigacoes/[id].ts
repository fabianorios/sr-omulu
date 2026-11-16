import { requireIdentity } from '../../cursor/identity'
import { dbMode, json, sql } from '../../lib/db'

type ObrigacaoRow = Record<string, unknown>

function idFromUrl(request: Request): string | null {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean)
  const last = parts[parts.length - 1]
  return last && last !== 'obrigacoes' ? decodeURIComponent(last) : null
}

function parseItens(raw: unknown) {
  if (!Array.isArray(raw)) return null
  const out: { nome: string; quantidade: number }[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const nome = String(rec.nome ?? '').trim()
    const quantidade = Number(rec.quantidade)
    if (!nome) continue
    out.push({
      nome,
      quantidade: Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 1,
    })
  }
  return out
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
  if ('tipoId' in body || 'tipo_id' in body) {
    push('tipo_id', String(body.tipoId ?? body.tipo_id).trim())
  }
  if ('data' in body) push('data', String(body.data).slice(0, 10))
  if ('ultimaData' in body || 'ultima_data' in body) {
    const raw = body.ultimaData ?? body.ultima_data
    push(
      'ultima_data',
      raw == null || String(raw).trim() === ''
        ? null
        : String(raw).slice(0, 10),
    )
  }
  const itens = parseItens(body.itens)
  if (itens) {
    params.push(JSON.stringify(itens))
    sets.push(`itens = $${params.length}::jsonb`)
  }

  if (sets.length === 0) return json({ error: 'empty_patch' }, 400)
  sets.push('updated_at = now()')
  params.push(id)

  try {
    const rows = await sql<ObrigacaoRow>(
      `update obrigacoes set ${sets.join(', ')} where id = $${params.length} returning *`,
      params,
    )
    if (!rows[0]) return json({ error: 'not_found' }, 404)
    return json({ source: dbMode(), obrigacao: rows[0] })
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
      `delete from obrigacoes where id = $1 returning id`,
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
