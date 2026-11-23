import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createInitialState,
  createSampleCobrancas,
  createSampleFilhos,
  DEFAULT_COBRANCA_TIPOS,
} from '../data/mock'
import { useAuth } from './AuthContext'
import {
  createCobrancaTipoViaApi,
  createCobrancaViaApi,
  loadCobrancasFromApi,
  loadLocalCobrancas,
  saveLocalCobrancas,
  updateCobrancaTipoViaApi,
  updateCobrancaViaApi,
} from '../lib/cobrancasApi'
import {
  createFilhoViaApi,
  loadFilhosFromApi,
  loadLocalFilhos,
  saveLocalFilhos,
  updateFilhoViaApi,
} from '../lib/filhosApi'
import {
  createObrigacaoViaApi,
  loadObrigacoesFromApi,
  updateObrigacaoViaApi,
} from '../lib/obrigacoesApi'
import type {
  AppState,
  Cobranca,
  CobrancaCategoria,
  CobrancaInput,
  CobrancaTipo,
  Filho,
  FilhoInput,
  ObligationType,
  ObligationTypeId,
  Obrigacao,
} from '../types'

// Cobranca used in sample scoping helper

interface AppContextValue {
  state: AppState
  loadingFilhos: boolean
  resetDemo: () => void
  addFilho: (filho: FilhoInput) => Promise<{ ok: boolean; error?: string }>
  updateFilho: (
    id: string,
    filho: FilhoInput,
  ) => Promise<{ ok: boolean; error?: string }>
  addObrigacao: (
    obrigacao: Omit<Obrigacao, 'id'> & { id?: string },
  ) => Promise<{ ok: boolean; error?: string }>
  updateObrigacao: (
    id: string,
    patch: Partial<Obrigacao>,
  ) => Promise<{ ok: boolean; error?: string }>
  toggleTipo: (id: ObligationTypeId) => void
  updateTipo: (id: ObligationTypeId, patch: Partial<ObligationType>) => void
  addCobranca: (
    cobranca: CobrancaInput,
  ) => Promise<{ ok: boolean; error?: string }>
  markCobrancaPago: (
    id: string,
    pago: boolean,
  ) => Promise<{ ok: boolean; error?: string }>
  addCobrancaTipo: (input: {
    nome: string
    categoria: CobrancaCategoria
  }) => Promise<{ ok: boolean; error?: string; tipo?: CobrancaTipo }>
  updateCobrancaTipo: (
    id: string,
    patch: { nome?: string; categoria?: CobrancaCategoria; ativo?: boolean },
  ) => Promise<{ ok: boolean; error?: string; tipo?: CobrancaTipo }>
  openNovoFilho: boolean
  editingFilho: Filho | null
  openAgendar: boolean
  openNovaCobranca: boolean
  setOpenNovoFilho: (v: boolean) => void
  setEditingFilho: (filho: Filho | null) => void
  setOpenAgendar: (v: boolean) => void
  setOpenNovaCobranca: (v: boolean) => void
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

function scopeSampleForUser(
  userFilhoId: string | null | undefined,
  isAdmin: boolean,
  filhos: Filho[],
  obrigacoes: Obrigacao[],
  cobrancas: Cobranca[],
) {
  if (isAdmin || !userFilhoId) {
    return { filhos, obrigacoes, cobrancas }
  }
  return {
    filhos: filhos.filter((f) => f.id === userFilhoId),
    obrigacoes: obrigacoes.filter((o) => o.filhoId === userFilhoId),
    cobrancas: cobrancas.filter((c) => c.filhoId === userFilhoId),
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth()
  const [state, setState] = useState<AppState>(() => createInitialState())
  const [loadingFilhos, setLoadingFilhos] = useState(true)
  const [openNovoFilho, setOpenNovoFilho] = useState(false)
  const [editingFilho, setEditingFilho] = useState<Filho | null>(null)
  const [openAgendar, setOpenAgendar] = useState(false)
  const [openNovaCobranca, setOpenNovaCobranca] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingFilhos(true)
      const [remoteFilhos, remoteObr, remoteFin] = await Promise.all([
        loadFilhosFromApi(),
        loadObrigacoesFromApi(),
        loadCobrancasFromApi(),
      ])
      if (cancelled) return

      // Unauthorized: do not hydrate PII samples into the client
      if (
        remoteFilhos.source === 'error' &&
        remoteFilhos.error === 'unauthorized'
      ) {
        setState((prev) => ({
          ...prev,
          filhos: [],
          obrigacoes: [],
          cobrancas: [],
          dataSource: 'local',
        }))
        setLoadingFilhos(false)
        return
      }

      setState((prev) => {
        let next: AppState = { ...prev }
        const initial = createInitialState()

        if (
          remoteFilhos.source === 'supabase' ||
          remoteFilhos.source === 'postgres' ||
          remoteFilhos.source === 'pglite'
        ) {
          if (remoteFilhos.filhos.length === 0) {
            if (isAdmin) {
              const local = loadLocalFilhos()
              const filhos =
                local.length > 0 ? local : createSampleFilhos()
              next = {
                ...next,
                filhos,
                dataSource: local.length > 0 ? 'local' : 'sample',
              }
            } else {
              next = { ...next, filhos: [], dataSource: remoteFilhos.source }
            }
          } else {
            next = {
              ...next,
              filhos: remoteFilhos.filhos,
              dataSource: remoteFilhos.source,
            }
          }
        } else if (isAdmin) {
          const local = loadLocalFilhos()
          next = {
            ...next,
            filhos: local.length > 0 ? local : createSampleFilhos(),
            dataSource: local.length > 0 ? 'local' : 'sample',
          }
        } else {
          next = { ...next, filhos: [], dataSource: 'local' }
        }

        if (
          (remoteObr.source === 'supabase' ||
            remoteObr.source === 'postgres' ||
            remoteObr.source === 'pglite') &&
          remoteObr.obrigacoes.length > 0
        ) {
          next = { ...next, obrigacoes: remoteObr.obrigacoes }
        } else if (next.dataSource === 'sample' && isAdmin) {
          next = { ...next, obrigacoes: initial.obrigacoes }
        } else if (!isAdmin) {
          next = { ...next, obrigacoes: [] }
        }

        if (
          remoteFin.source === 'supabase' ||
          remoteFin.source === 'postgres' ||
          remoteFin.source === 'pglite'
        ) {
          if (remoteFin.tipos.length > 0) {
            next = { ...next, cobrancaTipos: remoteFin.tipos }
          }
          if (remoteFin.cobrancas.length > 0) {
            next = { ...next, cobrancas: remoteFin.cobrancas }
          } else if (next.dataSource === 'sample' && isAdmin) {
            next = { ...next, cobrancas: createSampleCobrancas() }
          } else if (!isAdmin) {
            next = { ...next, cobrancas: [] }
          } else {
            const localC = loadLocalCobrancas()
            if (localC.length > 0) next = { ...next, cobrancas: localC }
          }
        } else if (isAdmin) {
          const localC = loadLocalCobrancas()
          next = {
            ...next,
            cobrancas:
              localC.length > 0 ? localC : createSampleCobrancas(),
            cobrancaTipos: DEFAULT_COBRANCA_TIPOS.map((t) => ({ ...t })),
          }
        } else {
          next = {
            ...next,
            cobrancas: [],
            cobrancaTipos: DEFAULT_COBRANCA_TIPOS.map((t) => ({ ...t })),
          }
        }

        const scoped = scopeSampleForUser(
          user?.filhoId,
          isAdmin,
          next.filhos,
          next.obrigacoes,
          next.cobrancas,
        )
        return { ...next, ...scoped }
      })
      setLoadingFilhos(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.filhoId, isAdmin])

  const resetDemo = useCallback(() => {
    const next = createInitialState()
    saveLocalFilhos([])
    saveLocalCobrancas([])
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
            prev.dataSource === 'supabase' ||
            prev.dataSource === 'postgres' ||
            prev.dataSource === 'pglite'
              ? prev.dataSource
              : 'local',
        }
      })
      return { ok: true }
    }

    return { ok: false, error: remote.error }
  }, [])

  const addObrigacao = useCallback(
    async (obrigacao: Omit<Obrigacao, 'id'> & { id?: string }) => {
      const payload = {
        ...obrigacao,
        itens: obrigacao.itens ?? [],
      }
      const remote = await createObrigacaoViaApi(payload)
      if (remote.ok === true) {
        setState((prev) => ({
          ...prev,
          obrigacoes: [...prev.obrigacoes, remote.obrigacao],
        }))
        return { ok: true }
      }

      if (
        remote.error === 'network' ||
        remote.error.startsWith('http_5') ||
        remote.error.startsWith('http_')
      ) {
        setState((prev) => ({
          ...prev,
          obrigacoes: [
            ...prev.obrigacoes,
            { ...payload, id: obrigacao.id ?? uid('o') },
          ],
        }))
        return { ok: true }
      }
      return { ok: false, error: remote.error }
    },
    [],
  )

  const updateObrigacao = useCallback(
    async (id: string, patch: Partial<Obrigacao>) => {
      const remote = await updateObrigacaoViaApi(id, patch)
      if (remote.ok === true) {
        setState((prev) => ({
          ...prev,
          obrigacoes: prev.obrigacoes.map((o) =>
            o.id === id ? remote.obrigacao : o,
          ),
        }))
        return { ok: true }
      }
      setState((prev) => ({
        ...prev,
        obrigacoes: prev.obrigacoes.map((o) =>
          o.id === id ? { ...o, ...patch, id } : o,
        ),
      }))
      return { ok: true }
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

  const addCobranca = useCallback(async (cobranca: CobrancaInput) => {
    const remote = await createCobrancaViaApi(cobranca)
    if (remote.ok === true) {
      setState((prev) => ({
        ...prev,
        cobrancas: [...prev.cobrancas, remote.cobranca],
      }))
      return { ok: true }
    }

    if (
      remote.error === 'network' ||
      remote.error.startsWith('http_5') ||
      remote.error.startsWith('http_')
    ) {
      const created: Cobranca = {
        ...cobranca,
        id: cobranca.id ?? uid('c'),
        pago: cobranca.pago ?? false,
      }
      setState((prev) => {
        const cobrancas = [...prev.cobrancas, created]
        saveLocalCobrancas(cobrancas)
        return { ...prev, cobrancas }
      })
      return { ok: true }
    }
    return { ok: false, error: remote.error }
  }, [])

  const markCobrancaPago = useCallback(async (id: string, pago: boolean) => {
    const remote = await updateCobrancaViaApi(id, { pago })
    if (remote.ok === true) {
      setState((prev) => ({
        ...prev,
        cobrancas: prev.cobrancas.map((c) =>
          c.id === id ? remote.cobranca : c,
        ),
      }))
      return { ok: true }
    }
    setState((prev) => {
      const cobrancas = prev.cobrancas.map((c) =>
        c.id === id
          ? {
              ...c,
              pago,
              pagoEm: pago ? new Date().toISOString() : undefined,
            }
          : c,
      )
      saveLocalCobrancas(cobrancas)
      return { ...prev, cobrancas }
    })
    return { ok: true }
  }, [])

  const addCobrancaTipo = useCallback(
    async (input: { nome: string; categoria: CobrancaCategoria }) => {
      const remote = await createCobrancaTipoViaApi(input)
      if (remote.ok === true) {
        setState((prev) => {
          const exists = prev.cobrancaTipos.some(
            (t) => t.nome.toLowerCase() === remote.tipo.nome.toLowerCase(),
          )
          return {
            ...prev,
            cobrancaTipos: exists
              ? prev.cobrancaTipos.map((t) =>
                  t.nome.toLowerCase() === remote.tipo.nome.toLowerCase()
                    ? remote.tipo
                    : t,
                )
              : [...prev.cobrancaTipos, remote.tipo],
          }
        })
        return { ok: true, tipo: remote.tipo }
      }
      const tipo: CobrancaTipo = {
        id: uid('ct'),
        nome: input.nome.trim(),
        categoria: input.categoria,
        ativo: true,
      }
      setState((prev) => ({
        ...prev,
        cobrancaTipos: [...prev.cobrancaTipos, tipo],
      }))
      return { ok: true, tipo }
    },
    [],
  )

  const updateCobrancaTipo = useCallback(
    async (
      id: string,
      patch: { nome?: string; categoria?: CobrancaCategoria; ativo?: boolean },
    ) => {
      const remote = await updateCobrancaTipoViaApi(id, patch)
      if (remote.ok === true) {
        setState((prev) => ({
          ...prev,
          cobrancaTipos: prev.cobrancaTipos.map((t) =>
            t.id === id ? remote.tipo : t,
          ),
          cobrancas:
            patch.nome != null
              ? prev.cobrancas.map((c) =>
                  c.tipoId === id
                    ? { ...c, tipoNome: remote.tipo.nome }
                    : c,
                )
              : prev.cobrancas,
        }))
        return { ok: true, tipo: remote.tipo }
      }
      // Offline / sample: apply locally
      let updated: CobrancaTipo | undefined
      setState((prev) => {
        const cobrancaTipos = prev.cobrancaTipos.map((t) => {
          if (t.id !== id) return t
          updated = {
            ...t,
            ...(patch.nome != null ? { nome: patch.nome.trim() } : {}),
            ...(patch.categoria != null ? { categoria: patch.categoria } : {}),
            ...(patch.ativo != null ? { ativo: patch.ativo } : {}),
          }
          return updated
        })
        if (!updated) return prev
        return {
          ...prev,
          cobrancaTipos,
          cobrancas:
            patch.nome != null
              ? prev.cobrancas.map((c) =>
                  c.tipoId === id ? { ...c, tipoNome: updated!.nome } : c,
                )
              : prev.cobrancas,
        }
      })
      if (!updated) return { ok: false, error: 'not_found' }
      return { ok: true, tipo: updated }
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
      updateObrigacao,
      toggleTipo,
      updateTipo,
      addCobranca,
      markCobrancaPago,
      addCobrancaTipo,
      updateCobrancaTipo,
      openNovoFilho,
      editingFilho,
      openAgendar,
      openNovaCobranca,
      setOpenNovoFilho,
      setEditingFilho,
      setOpenAgendar,
      setOpenNovaCobranca,
    }),
    [
      state,
      loadingFilhos,
      resetDemo,
      addFilho,
      updateFilho,
      addObrigacao,
      updateObrigacao,
      toggleTipo,
      updateTipo,
      addCobranca,
      markCobrancaPago,
      addCobrancaTipo,
      updateCobrancaTipo,
      openNovoFilho,
      editingFilho,
      openAgendar,
      openNovaCobranca,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
