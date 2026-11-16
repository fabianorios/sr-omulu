import { requireIdentity } from '../cursor/identity'
import { dbMode, json, sql } from '../lib/db'

type CobrancaRow = Record<string, unknown>
type TipoRow = Record<string, unknown>

const CATS = new Set(['mensalidade', 'contribuicao', 'outro'])

export async function GET(request: Request): Promise<Response> {
  const identity = await requireIdentity(request)
  if (identity instanceof Response) return identity

  try {
    const [cobrancas, tipos] = await Promise.all([
      sql<CobrancaRow>(
        `select * from cobrancas order by vencimento asc, created_at asc`,
      ),
      sql<TipoRow>(
        `select * from cobranca_tipos where ativo = true order by nome asc`,
      ),
    ])
    return json({ source: dbMode(), cobrancas, tipos })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'db_error' },
      500,
    )
  }
}

export async function POST(request: Request): Promise<Response> {
  const identity = await requireIdentity(request)
  if (identity instanceof Response) return identity

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const filhoId = String(body.filhoId ?? body.filho_id ?? '').trim()
  const tipoNome = String(body.tipoNome ?? body.tipo_nome ?? '').trim()
  const categoria = String(body.categoria ?? 'outro').trim()
  const valor = Number(body.valor)
  const vencimento = String(body.vencimento ?? '').trim().slice(0, 10)

  if (!filhoId || !tipoNome || !vencimento || !Number.isFinite(valor)) {
    return json({ error: 'missing_fields' }, 400)
  }
  if (!CATS.has(categoria)) return json({ error: 'invalid_categoria' }, 400)

  const diaRaw = body.diaVencimento ?? body.dia_vencimento
  const dia =
    diaRaw == null || diaRaw === ''
      ? null
      : Math.min(28, Math.max(1, Number(diaRaw)))

  try {
    const rows = await sql<CobrancaRow>(
      `insert into cobrancas (
        filho_id, tipo_id, tipo_nome, categoria, valor, vencimento,
        dia_vencimento, referencia, descricao, pago
      ) values (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, coalesce($10::boolean, false)
      )
      returning *`,
      [
        filhoId,
        emptyToNull(body.tipoId ?? body.tipo_id),
        tipoNome,
        categoria,
        valor,
        vencimento,
        Number.isFinite(dia as number) ? dia : null,
        emptyToNull(body.referencia),
        emptyToNull(body.descricao),
        body.pago === true,
      ],
    )
    return json({ source: dbMode(), cobranca: rows[0] }, 201)
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
