import { requireIdentity } from '../../cursor/identity'
import {
  getSupabaseAdmin,
  json,
  supabaseConfigured,
  type FilhoRow,
} from '../../lib/supabaseAdmin'

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

  if (!supabaseConfigured()) {
    return json({ error: 'supabase_unset' }, 503)
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) return json({ error: 'supabase_unavailable' }, 503)

  const { data, error } = await supabase
    .from('filhos')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) return json({ error: error.message }, 500)
  if (!data) return json({ error: 'not_found' }, 404)
  return json({ source: 'supabase', filho: data as FilhoRow })
}

export async function PATCH(request: Request): Promise<Response> {
  const identity = await requireIdentity(request)
  if (identity instanceof Response) return identity

  const id = idFromUrl(request)
  if (!id) return json({ error: 'missing_id' }, 400)

  if (!supabaseConfigured()) {
    return json({ error: 'supabase_unset' }, 503)
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) return json({ error: 'supabase_unavailable' }, 503)

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const patch: Record<string, unknown> = {}
  if (body.nome != null) patch.nome = String(body.nome).trim()
  if (body.orixa != null) patch.orixa = String(body.orixa).trim()
  if ('paiDeCabeca' in body || 'pai_de_cabeca' in body) {
    patch.pai_de_cabeca = emptyToNull(body.paiDeCabeca ?? body.pai_de_cabeca)
  }
  if ('maeDeCabeca' in body || 'mae_de_cabeca' in body) {
    patch.mae_de_cabeca = emptyToNull(body.maeDeCabeca ?? body.mae_de_cabeca)
  }
  if (Array.isArray(body.guias)) {
    patch.guias = body.guias.map((g) => String(g).trim()).filter(Boolean)
  }
  if ('dataNascimento' in body || 'data_nascimento' in body) {
    patch.data_nascimento = emptyToNull(
      body.dataNascimento ?? body.data_nascimento,
    )
  }
  if ('dataEntrada' in body || 'data_entrada' in body) {
    patch.data_entrada = emptyToNull(body.dataEntrada ?? body.data_entrada)
  }
  if ('iniciacao' in body) patch.iniciacao = emptyToNull(body.iniciacao)
  if ('telefone1' in body || 'telefone' in body) {
    patch.telefone1 = emptyToNull(body.telefone1 ?? body.telefone)
  }
  if ('telefone2' in body) patch.telefone2 = emptyToNull(body.telefone2)
  if ('email' in body) patch.email = emptyToNull(body.email)

  const endereco =
    body.endereco && typeof body.endereco === 'object'
      ? (body.endereco as Record<string, unknown>)
      : null
  if (endereco || 'endereco_cep' in body) {
    patch.endereco_cep = emptyToNull(endereco?.cep ?? body.endereco_cep)
    patch.endereco_logradouro = emptyToNull(
      endereco?.logradouro ?? body.endereco_logradouro,
    )
    patch.endereco_numero = emptyToNull(
      endereco?.numero ?? body.endereco_numero,
    )
    patch.endereco_complemento = emptyToNull(
      endereco?.complemento ?? body.endereco_complemento,
    )
    patch.endereco_bairro = emptyToNull(
      endereco?.bairro ?? body.endereco_bairro,
    )
    patch.endereco_cidade = emptyToNull(
      endereco?.cidade ?? body.endereco_cidade,
    )
    patch.endereco_uf = emptyToNull(endereco?.uf ?? body.endereco_uf)
  }

  if (Object.keys(patch).length === 0) {
    return json({ error: 'empty_patch' }, 400)
  }

  const { data, error } = await supabase
    .from('filhos')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) return json({ error: error.message }, 500)
  if (!data) return json({ error: 'not_found' }, 404)
  return json({ source: 'supabase', filho: data as FilhoRow })
}

export async function DELETE(request: Request): Promise<Response> {
  const identity = await requireIdentity(request)
  if (identity instanceof Response) return identity

  const id = idFromUrl(request)
  if (!id) return json({ error: 'missing_id' }, 400)

  if (!supabaseConfigured()) {
    return json({ error: 'supabase_unset' }, 503)
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) return json({ error: 'supabase_unavailable' }, 503)

  const { error, count } = await supabase
    .from('filhos')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) return json({ error: error.message }, 500)
  if (!count) return json({ error: 'not_found' }, 404)
  return json({ deleted: true, id })
}

function emptyToNull(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s === '' ? null : s
}
