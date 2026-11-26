import { json, requireAdmin, requireAppSession, sql } from '../../lib/auth'
import { dbMode } from '../../lib/db'

type ItemPadrao = { nome: string; quantidade: number; observacao?: string }

function idFromUrl(request: Request): string | null {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean)
  const last = parts[parts.length - 1]
  return last && last !== 'obrigacao-tipos' ? decodeURIComponent(last) : null
}

function parseItensPadrao(raw: unknown): ItemPadrao[] {
  if (!Array.isArray(raw)) return []
  const out: ItemPadrao[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const nome = String(rec.nome ?? '').trim()
    const quantidade = Number(rec.quantidade)
    if (!nome) continue
    const observacao = String(rec.observacao ?? '').trim()
    out.push({
      nome,
      quantidade: Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 1,
      ...(observacao ? { observacao } : {}),
    })
  }
  return out
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

  if ('nome' in body || 'name' in body) {
    const nome = String(body.nome ?? body.name ?? '').trim()
    if (!nome) return json({ error: 'nome_required' }, 400)
    push('nome', nome)
  }
  if ('description' in body) {
    push('description', String(body.description ?? '').trim())
  }
  if ('yearsOffset' in body || 'years_offset' in body) {
    const raw = body.yearsOffset ?? body.years_offset
    if (raw == null || String(raw).trim() === '') {
      push('years_offset', null)
    } else {
      const n = Number(raw)
      if (!Number.isFinite(n) || n <= 0) {
        return json({ error: 'invalid_years_offset' }, 400)
      }
      push('years_offset', Math.floor(n))
    }
  }
  if ('isFestiva' in body || 'is_festiva' in body) {
    push('is_festiva', Boolean(body.isFestiva ?? body.is_festiva))
  }
  if ('color' in body) {
    const color = String(body.color ?? '').trim() || '#6B5B4A'
    push('color', color)
  }
  if ('ativo' in body || 'active' in body) {
    push('ativo', Boolean(body.ativo ?? body.active))
  }
  if ('itensPadrao' in body || 'itens_padrao' in body) {
    const itens = parseItensPadrao(body.itensPadrao ?? body.itens_padrao)
    params.push(JSON.stringify(itens))
    sets.push(`itens_padrao = $${params.length}::jsonb`)
  }

  if (sets.length === 0) return json({ error: 'empty_patch' }, 400)
  push('updated_at', new Date().toISOString())

  params.push(id)
  try {
    const rows = await sql(
      `update obrigacao_tipos set ${sets.join(', ')} where id = $${params.length} returning *`,
      params,
    )
    if (!rows[0]) return json({ error: 'not_found' }, 404)
    return json({ source: dbMode(), tipo: rows[0] })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'db_error'
    if (/unique|duplicate|obrigacao_tipos_nome/i.test(msg)) {
      return json({ error: 'nome_exists' }, 409)
    }
    return json({ error: msg }, 500)
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const session = await requireAppSession(request)
  if (session instanceof Response) return session
  const admin = requireAdmin(session)
  if (admin instanceof Response) return admin

  const id = idFromUrl(request)
  if (!id) return json({ error: 'missing_id' }, 400)

  try {
    const inUse = await sql<{ count: string }>(
      `select count(*)::text as count from obrigacoes where tipo_id = $1`,
      [id],
    )
    const count = Number(inUse[0]?.count ?? 0)
    if (count > 0) {
      return json(
        {
          error: 'in_use',
          message:
            'Há obrigações no calendário com este tipo. Desative-o ou remova as instâncias antes de excluir.',
          count,
        },
        409,
      )
    }

    const rows = await sql(
      `delete from obrigacao_tipos where id = $1 returning id`,
      [id],
    )
    if (!rows[0]) return json({ error: 'not_found' }, 404)
    return json({ source: dbMode(), ok: true })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'db_error' },
      500,
    )
  }
}
