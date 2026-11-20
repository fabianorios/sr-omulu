import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { readApiJson } from '../lib/apiJson'
import {
  getSupabaseBrowser,
  mapProfile,
  pagesMissingViteConfig,
  rpcErrorCode,
  supabaseBrowserConfigured,
} from '../lib/supabaseBrowser'

const FETCH_MS = 10_000

function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_MS)
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() =>
    clearTimeout(t),
  )
}

export type AppRole = 'admin' | 'medium'

export type AuthUser = {
  id: string
  nome: string
  role: AppRole
  email: string | null
  cpf: string | null
  celular: string | null
  filhoId: string | null
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  needsBootstrap: boolean
  isAdmin: boolean
  /** True when VITE_SUPABASE_* are set (Cloudflare Pages / browser Supabase). */
  browserSupabase: boolean
  /** Production Pages build missing VITE_* — show setup banner, do not hit /api. */
  pagesMissingVite: boolean
  login: (
    identificador: string,
    senha: string,
  ) => Promise<{ ok: boolean; error?: string }>
  bootstrap: (input: {
    nome: string
    identificador: string
    senha: string
    bootstrapSecret: string
  }) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function clearLocalPii() {
  try {
    for (const key of [
      'sr-omulu.filhos.v3',
      'sr-omulu.filhos.v2',
      'sr-omulu.filhos.v1',
      'sr-omulu.cobrancas.v1',
      'sr-omulu.cobrancas.v0',
    ]) {
      localStorage.removeItem(key)
    }
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const browserSupabase = supabaseBrowserConfigured()
  const pagesMissingVite = pagesMissingViteConfig()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsBootstrap, setNeedsBootstrap] = useState(false)

  const refreshBrowser = useCallback(async () => {
    const sb = getSupabaseBrowser()
    if (!sb) {
      setUser(null)
      setNeedsBootstrap(false)
      return
    }
    const { data: needs } = await sb.rpc('needs_bootstrap')
    setNeedsBootstrap(Boolean(needs))

    const { data: sessionData } = await sb.auth.getSession()
    if (!sessionData.session) {
      setUser(null)
      return
    }
    const { data: profile, error } = await sb.rpc('my_profile')
    if (error || !profile) {
      setUser(null)
      return
    }
    const mapped = mapProfile(profile)
    setUser(mapped)
    if (mapped) setNeedsBootstrap(false)
  }, [])

  const refreshApi = useCallback(async () => {
    const res = await fetchWithTimeout('/api/auth/me', {
      credentials: 'same-origin',
    })
    const parsed = await readApiJson<{
      authenticated?: boolean
      needsBootstrap?: boolean
      user?: AuthUser
      error?: string
    }>(res)
    if (parsed.ok === false) {
      setUser(null)
      setNeedsBootstrap(false)
      return
    }
    const data = parsed.data
    setNeedsBootstrap(Boolean(data.needsBootstrap))
    if (data.authenticated && data.user) {
      setUser(data.user)
    } else {
      setUser(null)
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      if (pagesMissingVite) {
        setUser(null)
        setNeedsBootstrap(false)
        return
      }
      if (browserSupabase) await refreshBrowser()
      else await refreshApi()
    } catch {
      setUser(null)
      setNeedsBootstrap(false)
    } finally {
      setLoading(false)
    }
  }, [browserSupabase, pagesMissingVite, refreshApi, refreshBrowser])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!browserSupabase) return
    const sb = getSupabaseBrowser()
    if (!sb) return
    const { data: sub } = sb.auth.onAuthStateChange(() => {
      void refreshBrowser().finally(() => setLoading(false))
    })
    return () => sub.subscription.unsubscribe()
  }, [browserSupabase, refreshBrowser])

  const login = useCallback(
    async (identificador: string, senha: string) => {
      if (pagesMissingVite) {
        return { ok: false, error: 'pages_missing_vite' }
      }
      if (browserSupabase) {
        const sb = getSupabaseBrowser()
        if (!sb) return { ok: false, error: 'supabase_unconfigured' }
        const email = identificador.trim()
        if (!email.includes('@')) {
          return { ok: false, error: 'email_required_pages' }
        }
        const { error } = await sb.auth.signInWithPassword({
          email,
          password: senha,
        })
        if (error) {
          return { ok: false, error: 'invalid_credentials' }
        }
        await refreshBrowser()
        return { ok: true }
      }

      try {
        const res = await fetchWithTimeout('/api/auth/login', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ identificador, senha }),
        })
        const parsed = await readApiJson<{
          user?: AuthUser
          error?: string
        }>(res)
        if (parsed.ok === false) {
          return { ok: false, error: parsed.error }
        }
        const data = parsed.data
        if (!res.ok || !data.user) {
          return { ok: false, error: data.error ?? 'login_failed' }
        }
        setUser(data.user)
        setNeedsBootstrap(false)
        return { ok: true }
      } catch {
        return { ok: false, error: 'api_unreachable' }
      }
    },
    [browserSupabase, pagesMissingVite, refreshBrowser],
  )

  const bootstrap = useCallback(
    async (input: {
      nome: string
      identificador: string
      senha: string
      bootstrapSecret: string
    }) => {
      if (pagesMissingVite) {
        return { ok: false, error: 'pages_missing_vite' }
      }
      if (browserSupabase) {
        const sb = getSupabaseBrowser()
        if (!sb) return { ok: false, error: 'supabase_unconfigured' }
        const email = input.identificador.trim()
        if (!email.includes('@')) {
          return { ok: false, error: 'email_required_pages' }
        }
        if (input.senha.length < 8 || !input.nome.trim()) {
          return { ok: false, error: 'nome_identificador_senha_min_8' }
        }

        const { data: signData, error: signError } = await sb.auth.signUp({
          email,
          password: input.senha,
        })
        if (signError) {
          const msg = signError.message.toLowerCase()
          if (msg.includes('already') || msg.includes('registered')) {
            const { error: inErr } = await sb.auth.signInWithPassword({
              email,
              password: input.senha,
            })
            if (inErr) return { ok: false, error: 'invalid_credentials' }
          } else {
            return { ok: false, error: 'bootstrap_failed' }
          }
        }
        if (!signData?.session && !(await sb.auth.getSession()).data.session) {
          return { ok: false, error: 'email_confirm_required' }
        }

        const { data: profile, error: claimError } = await sb.rpc(
          'claim_bootstrap',
          {
            install_code: input.bootstrapSecret,
            p_nome: input.nome.trim(),
          },
        )
        if (claimError) {
          return { ok: false, error: rpcErrorCode(claimError) }
        }
        const mapped = mapProfile(profile)
        if (!mapped) return { ok: false, error: 'bootstrap_failed' }
        setUser(mapped)
        setNeedsBootstrap(false)
        return { ok: true }
      }

      try {
        const res = await fetchWithTimeout('/api/auth/bootstrap', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            nome: input.nome,
            identificador: input.identificador,
            senha: input.senha,
            bootstrapSecret: input.bootstrapSecret,
          }),
        })
        const parsed = await readApiJson<{
          user?: AuthUser
          error?: string
        }>(res)
        if (parsed.ok === false) {
          return { ok: false, error: parsed.error }
        }
        const data = parsed.data
        if (!res.ok || !data.user) {
          return { ok: false, error: data.error ?? 'bootstrap_failed' }
        }
        setUser(data.user)
        setNeedsBootstrap(false)
        return { ok: true }
      } catch {
        return { ok: false, error: 'api_unreachable' }
      }
    },
    [browserSupabase, pagesMissingVite],
  )

  const logout = useCallback(async () => {
    if (browserSupabase) {
      const sb = getSupabaseBrowser()
      await sb?.auth.signOut()
    } else if (!pagesMissingVite) {
      try {
        await fetchWithTimeout('/api/auth/logout', {
          method: 'POST',
          credentials: 'same-origin',
        })
      } catch {
        /* ignore */
      }
    }
    clearLocalPii()
    setUser(null)
    await refresh()
  }, [browserSupabase, pagesMissingVite, refresh])

  const value = useMemo(
    () => ({
      user,
      loading,
      needsBootstrap,
      isAdmin: user?.role === 'admin',
      browserSupabase,
      pagesMissingVite,
      login,
      bootstrap,
      logout,
      refresh,
    }),
    [
      user,
      loading,
      needsBootstrap,
      browserSupabase,
      pagesMissingVite,
      login,
      bootstrap,
      logout,
      refresh,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
