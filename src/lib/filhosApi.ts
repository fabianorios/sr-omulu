import {
  isMaeDeCabeca,
  isPaiDeCabeca,
  type MaeDeCabeca,
  type PaiDeCabeca,
} from '../data/catalog'
import type { EntidadeLinha, Filho, FilhoInput } from '../types'
import { emptyEndereco } from '../types'
import { normalizeEntidades, sanitizeEntidadesForSave } from './entidades'

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

const LOCAL_KEY = 'sr-omulu.filhos.v3'

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
  | { source: 'postgres' | 'pglite'; filhos: Filho[] }
  | { source: 'error'; filhos: Filho[]; error: string }

export async function loadFilhosFromApi(): Promise<LoadFilhosResult> {
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
    const source = data.source === 'postgres' ? 'postgres' : 'pglite'
    return {
      source,
      filhos: (data.filhos ?? []).map(rowToFilho),
    }
  } catch {
    return { source: 'error', filhos: [], error: 'network' }
  }
}

export async function createFilhoViaApi(
  filho: FilhoInput,
): Promise<
  | { ok: true; filho: Filho; source: 'postgres' | 'pglite' }
  | { ok: false; error: string }
> {
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
      source: data.source === 'postgres' ? 'postgres' : 'pglite',
    }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export async function updateFilhoViaApi(
  id: string,
  filho: FilhoInput,
): Promise<
  | { ok: true; filho: Filho; source: 'postgres' | 'pglite' }
  | { ok: false; error: string }
> {
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
      source: data.source === 'postgres' ? 'postgres' : 'pglite',
    }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export function loadLocalFilhos(): Filho[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<
      Filho & { guias?: string[]; entidades?: EntidadeLinha[] }
    >
    if (!Array.isArray(parsed)) return []
    return parsed.map((f) => ({
      ...f,
      paiDeCabeca: fallbackPai(f.paiDeCabeca),
      maeDeCabeca: fallbackMae(f.maeDeCabeca),
      entidades:
        f.entidades && f.entidades.length > 0
          ? normalizeEntidades(f.entidades)
          : normalizeEntidades(f.guias ?? []),
    }))
  } catch {
    return []
  }
}

export function saveLocalFilhos(filhos: Filho[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(filhos))
}
