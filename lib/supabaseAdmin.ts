import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type FilhoRow = {
  id: string
  nome: string
  orixa: string
  pai_de_cabeca: string | null
  mae_de_cabeca: string | null
  guias: string[] | null
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
  created_at?: string
  updated_at?: string
}

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  )
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim() ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ''
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
      ...headers,
    },
  })
}
