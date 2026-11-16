import { requireIdentity } from '../cursor/identity'
import { dbMode, json, sql, type FilhoRow } from '../lib/db'

export async function GET(request: Request): Promise<Response> {
  const identity = await requireIdentity(request)
  if (identity instanceof Response) return identity

  try {
    const filhos = await sql<FilhoRow>(
      `select * from filhos order by nome asc`,
    )
    return json({ source: dbMode(), filhos })
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

  const nome = String(body.nome ?? '').trim()
  const orixa = String(body.orixa ?? '').trim()
  if (!nome || !orixa) {
    return json({ error: 'nome_and_orixa_required' }, 400)
  }

  const guias = Array.isArray(body.guias)
    ? body.guias.map((g) => String(g).trim()).filter(Boolean)
    : []

  const endereco =
    body.endereco && typeof body.endereco === 'object'
      ? (body.endereco as Record<string, unknown>)
      : {}

  try {
    const rows = await sql<FilhoRow>(
      `insert into filhos (
        nome, orixa, pai_de_cabeca, mae_de_cabeca, guias,
        data_nascimento, data_entrada, iniciacao,
        telefone1, telefone2, email,
        endereco_cep, endereco_logradouro, endereco_numero,
        endereco_complemento, endereco_bairro, endereco_cidade, endereco_uf
      ) values (
        $1,$2,$3,$4,$5::text[],
        $6,$7,$8,
        $9,$10,$11,
        $12,$13,$14,
        $15,$16,$17,$18
      )
      returning *`,
      [
        nome,
        orixa,
        emptyToNull(body.paiDeCabeca ?? body.pai_de_cabeca),
        emptyToNull(body.maeDeCabeca ?? body.mae_de_cabeca),
        guias,
        emptyToNull(body.dataNascimento ?? body.data_nascimento),
        emptyToNull(body.dataEntrada ?? body.data_entrada),
        emptyToNull(body.iniciacao),
        emptyToNull(body.telefone1 ?? body.telefone),
        emptyToNull(body.telefone2),
        emptyToNull(body.email),
        emptyToNull(endereco.cep ?? body.endereco_cep),
        emptyToNull(endereco.logradouro ?? body.endereco_logradouro),
        emptyToNull(endereco.numero ?? body.endereco_numero),
        emptyToNull(endereco.complemento ?? body.endereco_complemento),
        emptyToNull(endereco.bairro ?? body.endereco_bairro),
        emptyToNull(endereco.cidade ?? body.endereco_cidade),
        emptyToNull(endereco.uf ?? body.endereco_uf),
      ],
    )
    return json({ source: dbMode(), filho: rows[0] }, 201)
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
