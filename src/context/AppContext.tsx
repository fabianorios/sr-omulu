import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createInitialState } from '../data/mock'
import type {
  AppState,
  Filho,
  ObligationType,
  ObligationTypeId,
  Obrigacao,
} from '../types'

interface AppContextValue {
  state: AppState
  resetDemo: () => void
  addFilho: (filho: Omit<Filho, 'id'> & { id?: string }) => void
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
  const [openNovoFilho, setOpenNovoFilho] = useState(false)
  const [openAgendar, setOpenAgendar] = useState(false)

  const resetDemo = useCallback(() => {
    setState(createInitialState())
  }, [])

  const addFilho = useCallback((filho: Omit<Filho, 'id'> & { id?: string }) => {
    setState((prev) => ({
      ...prev,
      filhos: [...prev.filhos, { ...filho, id: filho.id ?? uid('f') }],
    }))
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
