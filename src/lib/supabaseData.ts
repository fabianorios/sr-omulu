import type { FilhoRow } from './filhosApi'
import type { ObrigacaoRow } from './obrigacoesApi'
import type { CobrancaRow, CobrancaTipoRow } from './cobrancasApi'
import { getSupabaseBrowser } from './supabaseBrowser'
import type { FilhoInput } from '../types'
import type { Obrigacao } from '../types'
import type { CobrancaInput, CobrancaCategoria } from '../types'
import { sanitizeEntidadesForSave } from './entidades'
import { emptyEndereco } from '../types'
import { isDbUuid } from './ids'

function filhoInsert(filho: FilhoInput) {
  const endereco = filho.endereco ?? emptyEndereco()
  return {
    nome: filho.nome,
    pai_de_cabeca: filho.paiDeCabeca,
    mae_de_cabeca: filho.maeDeCabeca,
    entidades: sanitizeEntidadesForSave(filho.entidades),
    guias: [] as string[],
    data_nascimento: filho.dataNascimento || null,
    data_entrada: filho.dataEntrada || null,
    iniciacao: filho.iniciacao || null,
    telefone1: filho.telefone1 || null,
    telefone2: filho.telefone2 || null,
    email: filho.email || null,
    endereco_cep: endereco.cep || null,
    endereco_logradouro: endereco.logradouro || null,
    endereco_numero: endereco.numero || null,
    endereco_complemento: endereco.complemento || null,
    endereco_bairro: endereco.bairro || null,
    endereco_cidade: endereco.cidade || null,
    endereco_uf: endereco.uf || null,
  }
}

export async function sbLoadFilhos(): Promise<
  | { ok: true; rows: FilhoRow[] }
  | { ok: false; error: string }
> {
  const sb = getSupabaseBrowser()
  if (!sb) return { ok: false, error: 'supabase_unconfigured' }
  const { data, error } = await sb.from('filhos').select('*').order('nome')
  if (error) {
    if (error.code === 'PGRST301' || error.message.includes('JWT')) {
      return { ok: false, error: 'unauthorized' }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true, rows: (data ?? []) as FilhoRow[] }
}

export async function sbCreateFilho(
  filho: FilhoInput,
): Promise<{ ok: true; row: FilhoRow } | { ok: false; error: string }> {
  const sb = getSupabaseBrowser()
  if (!sb) return { ok: false, error: 'supabase_unconfigured' }
  const { data, error } = await sb
    .from('filhos')
    .insert(filhoInsert(filho))
    .select('*')
    .single()
  if (error || !data) return { ok: false, error: error?.message ?? 'create_failed' }
  return { ok: true, row: data as FilhoRow }
}

export async function sbUpdateFilho(
  id: string,
  filho: FilhoInput,
): Promise<{ ok: true; row: FilhoRow } | { ok: false; error: string }> {
  if (!isDbUuid(id)) return { ok: false, error: 'invalid_id' }
  const sb = getSupabaseBrowser()
  if (!sb) return { ok: false, error: 'supabase_unconfigured' }
  const { data, error } = await sb
    .from('filhos')
    .update({ ...filhoInsert(filho), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error || !data) return { ok: false, error: error?.message ?? 'update_failed' }
  return { ok: true, row: data as FilhoRow }
}

export async function sbDeleteFilho(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isDbUuid(id)) return { ok: false, error: 'invalid_id' }
  const sb = getSupabaseBrowser()
  if (!sb) return { ok: false, error: 'supabase_unconfigured' }
  // filho_id is text without FK cascade — remove dependents first
  const [obr, cob] = await Promise.all([
    sb.from('obrigacoes').delete().eq('filho_id', id),
    sb.from('cobrancas').delete().eq('filho_id', id),
  ])
  if (obr.error) return { ok: false, error: obr.error.message }
  if (cob.error) return { ok: false, error: cob.error.message }
  const { error } = await sb.from('filhos').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function sbLoadObrigacoes(): Promise<
  | { ok: true; rows: ObrigacaoRow[] }
  | { ok: false; error: string }
> {
  const sb = getSupabaseBrowser()
  if (!sb) return { ok: false, error: 'supabase_unconfigured' }
  const { data, error } = await sb.from('obrigacoes').select('*').order('data')
  if (error) {
    if (error.code === 'PGRST301' || error.message.includes('JWT')) {
      return { ok: false, error: 'unauthorized' }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true, rows: (data ?? []) as ObrigacaoRow[] }
}

export async function sbCreateObrigacao(
  o: Omit<Obrigacao, 'id'> & { id?: string },
): Promise<{ ok: true; row: ObrigacaoRow } | { ok: false; error: string }> {
  if (!isDbUuid(o.filhoId)) return { ok: false, error: 'invalid_id' }
  const sb = getSupabaseBrowser()
  if (!sb) return { ok: false, error: 'supabase_unconfigured' }
  const { data, error } = await sb
    .from('obrigacoes')
    .insert({
      filho_id: o.filhoId,
      tipo_id: o.tipoId,
      data: o.data,
      ultima_data: o.ultimaData ?? null,
      itens: o.itens ?? [],
      nome: o.nome?.trim() || null,
      observacoes: o.observacoes?.trim() || null,
      lote_id: o.loteId?.trim() || null,
    })
    .select('*')
    .single()
  if (error || !data) {
    const msg = error?.message ?? 'create_failed'
    if (
      error?.code === '23505' ||
      /duplicate|unique|filho_lote/i.test(msg)
    ) {
      return { ok: false, error: 'already_exists' }
    }
    return { ok: false, error: msg }
  }
  return { ok: true, row: data as ObrigacaoRow }
}

export async function sbUpdateObrigacao(
  id: string,
  patch: Partial<Obrigacao>,
): Promise<{ ok: true; row: ObrigacaoRow } | { ok: false; error: string }> {
  if (!isDbUuid(id) || (patch.filhoId != null && !isDbUuid(patch.filhoId))) {
    return { ok: false, error: 'invalid_id' }
  }
  const sb = getSupabaseBrowser()
  if (!sb) return { ok: false, error: 'supabase_unconfigured' }
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.filhoId != null) body.filho_id = patch.filhoId
  if (patch.tipoId != null) body.tipo_id = patch.tipoId
  if (patch.data != null) body.data = patch.data
  if ('ultimaData' in patch) body.ultima_data = patch.ultimaData ?? null
  if (patch.itens != null) body.itens = patch.itens
  if ('nome' in patch) body.nome = patch.nome?.trim() || null
  if ('observacoes' in patch) body.observacoes = patch.observacoes?.trim() || null
  if ('loteId' in patch) body.lote_id = patch.loteId?.trim() || null
  const { data, error } = await sb
    .from('obrigacoes')
    .update(body)
    .eq('id', id)
    .select('*')
    .single()
  if (error || !data) return { ok: false, error: error?.message ?? 'update_failed' }
  return { ok: true, row: data as ObrigacaoRow }
}

export async function sbDeleteObrigacao(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isDbUuid(id)) return { ok: false, error: 'invalid_id' }
  const sb = getSupabaseBrowser()
  if (!sb) return { ok: false, error: 'supabase_unconfigured' }
  const { error } = await sb.from('obrigacoes').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function sbLoadCobrancas(): Promise<
  | { ok: true; cobrancas: CobrancaRow[]; tipos: CobrancaTipoRow[] }
  | { ok: false; error: string }
> {
  const sb = getSupabaseBrowser()
  if (!sb) return { ok: false, error: 'supabase_unconfigured' }
  const [c, t] = await Promise.all([
    sb.from('cobrancas').select('*').order('vencimento'),
    sb.from('cobranca_tipos').select('*').order('nome'),
  ])
  if (c.error) {
    if (c.error.code === 'PGRST301' || c.error.message.includes('JWT')) {
      return { ok: false, error: 'unauthorized' }
    }
    return { ok: false, error: c.error.message }
  }
  if (t.error) return { ok: false, error: t.error.message }
  return {
    ok: true,
    cobrancas: (c.data ?? []) as CobrancaRow[],
    tipos: (t.data ?? []) as CobrancaTipoRow[],
  }
}

export async function sbCreateCobranca(
  cobranca: CobrancaInput,
): Promise<{ ok: true; row: CobrancaRow } | { ok: false; error: string }> {
  if (!isDbUuid(cobranca.filhoId)) return { ok: false, error: 'invalid_id' }
  const sb = getSupabaseBrowser()
  if (!sb) return { ok: false, error: 'supabase_unconfigured' }
  const { data, error } = await sb
    .from('cobrancas')
    .insert({
      filho_id: cobranca.filhoId,
      tipo_id: cobranca.tipoId ?? null,
      tipo_nome: cobranca.tipoNome,
      categoria: cobranca.categoria,
      valor: cobranca.valor,
      vencimento: cobranca.vencimento,
      dia_vencimento: cobranca.diaVencimento ?? null,
      referencia: cobranca.referencia ?? null,
      descricao: cobranca.descricao ?? null,
      pago: cobranca.pago ?? false,
    })
    .select('*')
    .single()
  if (error || !data) return { ok: false, error: error?.message ?? 'create_failed' }
  return { ok: true, row: data as CobrancaRow }
}

export async function sbUpdateCobranca(
  id: string,
  patch: Partial<CobrancaInput> & { pago?: boolean },
): Promise<{ ok: true; row: CobrancaRow } | { ok: false; error: string }> {
  if (!isDbUuid(id) || (patch.filhoId != null && !isDbUuid(patch.filhoId))) {
    return { ok: false, error: 'invalid_id' }
  }
  const sb = getSupabaseBrowser()
  if (!sb) return { ok: false, error: 'supabase_unconfigured' }
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.filhoId != null) body.filho_id = patch.filhoId
  if (patch.tipoId !== undefined) body.tipo_id = patch.tipoId ?? null
  if (patch.tipoNome != null) body.tipo_nome = patch.tipoNome
  if (patch.categoria != null) body.categoria = patch.categoria
  if (patch.valor != null) body.valor = patch.valor
  if (patch.vencimento != null) body.vencimento = patch.vencimento
  if (patch.diaVencimento !== undefined) body.dia_vencimento = patch.diaVencimento ?? null
  if (patch.referencia !== undefined) body.referencia = patch.referencia ?? null
  if (patch.descricao !== undefined) body.descricao = patch.descricao ?? null
  if (patch.pago != null) {
    body.pago = patch.pago
    body.pago_em = patch.pago ? new Date().toISOString() : null
  }
  const { data, error } = await sb
    .from('cobrancas')
    .update(body)
    .eq('id', id)
    .select('*')
    .single()
  if (error || !data) return { ok: false, error: error?.message ?? 'update_failed' }
  return { ok: true, row: data as CobrancaRow }
}

export async function sbDeleteCobranca(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isDbUuid(id)) return { ok: false, error: 'invalid_id' }
  const sb = getSupabaseBrowser()
  if (!sb) return { ok: false, error: 'supabase_unconfigured' }
  const { error } = await sb.from('cobrancas').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function sbCreateCobrancaTipo(input: {
  nome: string
  categoria: CobrancaCategoria
}): Promise<{ ok: true; row: CobrancaTipoRow } | { ok: false; error: string }> {
  const sb = getSupabaseBrowser()
  if (!sb) return { ok: false, error: 'supabase_unconfigured' }
  const { data, error } = await sb
    .from('cobranca_tipos')
    .insert({ nome: input.nome, categoria: input.categoria, ativo: true })
    .select('*')
    .single()
  if (error || !data) return { ok: false, error: error?.message ?? 'create_failed' }
  return { ok: true, row: data as CobrancaTipoRow }
}

export async function sbUpdateCobrancaTipo(
  id: string,
  patch: { nome?: string; categoria?: CobrancaCategoria; ativo?: boolean },
): Promise<{ ok: true; row: CobrancaTipoRow } | { ok: false; error: string }> {
  const sb = getSupabaseBrowser()
  if (!sb) return { ok: false, error: 'supabase_unconfigured' }
  const body: Record<string, unknown> = {}
  if (patch.nome != null) body.nome = patch.nome.trim()
  if (patch.categoria != null) body.categoria = patch.categoria
  if (patch.ativo != null) body.ativo = patch.ativo
  if (Object.keys(body).length === 0) {
    return { ok: false, error: 'empty_patch' }
  }
  const { data, error } = await sb
    .from('cobranca_tipos')
    .update(body)
    .eq('id', id)
    .select('*')
    .single()
  if (error || !data) return { ok: false, error: error?.message ?? 'update_failed' }
  if (typeof body.nome === 'string') {
    await sb
      .from('cobrancas')
      .update({ tipo_nome: body.nome, updated_at: new Date().toISOString() })
      .eq('tipo_id', id)
  }
  return { ok: true, row: data as CobrancaTipoRow }
}
