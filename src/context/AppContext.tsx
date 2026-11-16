import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createInitialState, createSampleFilhos } from '../data/mock'
import {
  createFilhoViaApi,
  loadFilhosFromApi,
  loadLocalFilhos,
  saveLocalFilhos,
} from '../lib/filhosApi'
import type {
  AppState,
  Filho,
  FilhoInput,
  ObligationType,
  ObligationTypeId,
  Obrigacao,
} from '../types'

interface AppContextValue {
  state: AppState
  loadingFilhos: boolean
  resetDemo: () => void
  addFilho: (filho: FilhoInput) => Promise<{ ok: boolean; error?: string }>
  addObrigacao: (obrigacao: Omit<Obrigacao, 'id'> & { id?: string }) => void
  toggleTipo: (id: ObligationTypeId) => void
  updateTipo: (id: ObligationTypeId, patch: Partial<ObligationType>) => void
  openNovoFilho: boolean
  openAgendar: boolean
  setOpenNovoFilho: (v: boolean) => void
  setOpenAgendar: (v: boolean) => void
}

const AppContext = createContext<AppContextValue | null>(null)

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => createInitialState())
  const [loadingFilhos, setLoadingFilhos] = useState(true)
  const [openNovoFilho, setOpenNovoFilho] = useState(false)
  const [openAgendar, setOpenAgendar] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingFilhos(true)
      const remote = await loadFilhosFromApi()
      if (cancelled) return

      if (remote.source === 'supabase') {
        setState((prev) => ({
          ...prev,
          filhos: remote.filhos,
          dataSource: 'supabase',
        }))
      } else {
        const local = loadLocalFilhos()
        if (local.length > 0) {
          setState((prev) => ({
            ...prev,
            filhos: local,
            dataSource: 'local',
          }))
        } else {
          setState((prev) => ({
            ...prev,
            filhos: createSampleFilhos(),
            dataSource: 'sample',
          }))
        }
      }
      setLoadingFilhos(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const resetDemo = useCallback(() => {
    const next = createInitialState()
    saveLocalFilhos([])
    setState(next)
  }, [])

  const addFilho = useCallback(async (filho: FilhoInput) => {
    const remote = await createFilhoViaApi(filho)
    if (remote.ok === true) {
      setState((prev) => ({
        ...prev,
        filhos: [...prev.filhos, remote.filho],
        dataSource: 'supabase',
      }))
      return { ok: true }
    }

    const err = remote.error
    // Fallback local/sample when Supabase is unset or API unavailable
    if (
      err === 'supabase_unset' ||
      err === 'network' ||
      err.startsWith('http_503')
    ) {
      const created: Filho = { ...filho, id: filho.id ?? uid('f') }
      setState((prev) => {
        const filhos = [...prev.filhos, created]
        saveLocalFilhos(filhos)
        return {
          ...prev,
          filhos,
          dataSource: prev.dataSource === 'supabase' ? 'supabase' : 'local',
        }
      })
      return { ok: true }
    }

    return { ok: false, error: err }
  }, [])

  const addObrigacao = useCallback(
    (obrigacao: Omit<Obrigacao, 'id'> & { id?: string }) => {
      setState((prev) => ({
        ...prev,
        obrigacoes: [
          ...prev.obrigacoes,
          { ...obrigacao, id: obrigacao.id ?? uid('o') },
        ],
      }))
    },
    [],
  )

  const toggleTipo = useCallback((id: ObligationTypeId) => {
    setState((prev) => ({
      ...prev,
      tipos: prev.tipos.map((t) =>
        t.id === id ? { ...t, active: !t.active } : t,
      ),
    }))
  }, [])

  const updateTipo = useCallback(
    (id: ObligationTypeId, patch: Partial<ObligationType>) => {
      setState((prev) => ({
        ...prev,
        tipos: prev.tipos.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }))
    },
    [],
  )

  const value = useMemo(
    () => ({
      state,
      loadingFilhos,
      resetDemo,
      addFilho,
      addObrigacao,
      toggleTipo,
      updateTipo,
      openNovoFilho,
      openAgendar,
      setOpenNovoFilho,
      setOpenAgendar,
    }),
    [
      state,
      loadingFilhos,
      resetDemo,
      addFilho,
      addObrigacao,
      toggleTipo,
      updateTipo,
      openNovoFilho,
      openAgendar,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
