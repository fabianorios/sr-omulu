import {
  canAccessFilho,
  filhoIdScopeSql,
  json,
  requireAdmin,
  requireAppSession,
  sql,
} from '../lib/auth'
import { dbMode } from '../lib/db'

type ObrigacaoRow = Record<string, unknown>

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parseItens(raw: unknown): {
  nome: string
  quantidade: number
  observacao?: string
}[] {
  if (!Array.isArray(raw)) return []
  const out: { nome: string; quantidade: number; observacao?: string }[] = []
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

export async function GET(request: Request): Promise<Response> {
  const session = await requireAppSession(request)
  if (session instanceof Response) return session

  try {
    const scope = filhoIdScopeSql(session)
    const obrigacoes = await sql<ObrigacaoRow>(
      `select * from obrigacoes where true${scope.clause} order by data asc`,
      scope.params,
    )
    return json({ source: dbMode(), obrigacoes })
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

  const filhoId = String(body.filhoId ?? body.filho_id ?? '').trim()
  const tipoId = String(body.tipoId ?? body.tipo_id ?? '').trim()
  const data = String(body.data ?? '').trim().slice(0, 10)
  if (!filhoId || !tipoId || !data) {
    return json({ error: 'missing_fields' }, 400)
  }
  if (!UUID_RE.test(filhoId)) {
    return json({ error: 'invalid_id' }, 400)
  }
  if (!canAccessFilho(session, filhoId)) {
    return json({ error: 'forbidden' }, 403)
  }

  const itens = parseItens(body.itens)
  const ultima = emptyToNull(body.ultimaData ?? body.ultima_data)
  const nome = emptyToNull(body.nome)
  const observacoes = emptyToNull(body.observacoes)
  const loteId = emptyToNull(body.loteId ?? body.lote_id)

  try {
    const rows = await sql<ObrigacaoRow>(
      `insert into obrigacoes (filho_id, tipo_id, data, ultima_data, itens, nome, observacoes, lote_id)
       values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
       returning *`,
      [
        filhoId,
        tipoId,
        data,
        ultima,
        JSON.stringify(itens),
        nome,
        observacoes,
        loteId,
      ],
    )
    return json({ source: dbMode(), obrigacao: rows[0] }, 201)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'db_error'
    if (/unique|duplicate|filho_lote/i.test(msg)) {
      return json({ error: 'already_exists' }, 409)
    }
    return json({ error: msg }, 500)
  }
}

function emptyToNull(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s === '' ? null : s
}
