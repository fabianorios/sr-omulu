import type { Obrigacao, ObrigacaoItem, ObligationTypeId } from '../types'

export type ObrigacaoRow = {
  id: string
  filho_id: string
  tipo_id: string
  data: string
  ultima_data: string | null
  itens: unknown
}

function normalizeItens(raw: unknown): ObrigacaoItem[] {
  if (!Array.isArray(raw)) return []
  const out: ObrigacaoItem[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const nome = String(rec.nome ?? '').trim()
    const quantidade = Number(rec.quantidade)
    if (!nome) continue
    out.push({
      nome,
      quantidade: Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 1,
    })
  }
  return out
}

export function rowToObrigacao(row: ObrigacaoRow): Obrigacao {
  return {
    id: row.id,
    filhoId: row.filho_id,
    tipoId: row.tipo_id as ObligationTypeId,
    data: (row.data ?? '').toString().slice(0, 10),
    ultimaData: row.ultima_data
      ? String(row.ultima_data).slice(0, 10)
      : undefined,
    itens: normalizeItens(row.itens),
  }
}

export function obrigacaoToPayload(o: Omit<Obrigacao, 'id'> & { id?: string }) {
  return {
    filhoId: o.filhoId,
    tipoId: o.tipoId,
    data: o.data,
    ultimaData: o.ultimaData,
    itens: (o.itens ?? [])
      .map((i) => ({
        nome: i.nome.trim(),
        quantidade: Number(i.quantidade) > 0 ? Number(i.quantidade) : 1,
      }))
      .filter((i) => i.nome),
  }
}

export async function loadObrigacoesFromApi(): Promise<
  | { source: 'postgres' | 'pglite'; obrigacoes: Obrigacao[] }
  | { source: 'error'; obrigacoes: Obrigacao[]; error: string }
> {
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
      source: data.source === 'postgres' ? 'postgres' : 'pglite',
      obrigacoes: (data.obrigacoes ?? []).map(rowToObrigacao),
    }
  } catch {
    return { source: 'error', obrigacoes: [], error: 'network' }
  }
}

export async function createObrigacaoViaApi(
  obrigacao: Omit<Obrigacao, 'id'> & { id?: string },
): Promise<
  | { ok: true; obrigacao: Obrigacao; source: 'postgres' | 'pglite' }
  | { ok: false; error: string }
> {
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
      source: data.source === 'postgres' ? 'postgres' : 'pglite',
    }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export async function updateObrigacaoViaApi(
  id: string,
  patch: Partial<Obrigacao>,
): Promise<
  | { ok: true; obrigacao: Obrigacao; source: 'postgres' | 'pglite' }
  | { ok: false; error: string }
> {
  try {
    const body: Record<string, unknown> = {}
    if (patch.filhoId != null) body.filhoId = patch.filhoId
    if (patch.tipoId != null) body.tipoId = patch.tipoId
    if (patch.data != null) body.data = patch.data
    if ('ultimaData' in patch) body.ultimaData = patch.ultimaData
    if (patch.itens != null) body.itens = patch.itens
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
      source: data.source === 'postgres' ? 'postgres' : 'pglite',
    }
  } catch {
    return { ok: false, error: 'network' }
  }
}
