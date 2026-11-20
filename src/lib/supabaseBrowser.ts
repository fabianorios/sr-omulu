import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type BrowserProfile = {
  id: string
  nome: string
  role: 'admin' | 'medium'
  email: string | null
  cpf: string | null
  celular: string | null
  filhoId: string | null
}

let client: SupabaseClient | null | undefined

export function supabaseBrowserConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
  return Boolean(url && anon)
}

/** Browser Supabase client (anon key only). Null when VITE_* unset (local /api mode). */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (!supabaseBrowserConfigured()) return null
  if (client !== undefined) return client
  const url = import.meta.env.VITE_SUPABASE_URL!.trim()
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!.trim()
  client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  return client
}

export function mapProfile(raw: unknown): BrowserProfile | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const role = r.role === 'admin' ? 'admin' : r.role === 'medium' ? 'medium' : null
  if (!role || !r.id || !r.nome) return null
  return {
    id: String(r.id),
    nome: String(r.nome),
    role,
    email: r.email != null ? String(r.email) : null,
    cpf: r.cpf != null ? String(r.cpf) : null,
    celular: r.celular != null ? String(r.celular) : null,
    filhoId: r.filhoId != null ? String(r.filhoId) : null,
  }
}

export function rpcErrorCode(error: { message?: string } | null): string {
  const msg = (error?.message ?? '').toLowerCase()
  if (msg.includes('bootstrap_closed')) return 'bootstrap_closed'
  if (msg.includes('invalid_bootstrap_secret')) return 'invalid_bootstrap_secret'
  if (msg.includes('bootstrap_unavailable')) return 'bootstrap_unavailable'
  if (msg.includes('not_authenticated')) return 'not_authenticated'
  if (msg.includes('nome_required')) return 'nome_identificador_senha_min_8'
  if (msg.includes('email')) return 'invalid_credentials'
  return 'auth_failed'
}
