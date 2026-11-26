import { json, requireAdmin, requireAppSession, sql } from '../lib/auth'
import { dbMode } from '../lib/db'

type ItemPadrao = { nome: string; quantidade: number; observacao?: string }

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

function newTipoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `ot_${Math.random().toString(36).slice(2, 10)}`
}

export async function GET(request: Request): Promise<Response> {
  const session = await requireAppSession(request)
  if (session instanceof Response) return session

  try {
    const tipos = await sql(
      `select * from obrigacao_tipos order by nome asc`,
    )
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

  const nome = String(body.nome ?? body.name ?? '').trim()
  const description = String(body.description ?? '').trim()
  if (!nome) return json({ error: 'nome_required' }, 400)

  let yearsOffset: number | null = null
  if ('yearsOffset' in body || 'years_offset' in body) {
    const raw = body.yearsOffset ?? body.years_offset
    if (raw != null && String(raw).trim() !== '') {
      const n = Number(raw)
      if (!Number.isFinite(n) || n <= 0) {
        return json({ error: 'invalid_years_offset' }, 400)
      }
      yearsOffset = Math.floor(n)
    }
  }

  const isFestiva = Boolean(body.isFestiva ?? body.is_festiva ?? false)
  const color = String(body.color ?? '#6B5B4A').trim() || '#6B5B4A'
  const itensPadrao = parseItensPadrao(body.itensPadrao ?? body.itens_padrao)
  const id = String(body.id ?? '').trim() || newTipoId()

  try {
    const rows = await sql(
      `insert into obrigacao_tipos (
         id, nome, description, years_offset, is_festiva, color, ativo, itens_padrao
       ) values ($1, $2, $3, $4, $5, $6, true, $7::jsonb)
       returning *`,
      [
        id,
        nome,
        description,
        yearsOffset,
        isFestiva,
        color,
        JSON.stringify(itensPadrao),
      ],
    )
    return json({ source: dbMode(), tipo: rows[0] }, 201)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'db_error'
    if (/unique|duplicate|obrigacao_tipos_nome/i.test(msg)) {
      return json({ error: 'nome_exists' }, 409)
    }
    return json({ error: msg }, 500)
  }
}
