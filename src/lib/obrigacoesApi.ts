import type { Obrigacao, ObrigacaoItem, ObligationTypeId } from '../types'
import { parseDbSource, type RemoteDbSource } from './dbSource'
import { supabaseBrowserConfigured } from './supabaseBrowser'
import {
  sbCreateObrigacao,
  sbDeleteObrigacao,
  sbLoadObrigacoes,
  sbUpdateObrigacao,
} from './supabaseData'

export type ObrigacaoRow = {
  id: string
  filho_id: string
  tipo_id: string
  data: string
  ultima_data: string | null
  itens: unknown
  nome?: string | null
  observacoes?: string | null
  lote_id?: string | null
}

export function normalizeItens(raw: unknown): ObrigacaoItem[] {
  if (!Array.isArray(raw)) return []
  const out: ObrigacaoItem[] = []
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

export function cleanItens(itens: ObrigacaoItem[] | undefined): ObrigacaoItem[] {
  return (itens ?? [])
    .map((i) => {
      const observacao = i.observacao?.trim()
      return {
        nome: i.nome.trim(),
        quantidade: Number(i.quantidade) > 0 ? Number(i.quantidade) : 1,
        ...(observacao ? { observacao } : {}),
      }
    })
    .filter((i) => i.nome)
}

export function rowToObrigacao(row: ObrigacaoRow): Obrigacao {
  const nome = row.nome != null ? String(row.nome).trim() : ''
  const observacoes =
    row.observacoes != null ? String(row.observacoes).trim() : ''
  const loteId = row.lote_id != null ? String(row.lote_id).trim() : ''
  return {
    id: row.id,
    filhoId: row.filho_id,
    tipoId: row.tipo_id as ObligationTypeId,
    data: (row.data ?? '').toString().slice(0, 10),
    ultimaData: row.ultima_data
      ? String(row.ultima_data).slice(0, 10)
      : undefined,
    itens: normalizeItens(row.itens),
    ...(nome ? { nome } : {}),
    ...(observacoes ? { observacoes } : {}),
    ...(loteId ? { loteId } : {}),
  }
}

export function obrigacaoToPayload(o: Omit<Obrigacao, 'id'> & { id?: string }) {
  return {
    filhoId: o.filhoId,
    tipoId: o.tipoId,
    data: o.data,
    ultimaData: o.ultimaData,
    itens: cleanItens(o.itens),
    nome: o.nome?.trim() || undefined,
    observacoes: o.observacoes?.trim() || undefined,
    loteId: o.loteId?.trim() || undefined,
  }
}

export async function loadObrigacoesFromApi(): Promise<
  | { source: RemoteDbSource; obrigacoes: Obrigacao[] }
  | { source: 'error'; obrigacoes: Obrigacao[]; error: string }
> {
  if (supabaseBrowserConfigured()) {
    const remote = await sbLoadObrigacoes()
    if (remote.ok === false) {
      return { source: 'error', obrigacoes: [], error: remote.error }
    }
    return {
      source: 'supabase',
      obrigacoes: remote.rows.map(rowToObrigacao),
    }
  }
  try {
    const res = await fetch('/api/obrigacoes', { credentials: 'same-origin' })
    if (res.status === 401) {
      return { source: 'error', obrigacoes: [], error: 'unauthorized' }
    }
    if (!res.ok) {
      return { source: 'error', obrigacoes: [], error: `http_${res.status}` }
    }
    const data = (await res.json()) as {
      source?: string
      obrigacoes?: ObrigacaoRow[]
    }
    return {
      source: parseDbSource(data.source),
      obrigacoes: (data.obrigacoes ?? []).map(rowToObrigacao),
    }
  } catch {
    return { source: 'error', obrigacoes: [], error: 'network' }
  }
}

export async function createObrigacaoViaApi(
  obrigacao: Omit<Obrigacao, 'id'> & { id?: string },
): Promise<
  | { ok: true; obrigacao: Obrigacao; source: RemoteDbSource }
  | { ok: false; error: string }
> {
  if (supabaseBrowserConfigured()) {
    const remote = await sbCreateObrigacao(obrigacao)
    if (remote.ok === false) return { ok: false, error: remote.error }
    return {
      ok: true,
      obrigacao: rowToObrigacao(remote.row),
      source: 'supabase',
    }
  }
  try {
    const res = await fetch('/api/obrigacoes', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(obrigacaoToPayload(obrigacao)),
    })
    const data = (await res.json()) as {
      obrigacao?: ObrigacaoRow
      error?: string
      source?: string
    }
    if (!res.ok || !data.obrigacao) {
      return { ok: false, error: data.error ?? `http_${res.status}` }
    }
    return {
      ok: true,
      obrigacao: rowToObrigacao(data.obrigacao),
      source: parseDbSource(data.source),
    }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export async function updateObrigacaoViaApi(
  id: string,
  patch: Partial<Obrigacao>,
): Promise<
  | { ok: true; obrigacao: Obrigacao; source: RemoteDbSource }
  | { ok: false; error: string }
> {
  if (supabaseBrowserConfigured()) {
    const remote = await sbUpdateObrigacao(id, patch)
    if (remote.ok === false) return { ok: false, error: remote.error }
    return {
      ok: true,
      obrigacao: rowToObrigacao(remote.row),
      source: 'supabase',
    }
  }
  try {
    const body: Record<string, unknown> = {}
    if (patch.filhoId != null) body.filhoId = patch.filhoId
    if (patch.tipoId != null) body.tipoId = patch.tipoId
    if (patch.data != null) body.data = patch.data
    if ('ultimaData' in patch) body.ultimaData = patch.ultimaData
    if (patch.itens != null) body.itens = cleanItens(patch.itens)
    if ('nome' in patch) body.nome = patch.nome
    if ('observacoes' in patch) body.observacoes = patch.observacoes
    if ('loteId' in patch) body.loteId = patch.loteId
    const res = await fetch(`/api/obrigacoes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await res.json()) as {
      obrigacao?: ObrigacaoRow
      error?: string
      source?: string
    }
    if (!res.ok || !data.obrigacao) {
      return { ok: false, error: data.error ?? `http_${res.status}` }
    }
    return {
      ok: true,
      obrigacao: rowToObrigacao(data.obrigacao),
      source: parseDbSource(data.source),
    }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export async function deleteObrigacaoViaApi(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (supabaseBrowserConfigured()) {
    const remote = await sbDeleteObrigacao(id)
    if (remote.ok === false) return { ok: false, error: remote.error }
    return { ok: true }
  }
  try {
    const res = await fetch(`/api/obrigacoes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    })
    const data = (await res.json()) as { error?: string }
    if (!res.ok) {
      return { ok: false, error: data.error ?? `http_${res.status}` }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'network' }
  }
}
