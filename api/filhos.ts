import { requireIdentity } from '../cursor/identity'
import {
  getSupabaseAdmin,
  json,
  supabaseConfigured,
  type FilhoRow,
} from '../lib/supabaseAdmin'

export async function GET(request: Request): Promise<Response> {
  const identity = await requireIdentity(request)
  if (identity instanceof Response) return identity

  if (!supabaseConfigured()) {
    return json({ source: 'unset', filhos: [], message: 'supabase_unset' })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return json({ error: 'supabase_unavailable' }, 503)
  }

  const { data, error } = await supabase
    .from('filhos')
    .select('*')
    .order('nome', { ascending: true })

  if (error) {
    return json({ error: error.message }, 500)
  }

  return json({ source: 'supabase', filhos: (data ?? []) as FilhoRow[] })
}

export async function POST(request: Request): Promise<Response> {
  const identity = await requireIdentity(request)
  if (identity instanceof Response) return identity

  if (!supabaseConfigured()) {
    return json({ error: 'supabase_unset' }, 503)
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return json({ error: 'supabase_unavailable' }, 503)
  }

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

  const row = {
    nome,
    orixa,
    pai_de_cabeca: emptyToNull(body.paiDeCabeca ?? body.pai_de_cabeca),
    mae_de_cabeca: emptyToNull(body.maeDeCabeca ?? body.mae_de_cabeca),
    guias,
    data_nascimento: emptyToNull(body.dataNascimento ?? body.data_nascimento),
    data_entrada: emptyToNull(body.dataEntrada ?? body.data_entrada),
    iniciacao: emptyToNull(body.iniciacao),
    telefone1: emptyToNull(body.telefone1 ?? body.telefone),
    telefone2: emptyToNull(body.telefone2),
    email: emptyToNull(body.email),
    endereco_cep: emptyToNull(body.endereco?.cep ?? body.endereco_cep),
    endereco_logradouro: emptyToNull(
      body.endereco?.logradouro ?? body.endereco_logradouro,
    ),
    endereco_numero: emptyToNull(body.endereco?.numero ?? body.endereco_numero),
    endereco_complemento: emptyToNull(
      body.endereco?.complemento ?? body.endereco_complemento,
    ),
    endereco_bairro: emptyToNull(body.endereco?.bairro ?? body.endereco_bairro),
    endereco_cidade: emptyToNull(body.endereco?.cidade ?? body.endereco_cidade),
    endereco_uf: emptyToNull(body.endereco?.uf ?? body.endereco_uf),
  }

  const { data, error } = await supabase
    .from('filhos')
    .insert(row)
    .select('*')
    .single()

  if (error) {
    return json({ error: error.message }, 500)
  }

  return json({ source: 'supabase', filho: data as FilhoRow }, 201)
}

function emptyToNull(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'object' && value !== null && 'cep' in (value as object)) {
    return null
  }
  const s = String(value).trim()
  return s === '' ? null : s
}
