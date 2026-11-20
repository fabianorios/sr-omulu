import {
  isMaeDeCabeca,
  isPaiDeCabeca,
  type MaeDeCabeca,
  type PaiDeCabeca,
} from '../data/catalog'
import type { EntidadeLinha, Filho, FilhoInput } from '../types'
import { emptyEndereco } from '../types'
import { parseDbSource, type RemoteDbSource } from './dbSource'
import { normalizeEntidades, sanitizeEntidadesForSave } from './entidades'
import { supabaseBrowserConfigured } from './supabaseBrowser'
import { sbCreateFilho, sbLoadFilhos, sbUpdateFilho } from './supabaseData'

/** Shape returned by /api/filhos (snake_case from Postgres). */
export type FilhoRow = {
  id: string
  nome: string
  orixa?: string | null
  pai_de_cabeca: string | null
  mae_de_cabeca: string | null
  guias?: string[] | null
  entidades?: unknown
  data_nascimento: string | null
  data_entrada: string | null
  iniciacao: string | null
  telefone1: string | null
  telefone2: string | null
  email: string | null
  endereco_cep: string | null
  endereco_logradouro: string | null
  endereco_numero: string | null
  endereco_complemento: string | null
  endereco_bairro: string | null
  endereco_cidade: string | null
  endereco_uf: string | null
}

const LOCAL_KEYS = [
  'sr-omulu.filhos.v3',
  'sr-omulu.filhos.v2',
  'sr-omulu.filhos.v1',
]

/** Remove any leftover browser caches that held cadastro PII. */
export function clearLocalFilhosCache() {
  for (const key of LOCAL_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  }
}

function asDateInput(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 10)
}

function fallbackPai(raw: string | null | undefined): PaiDeCabeca {
  if (raw && isPaiDeCabeca(raw)) return raw
  return 'Omulu'
}

function fallbackMae(raw: string | null | undefined): MaeDeCabeca {
  if (raw && isMaeDeCabeca(raw)) return raw
  return 'Oxum'
}

function entidadesFromRow(row: FilhoRow): EntidadeLinha[] {
  const fromJson = normalizeEntidades(row.entidades)
  if (fromJson.length > 0) return fromJson
  return normalizeEntidades(row.guias ?? [])
}

export function rowToFilho(row: FilhoRow): Filho {
  return {
    id: row.id,
    nome: row.nome,
    paiDeCabeca: fallbackPai(row.pai_de_cabeca),
    maeDeCabeca: fallbackMae(row.mae_de_cabeca),
    entidades: entidadesFromRow(row),
    dataNascimento: asDateInput(row.data_nascimento),
    dataEntrada: asDateInput(row.data_entrada),
    iniciacao: asDateInput(row.iniciacao),
    telefone1: row.telefone1 ?? '',
    telefone2: row.telefone2 ?? '',
    email: row.email ?? undefined,
    endereco: {
      cep: row.endereco_cep ?? '',
      logradouro: row.endereco_logradouro ?? '',
      numero: row.endereco_numero ?? '',
      complemento: row.endereco_complemento ?? '',
      bairro: row.endereco_bairro ?? '',
      cidade: row.endereco_cidade ?? '',
      uf: row.endereco_uf ?? '',
    },
  }
}

export function filhoToPayload(filho: FilhoInput) {
  return {
    nome: filho.nome,
    paiDeCabeca: filho.paiDeCabeca,
    maeDeCabeca: filho.maeDeCabeca,
    entidades: sanitizeEntidadesForSave(filho.entidades),
    dataNascimento: filho.dataNascimento,
    dataEntrada: filho.dataEntrada,
    iniciacao: filho.iniciacao,
    telefone1: filho.telefone1,
    telefone2: filho.telefone2,
    email: filho.email,
    endereco: filho.endereco ?? emptyEndereco(),
  }
}

export type LoadFilhosResult =
  | { source: RemoteDbSource; filhos: Filho[] }
  | { source: 'error'; filhos: Filho[]; error: string }

export async function loadFilhosFromApi(): Promise<LoadFilhosResult> {
  clearLocalFilhosCache()
  if (supabaseBrowserConfigured()) {
    const remote = await sbLoadFilhos()
    if (remote.ok === false) {
      return { source: 'error', filhos: [], error: remote.error }
    }
    return {
      source: 'supabase',
      filhos: remote.rows.map(rowToFilho),
    }
  }
  try {
    const res = await fetch('/api/filhos', { credentials: 'same-origin' })
    if (res.status === 401) {
      return { source: 'error', filhos: [], error: 'unauthorized' }
    }
    if (!res.ok) {
      return { source: 'error', filhos: [], error: `http_${res.status}` }
    }
    const data = (await res.json()) as {
      source?: string
      filhos?: FilhoRow[]
    }
    return {
      source: parseDbSource(data.source),
      filhos: (data.filhos ?? []).map(rowToFilho),
    }
  } catch {
    return { source: 'error', filhos: [], error: 'network' }
  }
}

export async function createFilhoViaApi(
  filho: FilhoInput,
): Promise<
  | { ok: true; filho: Filho; source: RemoteDbSource }
  | { ok: false; error: string }
> {
  if (supabaseBrowserConfigured()) {
    const remote = await sbCreateFilho(filho)
    if (remote.ok === false) return { ok: false, error: remote.error }
    return { ok: true, filho: rowToFilho(remote.row), source: 'supabase' }
  }
  try {
    const res = await fetch('/api/filhos', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(filhoToPayload(filho)),
    })
    const data = (await res.json()) as {
      filho?: FilhoRow
      error?: string
      source?: string
    }
    if (!res.ok || !data.filho) {
      return { ok: false, error: data.error ?? `http_${res.status}` }
    }
    return {
      ok: true,
      filho: rowToFilho(data.filho),
      source: parseDbSource(data.source),
    }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export async function updateFilhoViaApi(
  id: string,
  filho: FilhoInput,
): Promise<
  | { ok: true; filho: Filho; source: RemoteDbSource }
  | { ok: false; error: string }
> {
  if (supabaseBrowserConfigured()) {
    const remote = await sbUpdateFilho(id, filho)
    if (remote.ok === false) return { ok: false, error: remote.error }
    return { ok: true, filho: rowToFilho(remote.row), source: 'supabase' }
  }
  try {
    const res = await fetch(`/api/filhos/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(filhoToPayload(filho)),
    })
    const data = (await res.json()) as {
      filho?: FilhoRow
      error?: string
      source?: string
    }
    if (!res.ok || !data.filho) {
      return { ok: false, error: data.error ?? `http_${res.status}` }
    }
    return {
      ok: true,
      filho: rowToFilho(data.filho),
      source: parseDbSource(data.source),
    }
  } catch {
    return { ok: false, error: 'network' }
  }
}

/** No longer reads PII from localStorage; clears leftover keys. */
export function loadLocalFilhos(): Filho[] {
  clearLocalFilhosCache()
  return []
}

/** No longer writes PII to localStorage; clears leftover keys. */
export function saveLocalFilhos(_filhos: Filho[]) {
  clearLocalFilhosCache()
}
