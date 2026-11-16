import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

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
  login: (
    identificador: string,
    senha: string,
  ) => Promise<{ ok: boolean; error?: string }>
  bootstrap: (input: {
    nome: string
    identificador: string
    senha: string
  }) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsBootstrap, setNeedsBootstrap] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' })
      const data = (await res.json()) as {
        authenticated?: boolean
        needsBootstrap?: boolean
        user?: AuthUser
      }
      setNeedsBootstrap(Boolean(data.needsBootstrap))
      if (data.authenticated && data.user) {
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(
    async (identificador: string, senha: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identificador, senha }),
      })
      const data = (await res.json()) as { user?: AuthUser; error?: string }
      if (!res.ok || !data.user) {
        return { ok: false, error: data.error ?? 'login_failed' }
      }
      setUser(data.user)
      setNeedsBootstrap(false)
      return { ok: true }
    },
    [],
  )

  const bootstrap = useCallback(
    async (input: { nome: string; identificador: string; senha: string }) => {
      const res = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = (await res.json()) as { user?: AuthUser; error?: string }
      if (!res.ok || !data.user) {
        return { ok: false, error: data.error ?? 'bootstrap_failed' }
      }
      setUser(data.user)
      setNeedsBootstrap(false)
      return { ok: true }
    },
    [],
  )

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    })
    setUser(null)
    await refresh()
  }, [refresh])

  const value = useMemo(
    () => ({
      user,
      loading,
      needsBootstrap,
      isAdmin: user?.role === 'admin',
      login,
      bootstrap,
      logout,
      refresh,
    }),
    [user, loading, needsBootstrap, login, bootstrap, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
