import { requireIdentity } from '../cursor/identity'
import { dbMode, json, sql, type FilhoRow } from '../lib/db'

const PAIS = new Set(['Ogum', 'Omulu', 'Oxossi', 'Xango'])
const MAES = new Set(['Iansã', 'Iemanjá', 'Nanã Buruquê', 'Oxum'])
const TIPOS = new Set([
  'Baiano',
  'Boiadeiro',
  'Caboclo',
  'Cigano',
  'Erê',
  'Exu',
  'Exu Mirim',
  'Malandro',
  'Marinheiro',
  'Marujo',
  'Pomba-Gira',
  'Preto Velho',
])

type EntidadeIn = { tipo: string; nome: string }

function parseEntidades(body: Record<string, unknown>): EntidadeIn[] {
  const raw = body.entidades
  if (!Array.isArray(raw)) return []
  const out: EntidadeIn[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const tipo = String(rec.tipo ?? '').trim()
    const nome = String(rec.nome ?? '').trim()
    if (!TIPOS.has(tipo)) continue
    out.push({ tipo, nome })
  }
  return out
}

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
  const pai = String(body.paiDeCabeca ?? body.pai_de_cabeca ?? '').trim()
  const mae = String(body.maeDeCabeca ?? body.mae_de_cabeca ?? '').trim()
  if (!nome || !pai || !mae) {
    return json({ error: 'nome_pai_mae_required' }, 400)
  }
  if (!PAIS.has(pai) || !MAES.has(mae)) {
    return json({ error: 'invalid_pai_or_mae' }, 400)
  }

  const entidades = parseEntidades(body)
  const endereco =
    body.endereco && typeof body.endereco === 'object'
      ? (body.endereco as Record<string, unknown>)
      : {}

  try {
    const rows = await sql<FilhoRow>(
      `insert into filhos (
        nome, orixa, pai_de_cabeca, mae_de_cabeca, guias, entidades,
        data_nascimento, data_entrada, iniciacao,
        telefone1, telefone2, email,
        endereco_cep, endereco_logradouro, endereco_numero,
        endereco_complemento, endereco_bairro, endereco_cidade, endereco_uf
      ) values (
        $1,'',$2,$3,'{}'::text[],$4::jsonb,
        $5,$6,$7,
        $8,$9,$10,
        $11,$12,$13,
        $14,$15,$16,$17
      )
      returning *`,
      [
        nome,
        pai,
        mae,
        JSON.stringify(entidades),
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
