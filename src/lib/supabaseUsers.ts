import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AppRole, AuthUser } from '../context/AuthContext'
import {
  getSupabaseBrowser,
  mapProfile,
  rpcErrorCode,
  supabaseBrowserConfigured,
} from './supabaseBrowser'

type UsuarioRow = {
  id: string
  nome: string
  role: string
  email: string | null
  cpf: string | null
  celular: string | null
  filho_id: string | null
  ativo: boolean
}

/** Ephemeral Auth client: never touches the admin session in localStorage. */
function createEphemeralAuthClient(): SupabaseClient | null {
  if (!supabaseBrowserConfigured()) return null
  const url = import.meta.env.VITE_SUPABASE_URL!.trim()
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!.trim()
  const memory = new Map<string, string>()
  return createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (key) => memory.get(key) ?? null,
        setItem: (key, value) => {
          memory.set(key, value)
        },
        removeItem: (key) => {
          memory.delete(key)
        },
      },
    },
  })
}

function mapUsuarioRow(row: UsuarioRow): AuthUser {
  return {
    id: row.id,
    nome: row.nome,
    role: row.role === 'admin' ? 'admin' : 'medium',
    email: row.email,
    cpf: row.cpf,
    celular: row.celular,
    filhoId: row.filho_id,
    ativo: row.ativo,
  }
}

function mapRpcUser(raw: unknown): AuthUser | null {
  const base = mapProfile(raw)
  if (!base) return null
  const ativo =
    raw && typeof raw === 'object' && 'ativo' in raw
      ? Boolean((raw as { ativo: unknown }).ativo)
      : true
  return { ...base, ativo }
}

export async function sbListUsuarios(): Promise<
  { ok: true; users: AuthUser[] } | { ok: false; error: string }
> {
  const sb = getSupabaseBrowser()
  if (!sb) return { ok: false, error: 'supabase_unconfigured' }

  const { data: role, error: roleError } = await sb.rpc('current_app_role')
  if (roleError) return { ok: false, error: rpcErrorCode(roleError) }
  if (role !== 'admin') return { ok: false, error: 'admin_required' }

  const { data, error } = await sb
    .from('usuarios')
    .select('id, nome, role, email, cpf, celular, filho_id, ativo')
    .order('nome')

  if (error) {
    if (error.code === 'PGRST301' || error.message.includes('JWT')) {
      return { ok: false, error: 'unauthorized' }
    }
    return { ok: false, error: error.message }
  }

  return {
    ok: true,
    users: ((data ?? []) as UsuarioRow[]).map(mapUsuarioRow),
  }
}

function usersRpcError(error: { message?: string } | null): string {
  const msg = (error?.message ?? '').toLowerCase()
  if (msg.includes('admin_required')) return 'admin_required'
  if (msg.includes('not_authenticated')) return 'not_authenticated'
  if (msg.includes('nome_required')) return 'nome_email_senha_min_8'
  if (msg.includes('email_required')) return 'email_required_pages'
  if (msg.includes('auth_user_not_found')) return 'auth_user_not_found'
  if (msg.includes('email_mismatch')) return 'email_mismatch'
  if (msg.includes('user_already_exists')) return 'user_already_exists'
  if (msg.includes('invalid_role')) return 'invalid_role'
  if (msg.includes('medium_requires_filho')) return 'medium_requires_filho'
  if (msg.includes('cpf_em_uso')) return 'cpf_em_uso'
  if (msg.includes('celular_em_uso')) return 'celular_em_uso'
  if (msg.includes('last_admin')) return 'last_admin'
  if (msg.includes('not_found')) return 'not_found'
  if (msg.includes('missing_id')) return 'missing_id'
  return rpcErrorCode(error)
}

/**
 * Create admin or medium without service_role:
 * 1) signUp on ephemeral anon client (temp password)
 * 2) create_app_user RPC under the current admin session
 * If Auth already has the email, RPC links by email (password unchanged).
 */
export async function sbCreateAppUser(input: {
  email: string
  nome: string
  senha: string
  role: AppRole
  cpf?: string
  celular?: string
  filhoId?: string
}): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const sb = getSupabaseBrowser()
  if (!sb) return { ok: false, error: 'supabase_unconfigured' }

  const email = input.email.trim().toLowerCase()
  const nome = input.nome.trim()
  if (!email.includes('@') || !nome || input.senha.length < 8) {
    return { ok: false, error: 'nome_email_senha_min_8' }
  }
  if (input.role !== 'admin' && input.role !== 'medium') {
    return { ok: false, error: 'invalid_role' }
  }
  if (input.role === 'medium' && !input.filhoId?.trim()) {
    return { ok: false, error: 'medium_requires_filho' }
  }

  const { data: role, error: roleError } = await sb.rpc('current_app_role')
  if (roleError) return { ok: false, error: rpcErrorCode(roleError) }
  if (role !== 'admin') return { ok: false, error: 'admin_required' }

  const ephemeral = createEphemeralAuthClient()
  if (!ephemeral) return { ok: false, error: 'supabase_unconfigured' }

  let authUserId: string | null = null
  const { data: signData, error: signError } = await ephemeral.auth.signUp({
    email,
    password: input.senha,
  })

  if (signError) {
    const msg = signError.message.toLowerCase()
    if (!(msg.includes('already') || msg.includes('registered'))) {
      return { ok: false, error: 'signup_failed' }
    }
    // Existing Auth user: RPC resolves by email (cannot reset password without service_role).
  } else {
    authUserId = signData.user?.id ?? null
    if (!authUserId) {
      return { ok: false, error: 'email_confirm_required' }
    }
  }

  try {
    await ephemeral.auth.signOut({ scope: 'local' })
  } catch {
    /* ignore */
  }

  const { data: profile, error: rpcError } = await sb.rpc('create_app_user', {
    p_email: email,
    p_nome: nome,
    p_role: input.role,
    p_auth_user_id: authUserId,
    p_cpf: input.cpf?.trim() || null,
    p_celular: input.celular?.trim() || null,
    p_filho_id: input.role === 'medium' ? input.filhoId?.trim() || null : null,
  })

  if (rpcError) {
    return { ok: false, error: usersRpcError(rpcError) }
  }

  const mapped = mapRpcUser(profile)
  if (!mapped) return { ok: false, error: 'create_failed' }
  return { ok: true, user: mapped }
}

/** @deprecated use sbCreateAppUser — kept for callers that only create admins. */
export async function sbCreateAdmin(input: {
  email: string
  nome: string
  senha: string
}): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  return sbCreateAppUser({ ...input, role: 'admin' })
}

export async function sbUpdateAppUser(input: {
  id: string
  nome?: string
  role?: AppRole
  ativo?: boolean
  cpf?: string | null
  celular?: string | null
  filhoId?: string | null
}): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const sb = getSupabaseBrowser()
  if (!sb) return { ok: false, error: 'supabase_unconfigured' }

  const { data: role, error: roleError } = await sb.rpc('current_app_role')
  if (roleError) return { ok: false, error: rpcErrorCode(roleError) }
  if (role !== 'admin') return { ok: false, error: 'admin_required' }

  const clearCpf = input.cpf === null || input.cpf === ''
  const clearCelular = input.celular === null || input.celular === ''
  const clearFilho = input.filhoId === null || input.filhoId === ''

  const { data: profile, error: rpcError } = await sb.rpc('update_app_user', {
    p_id: input.id,
    p_nome: input.nome?.trim() ?? null,
    p_role: input.role ?? null,
    p_ativo: input.ativo ?? null,
    p_cpf: clearCpf ? null : input.cpf?.trim() ?? null,
    p_celular: clearCelular ? null : input.celular?.trim() ?? null,
    p_filho_id: clearFilho ? null : input.filhoId?.trim() ?? null,
    p_clear_cpf: clearCpf && 'cpf' in input,
    p_clear_celular: clearCelular && 'celular' in input,
    p_clear_filho: clearFilho && 'filhoId' in input,
  })

  if (rpcError) {
    return { ok: false, error: usersRpcError(rpcError) }
  }

  const mapped = mapRpcUser(profile)
  if (!mapped) return { ok: false, error: 'update_failed' }
  return { ok: true, user: mapped }
}

export async function sbDeactivateAppUser(
  id: string,
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  return sbUpdateAppUser({ id, ativo: false })
}
