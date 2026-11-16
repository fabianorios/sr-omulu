import { isTipoEntidade, type TipoEntidade } from '../data/catalog'
import type { EntidadeLinha } from '../types'
import { emptyEntidadeLinha } from '../types'

export function normalizeEntidades(raw: unknown): EntidadeLinha[] {
  if (!Array.isArray(raw)) return []
  const out: EntidadeLinha[] = []
  for (const item of raw) {
    if (typeof item === 'string') {
      // Legacy guias: string type only
      if (isTipoEntidade(item)) {
        out.push({ tipo: item, nome: '' })
      }
      continue
    }
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const tipoRaw = String(rec.tipo ?? rec.entidade ?? '').trim()
    const nome = String(rec.nome ?? '').trim()
    if (!isTipoEntidade(tipoRaw)) continue
    out.push({ tipo: tipoRaw as TipoEntidade, nome })
  }
  return out
}

export function sanitizeEntidadesForSave(
  rows: EntidadeLinha[],
): EntidadeLinha[] {
  return rows
    .map((r) => ({
      tipo: r.tipo,
      nome: r.nome.trim(),
    }))
    .filter((r) => isTipoEntidade(r.tipo))
}

export function ensureEntidadeRows(rows: EntidadeLinha[]): EntidadeLinha[] {
  return rows.length > 0 ? rows : [emptyEntidadeLinha()]
}
