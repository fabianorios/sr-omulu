import { requireIdentity } from '../../cursor/identity'
import { dbMode, json, sql, type FilhoRow } from '../../lib/db'

const PAIS = new Set(['Ogum', 'Omulu', 'Oxossi', 'Xango'])
const MAES = new Set(['Iansã', 'Iemanjá', 'Nanã Buruquê', 'Oxum'])
const GUIAS = new Set([
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

function idFromUrl(request: Request): string | null {
  const url = new URL(request.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const last = parts[parts.length - 1]
  return last && last !== 'filhos' ? decodeURIComponent(last) : null
}

export async function GET(request: Request): Promise<Response> {
  const identity = await requireIdentity(request)
  if (identity instanceof Response) return identity

  const id = idFromUrl(request)
  if (!id) return json({ error: 'missing_id' }, 400)

  try {
    const rows = await sql<FilhoRow>(`select * from filhos where id = $1`, [id])
    if (!rows[0]) return json({ error: 'not_found' }, 404)
    return json({ source: dbMode(), filho: rows[0] })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'db_error' },
      500,
    )
  }
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

  if (body.nome != null) push('nome', String(body.nome).trim())

  if ('paiDeCabeca' in body || 'pai_de_cabeca' in body) {
    const pai = String(body.paiDeCabeca ?? body.pai_de_cabeca ?? '').trim()
    if (!PAIS.has(pai)) return json({ error: 'invalid_pai' }, 400)
    push('pai_de_cabeca', pai)
  }
  if ('maeDeCabeca' in body || 'mae_de_cabeca' in body) {
    const mae = String(body.maeDeCabeca ?? body.mae_de_cabeca ?? '').trim()
    if (!MAES.has(mae)) return json({ error: 'invalid_mae' }, 400)
    push('mae_de_cabeca', mae)
  }
  if (Array.isArray(body.guias)) {
    const guias = body.guias
      .map((g) => String(g).trim())
      .filter((g) => GUIAS.has(g))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    params.push(guias)
    sets.push(`guias = $${params.length}::text[]`)
  }
  if ('dataNascimento' in body || 'data_nascimento' in body) {
    push(
      'data_nascimento',
      emptyToNull(body.dataNascimento ?? body.data_nascimento),
    )
  }
  if ('dataEntrada' in body || 'data_entrada' in body) {
    push('data_entrada', emptyToNull(body.dataEntrada ?? body.data_entrada))
  }
  if ('iniciacao' in body) push('iniciacao', emptyToNull(body.iniciacao))
  if ('telefone1' in body || 'telefone' in body) {
    push('telefone1', emptyToNull(body.telefone1 ?? body.telefone))
  }
  if ('telefone2' in body) push('telefone2', emptyToNull(body.telefone2))
  if ('email' in body) push('email', emptyToNull(body.email))

  const endereco =
    body.endereco && typeof body.endereco === 'object'
      ? (body.endereco as Record<string, unknown>)
      : null
  if (endereco || 'endereco_cep' in body) {
    push('endereco_cep', emptyToNull(endereco?.cep ?? body.endereco_cep))
    push(
      'endereco_logradouro',
      emptyToNull(endereco?.logradouro ?? body.endereco_logradouro),
    )
    push(
      'endereco_numero',
      emptyToNull(endereco?.numero ?? body.endereco_numero),
    )
    push(
      'endereco_complemento',
      emptyToNull(endereco?.complemento ?? body.endereco_complemento),
    )
    push(
      'endereco_bairro',
      emptyToNull(endereco?.bairro ?? body.endereco_bairro),
    )
    push(
      'endereco_cidade',
      emptyToNull(endereco?.cidade ?? body.endereco_cidade),
    )
    push('endereco_uf', emptyToNull(endereco?.uf ?? body.endereco_uf))
  }

  // Clear legacy orixá field when updating spiritual lineage
  if ('paiDeCabeca' in body || 'maeDeCabeca' in body || Array.isArray(body.guias)) {
    push('orixa', '')
  }

  if (sets.length === 0) return json({ error: 'empty_patch' }, 400)

  sets.push('updated_at = now()')
  params.push(id)

  try {
    const rows = await sql<FilhoRow>(
      `update filhos set ${sets.join(', ')} where id = $${params.length} returning *`,
      params,
    )
    if (!rows[0]) return json({ error: 'not_found' }, 404)
    return json({ source: dbMode(), filho: rows[0] })
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
      `delete from filhos where id = $1 returning id`,
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
