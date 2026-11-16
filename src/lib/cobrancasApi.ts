import type {
  Cobranca,
  CobrancaCategoria,
  CobrancaInput,
  CobrancaTipo,
} from '../types'
import { parseDbSource, type RemoteDbSource } from './dbSource'

export type CobrancaTipoRow = {
  id: string
  nome: string
  categoria: string
  ativo: boolean
}

export type CobrancaRow = {
  id: string
  filho_id: string
  tipo_id: string | null
  tipo_nome: string
  categoria: string
  valor: string | number
  vencimento: string
  dia_vencimento: number | null
  referencia: string | null
  descricao: string | null
  pago: boolean
  pago_em: string | null
}

const LOCAL_KEYS = ['sr-omulu.cobrancas.v1', 'sr-omulu.cobrancas.v0']

/** Remove any leftover browser caches that held financeiro PII. */
export function clearLocalCobrancasCache() {
  for (const key of LOCAL_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  }
}

function asCategoria(raw: string): CobrancaCategoria {
  if (raw === 'mensalidade' || raw === 'contribuicao' || raw === 'outro') {
    return raw
  }
  return 'outro'
}

export function rowToCobrancaTipo(row: CobrancaTipoRow): CobrancaTipo {
  return {
    id: row.id,
    nome: row.nome,
    categoria: asCategoria(row.categoria),
    ativo: Boolean(row.ativo),
  }
}

export function rowToCobranca(row: CobrancaRow): Cobranca {
  return {
    id: row.id,
    filhoId: row.filho_id,
    tipoId: row.tipo_id ?? undefined,
    tipoNome: row.tipo_nome,
    categoria: asCategoria(row.categoria),
    valor: Number(row.valor),
    vencimento: String(row.vencimento).slice(0, 10),
    diaVencimento: row.dia_vencimento ?? undefined,
    referencia: row.referencia ?? undefined,
    descricao: row.descricao ?? undefined,
    pago: Boolean(row.pago),
    pagoEm: row.pago_em ?? undefined,
  }
}

export function cobrancaToPayload(c: CobrancaInput) {
  return {
    filhoId: c.filhoId,
    tipoId: c.tipoId,
    tipoNome: c.tipoNome,
    categoria: c.categoria,
    valor: c.valor,
    vencimento: c.vencimento,
    diaVencimento: c.diaVencimento,
    referencia: c.referencia,
    descricao: c.descricao,
    pago: c.pago ?? false,
  }
}

export async function loadCobrancasFromApi(): Promise<
  | {
      source: RemoteDbSource
      cobrancas: Cobranca[]
      tipos: CobrancaTipo[]
    }
  | { source: 'error'; cobrancas: Cobranca[]; tipos: CobrancaTipo[]; error: string }
> {
  clearLocalCobrancasCache()
  try {
    const res = await fetch('/api/cobrancas', { credentials: 'same-origin' })
    if (res.status === 401) {
      return { source: 'error', cobrancas: [], tipos: [], error: 'unauthorized' }
    }
    if (!res.ok) {
      return {
        source: 'error',
        cobrancas: [],
        tipos: [],
        error: `http_${res.status}`,
      }
    }
    const data = (await res.json()) as {
      source?: string
      cobrancas?: CobrancaRow[]
      tipos?: CobrancaTipoRow[]
    }
    return {
      source: parseDbSource(data.source),
      cobrancas: (data.cobrancas ?? []).map(rowToCobranca),
      tipos: (data.tipos ?? []).map(rowToCobrancaTipo),
    }
  } catch {
    return { source: 'error', cobrancas: [], tipos: [], error: 'network' }
  }
}

export async function createCobrancaViaApi(
  cobranca: CobrancaInput,
): Promise<
  | { ok: true; cobranca: Cobranca; source: RemoteDbSource }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch('/api/cobrancas', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cobrancaToPayload(cobranca)),
    })
    const data = (await res.json()) as {
      cobranca?: CobrancaRow
      error?: string
      source?: string
    }
    if (!res.ok || !data.cobranca) {
      return { ok: false, error: data.error ?? `http_${res.status}` }
    }
    return {
      ok: true,
      cobranca: rowToCobranca(data.cobranca),
      source: parseDbSource(data.source),
    }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export async function updateCobrancaViaApi(
  id: string,
  patch: Partial<CobrancaInput> & { pago?: boolean },
): Promise<
  | { ok: true; cobranca: Cobranca; source: RemoteDbSource }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch(`/api/cobrancas/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const data = (await res.json()) as {
      cobranca?: CobrancaRow
      error?: string
      source?: string
    }
    if (!res.ok || !data.cobranca) {
      return { ok: false, error: data.error ?? `http_${res.status}` }
    }
    return {
      ok: true,
      cobranca: rowToCobranca(data.cobranca),
      source: parseDbSource(data.source),
    }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export async function createCobrancaTipoViaApi(input: {
  nome: string
  categoria: CobrancaCategoria
}): Promise<
  | { ok: true; tipo: CobrancaTipo; source: RemoteDbSource }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch('/api/cobranca-tipos', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    const data = (await res.json()) as {
      tipo?: CobrancaTipoRow
      error?: string
      source?: string
    }
    if (!res.ok || !data.tipo) {
      return { ok: false, error: data.error ?? `http_${res.status}` }
    }
    return {
      ok: true,
      tipo: rowToCobrancaTipo(data.tipo),
      source: parseDbSource(data.source),
    }
  } catch {
    return { ok: false, error: 'network' }
  }
}

/** No longer reads PII from localStorage; clears leftover keys. */
export function loadLocalCobrancas(): Cobranca[] {
  clearLocalCobrancasCache()
  return []
}

/** No longer writes PII to localStorage; clears leftover keys. */
export function saveLocalCobrancas(_cobrancas: Cobranca[]) {
  clearLocalCobrancasCache()
}
