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

/**
 * Production static host (Cloudflare Pages) without VITE_* baked at build time.
 * In that case /api/* does not exist — skip fetches and fail fast in the UI.
 */
export function pagesMissingViteConfig(): boolean {
  return !import.meta.env.DEV && !supabaseBrowserConfigured()
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
  let value: unknown = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (!value || typeof value !== 'object') return null
  const r = value as Record<string, unknown>
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

export function rpcErrorCode(error: {
  message?: string
  code?: string
  details?: string
  hint?: string
} | null): { code: string; detail: string } {
  const detail = [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(' · ')
  const msg = (error?.message ?? '').toLowerCase()
  if (msg.includes('bootstrap_closed')) {
    return { code: 'bootstrap_closed', detail }
  }
  if (msg.includes('invalid_bootstrap_secret')) {
    return { code: 'invalid_bootstrap_secret', detail }
  }
  if (msg.includes('bootstrap_unavailable')) {
    return { code: 'bootstrap_unavailable', detail }
  }
  if (msg.includes('not_authenticated')) {
    return { code: 'not_authenticated', detail }
  }
  if (msg.includes('nome_required')) {
    return { code: 'nome_identificador_senha_min_8', detail }
  }
  // Do not map arbitrary "email" substrings to invalid_credentials —
  // claim/Auth errors often mention email without being a bad password.
  return { code: 'auth_failed', detail: detail || 'auth_failed' }
}

function isEmailNotConfirmed(error: {
  message?: string
  code?: string
} | null): boolean {
  if (!error) return false
  if (error.code === 'email_not_confirmed') return true
  const msg = (error.message ?? '').toLowerCase()
  return msg.includes('email not confirmed') || msg.includes('confirm your email')
}

/**
 * Ensure a browser session for bootstrap.
 * Supabase often returns signUp "success" with no session when the e-mail
 * already exists (anti-enumeration) — that is NOT email confirmation.
 */
export async function ensureBootstrapSession(
  sb: SupabaseClient,
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: signData, error: signError } = await sb.auth.signUp({
    email,
    password,
  })
  if (signData.session) return { ok: true }

  const { data: inData, error: inErr } = await sb.auth.signInWithPassword({
    email,
    password,
  })
  if (inData.session) return { ok: true }

  if (isEmailNotConfirmed(inErr) || isEmailNotConfirmed(signError)) {
    return { ok: false, error: 'email_confirm_required' }
  }

  // Duplicate signUp: no error, no session, empty identities → must sign in
  const identities = signData.user?.identities
  if (
    !signError &&
    signData.user &&
    Array.isArray(identities) &&
    identities.length === 0
  ) {
    return { ok: false, error: 'account_exists_wrong_password' }
  }

  if (inErr) {
    const msg = (inErr.message ?? '').toLowerCase()
    if (msg.includes('invalid') || msg.includes('credentials')) {
      return { ok: false, error: 'account_exists_wrong_password' }
    }
    return { ok: false, error: 'invalid_credentials' }
  }

  if (signError) {
    return { ok: false, error: 'bootstrap_failed' }
  }

  return { ok: false, error: 'session_required' }
}
