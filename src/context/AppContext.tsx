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
  updateFilhoViaApi,
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
  updateFilho: (
    id: string,
    filho: FilhoInput,
  ) => Promise<{ ok: boolean; error?: string }>
  addObrigacao: (obrigacao: Omit<Obrigacao, 'id'> & { id?: string }) => void
  toggleTipo: (id: ObligationTypeId) => void
  updateTipo: (id: ObligationTypeId, patch: Partial<ObligationType>) => void
  openNovoFilho: boolean
  editingFilho: Filho | null
  openAgendar: boolean
  setOpenNovoFilho: (v: boolean) => void
  setEditingFilho: (filho: Filho | null) => void
  setOpenAgendar: (v: boolean) => void
}

const AppContext = createContext<AppContextValue | null>(null)

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

function applyLocalUpdate(
  list: Filho[],
  id: string,
  patch: FilhoInput,
): Filho[] {
  return list.map((f) => (f.id === id ? { ...f, ...patch, id } : f))
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => createInitialState())
  const [loadingFilhos, setLoadingFilhos] = useState(true)
  const [openNovoFilho, setOpenNovoFilho] = useState(false)
  const [editingFilho, setEditingFilho] = useState<Filho | null>(null)
  const [openAgendar, setOpenAgendar] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingFilhos(true)
      const remote = await loadFilhosFromApi()
      if (cancelled) return

      if (remote.source === 'postgres' || remote.source === 'pglite') {
        if (remote.filhos.length === 0) {
          const local = loadLocalFilhos()
          setState((prev) => ({
            ...prev,
            filhos: local.length > 0 ? local : createSampleFilhos(),
            dataSource: local.length > 0 ? 'local' : 'sample',
          }))
        } else {
          setState((prev) => ({
            ...prev,
            filhos: remote.filhos,
            dataSource: remote.source,
          }))
        }
      } else {
        const local = loadLocalFilhos()
        setState((prev) => ({
          ...prev,
          filhos: local.length > 0 ? local : createSampleFilhos(),
          dataSource: local.length > 0 ? 'local' : 'sample',
        }))
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
      setState((prev) => {
        const leavingSample =
          prev.dataSource === 'sample' || prev.dataSource === 'local'
        const filhos = leavingSample
          ? [remote.filho]
          : [...prev.filhos, remote.filho]
        return {
          ...prev,
          filhos,
          dataSource: remote.source,
        }
      })
      return { ok: true }
    }

    const err = remote.error
    if (err === 'network' || err.startsWith('http_5')) {
      const created: Filho = { ...filho, id: filho.id ?? uid('f') }
      setState((prev) => {
        const filhos = [...prev.filhos, created]
        saveLocalFilhos(filhos)
        return { ...prev, filhos, dataSource: 'local' }
      })
      return { ok: true }
    }

    return { ok: false, error: err }
  }, [])

  const updateFilho = useCallback(async (id: string, filho: FilhoInput) => {
    const remote = await updateFilhoViaApi(id, filho)
    if (remote.ok === true) {
      setState((prev) => ({
        ...prev,
        filhos: prev.filhos.map((f) => (f.id === id ? remote.filho : f)),
        dataSource: remote.source,
      }))
      return { ok: true }
    }

    // Sample/local ids (f1…) or offline: update in memory
    if (
      remote.error === 'not_found' ||
      remote.error === 'network' ||
      remote.error.startsWith('http_')
    ) {
      setState((prev) => {
        const filhos = applyLocalUpdate(prev.filhos, id, filho)
        if (prev.dataSource === 'local' || prev.dataSource === 'sample') {
          saveLocalFilhos(filhos)
        }
        return {
          ...prev,
          filhos,
          dataSource:
            prev.dataSource === 'postgres' || prev.dataSource === 'pglite'
              ? prev.dataSource
              : 'local',
        }
      })
      return { ok: true }
    }

    return { ok: false, error: remote.error }
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
      updateFilho,
      addObrigacao,
      toggleTipo,
      updateTipo,
      openNovoFilho,
      editingFilho,
      openAgendar,
      setOpenNovoFilho,
      setEditingFilho,
      setOpenAgendar,
    }),
    [
      state,
      loadingFilhos,
      resetDemo,
      addFilho,
      updateFilho,
      addObrigacao,
      toggleTipo,
      updateTipo,
      openNovoFilho,
      editingFilho,
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
