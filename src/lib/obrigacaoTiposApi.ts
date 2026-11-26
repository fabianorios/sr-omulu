import type { ObligationType, ObrigacaoItem } from '../types'
import { parseDbSource, type RemoteDbSource } from './dbSource'
import { normalizeItens } from './obrigacoesApi'
import { supabaseBrowserConfigured } from './supabaseBrowser'
import {
  sbCreateObrigacaoTipo,
  sbDeleteObrigacaoTipo,
  sbLoadObrigacaoTipos,
  sbUpdateObrigacaoTipo,
  type ObrigacaoTipoRow,
} from './supabaseData'

export type { ObrigacaoTipoRow }

export function rowToObligationType(row: ObrigacaoTipoRow): ObligationType {
  const itensPadrao = normalizeItens(row.itens_padrao)
  const years =
    row.years_offset == null || Number.isNaN(Number(row.years_offset))
      ? null
      : Number(row.years_offset)
  return {
    id: row.id,
    name: String(row.nome ?? '').trim() || row.id,
    description: String(row.description ?? '').trim(),
    yearsOffset: years != null && years > 0 ? years : null,
    isFestiva: Boolean(row.is_festiva),
    color: String(row.color ?? '').trim() || '#6B5B4A',
    active: row.ativo !== false,
    ...(itensPadrao.length > 0 ? { itensPadrao } : {}),
  }
}

export type ObrigacaoTipoInput = {
  id?: string
  name: string
  description?: string
  yearsOffset?: number | null
  isFestiva?: boolean
  color?: string
  active?: boolean
  itensPadrao?: ObrigacaoItem[]
}

export async function loadObrigacaoTiposFromApi(): Promise<
  | { source: RemoteDbSource; tipos: ObligationType[] }
  | { source: 'error'; tipos: ObligationType[]; error: string }
> {
  if (supabaseBrowserConfigured()) {
    const remote = await sbLoadObrigacaoTipos()
    if (remote.ok === false) {
      return { source: 'error', tipos: [], error: remote.error }
    }
    return {
      source: 'supabase',
      tipos: remote.rows.map(rowToObligationType),
    }
  }
  try {
    const res = await fetch('/api/obrigacao-tipos', {
      credentials: 'same-origin',
    })
    if (res.status === 401) {
      return { source: 'error', tipos: [], error: 'unauthorized' }
    }
    if (!res.ok) {
      return { source: 'error', tipos: [], error: `http_${res.status}` }
    }
    const data = (await res.json()) as {
      source?: string
      tipos?: ObrigacaoTipoRow[]
    }
    return {
      source: parseDbSource(data.source),
      tipos: (data.tipos ?? []).map(rowToObligationType),
    }
  } catch {
    return { source: 'error', tipos: [], error: 'network' }
  }
}

export async function createObrigacaoTipoViaApi(
  input: ObrigacaoTipoInput,
): Promise<
  | { ok: true; tipo: ObligationType; source: RemoteDbSource }
  | { ok: false; error: string }
> {
  if (supabaseBrowserConfigured()) {
    const remote = await sbCreateObrigacaoTipo(input)
    if (remote.ok === false) return { ok: false, error: remote.error }
    return {
      ok: true,
      tipo: rowToObligationType(remote.row),
      source: 'supabase',
    }
  }
  try {
    const res = await fetch('/api/obrigacao-tipos', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        id: input.id,
        nome: input.name,
        description: input.description ?? '',
        yearsOffset: input.yearsOffset ?? null,
        isFestiva: input.isFestiva ?? false,
        color: input.color ?? '#6B5B4A',
        itensPadrao: input.itensPadrao ?? [],
      }),
    })
    const data = (await res.json()) as {
      tipo?: ObrigacaoTipoRow
      error?: string
      source?: string
    }
    if (!res.ok || !data.tipo) {
      return { ok: false, error: data.error ?? `http_${res.status}` }
    }
    return {
      ok: true,
      tipo: rowToObligationType(data.tipo),
      source: parseDbSource(data.source),
    }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export async function updateObrigacaoTipoViaApi(
  id: string,
  patch: Partial<ObrigacaoTipoInput> & { active?: boolean },
): Promise<
  | { ok: true; tipo: ObligationType; source: RemoteDbSource }
  | { ok: false; error: string }
> {
  if (supabaseBrowserConfigured()) {
    const remote = await sbUpdateObrigacaoTipo(id, patch)
    if (remote.ok === false) return { ok: false, error: remote.error }
    return {
      ok: true,
      tipo: rowToObligationType(remote.row),
      source: 'supabase',
    }
  }
  try {
    const body: Record<string, unknown> = {}
    if (patch.name != null) body.nome = patch.name
    if (patch.description != null) body.description = patch.description
    if ('yearsOffset' in patch) body.yearsOffset = patch.yearsOffset
    if (patch.isFestiva != null) body.isFestiva = patch.isFestiva
    if (patch.color != null) body.color = patch.color
    if (patch.active != null) body.ativo = patch.active
    if (patch.itensPadrao != null) body.itensPadrao = patch.itensPadrao
    const res = await fetch(
      `/api/obrigacao-tipos/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      },
    )
    const data = (await res.json()) as {
      tipo?: ObrigacaoTipoRow
      error?: string
      source?: string
    }
    if (!res.ok || !data.tipo) {
      return { ok: false, error: data.error ?? `http_${res.status}` }
    }
    return {
      ok: true,
      tipo: rowToObligationType(data.tipo),
      source: parseDbSource(data.source),
    }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export async function deleteObrigacaoTipoViaApi(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (supabaseBrowserConfigured()) {
    const remote = await sbDeleteObrigacaoTipo(id)
    if (remote.ok === false) return { ok: false, error: remote.error }
    return { ok: true }
  }
  try {
    const res = await fetch(
      `/api/obrigacao-tipos/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        credentials: 'same-origin',
      },
    )
    const data = (await res.json()) as { error?: string }
    if (!res.ok) {
      return { ok: false, error: data.error ?? `http_${res.status}` }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'network' }
  }
}
