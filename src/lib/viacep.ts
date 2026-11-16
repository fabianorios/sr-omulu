import type { Endereco } from '../types'

export type ViaCepResult =
  | { ok: true; partial: Pick<Endereco, 'logradouro' | 'bairro' | 'cidade' | 'uf' | 'cep'> }
  | { ok: false; error: string }

function digitsOnly(cep: string): string {
  return cep.replace(/\D/g, '')
}

export function formatCep(cep: string): string {
  const d = digitsOnly(cep).slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export async function lookupCep(cep: string): Promise<ViaCepResult> {
  const d = digitsOnly(cep)
  if (d.length !== 8) {
    return { ok: false, error: 'CEP deve ter 8 dígitos.' }
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`)
    if (!res.ok) {
      return { ok: false, error: 'Falha ao consultar o ViaCEP.' }
    }
    const data = (await res.json()) as {
      erro?: boolean
      cep?: string
      logradouro?: string
      bairro?: string
      localidade?: string
      uf?: string
    }
    if (data.erro) {
      return { ok: false, error: 'CEP não encontrado.' }
    }
    return {
      ok: true,
      partial: {
        cep: formatCep(data.cep ?? d),
        logradouro: data.logradouro ?? '',
        bairro: data.bairro ?? '',
        cidade: data.localidade ?? '',
        uf: data.uf ?? '',
      },
    }
  } catch {
    return { ok: false, error: 'Sem conexão com o ViaCEP.' }
  }
}
