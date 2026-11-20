import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AuthUser } from '../context/AuthContext'
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
  }
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

function createAdminRpcError(error: { message?: string } | null): string {
  const msg = (error?.message ?? '').toLowerCase()
  if (msg.includes('admin_required')) return 'admin_required'
  if (msg.includes('not_authenticated')) return 'not_authenticated'
  if (msg.includes('nome_required')) return 'nome_email_senha_min_8'
  if (msg.includes('email_required')) return 'email_required_pages'
  if (msg.includes('auth_user_not_found')) return 'auth_user_not_found'
  if (msg.includes('email_mismatch')) return 'email_mismatch'
  if (msg.includes('user_already_exists')) return 'user_already_exists'
  return rpcErrorCode(error)
}

/**
 * Create another admin without service_role:
 * 1) signUp on ephemeral anon client (temp password)
 * 2) create_admin RPC under the current admin session
 * If Auth already has the email, RPC links by email (password unchanged).
 */
export async function sbCreateAdmin(input: {
  email: string
  nome: string
  senha: string
}): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const sb = getSupabaseBrowser()
  if (!sb) return { ok: false, error: 'supabase_unconfigured' }

  const email = input.email.trim().toLowerCase()
  const nome = input.nome.trim()
  if (!email.includes('@') || !nome || input.senha.length < 8) {
    return { ok: false, error: 'nome_email_senha_min_8' }
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
    // Existing Auth user: create_admin resolves by email (cannot reset password without service_role).
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

  const { data: profile, error: rpcError } = await sb.rpc('create_admin', {
    p_email: email,
    p_nome: nome,
    p_auth_user_id: authUserId,
  })

  if (rpcError) {
    return { ok: false, error: createAdminRpcError(rpcError) }
  }

  const mapped = mapProfile(profile)
  if (!mapped) return { ok: false, error: 'create_failed' }
  return { ok: true, user: mapped }
}
