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
  DEFAULT_TIPOS,
} from '../data/mock'
import { useAuth } from './AuthContext'
import {
  createCobrancaTipoViaApi,
  createCobrancaViaApi,
  deleteCobrancaViaApi,
  loadCobrancasFromApi,
  loadLocalCobrancas,
  saveLocalCobrancas,
  updateCobrancaTipoViaApi,
  updateCobrancaViaApi,
} from '../lib/cobrancasApi'
import {
  createFilhoViaApi,
  deleteFilhoViaApi,
  loadFilhosFromApi,
  loadLocalFilhos,
  saveLocalFilhos,
  updateFilhoViaApi,
} from '../lib/filhosApi'
import { isDbUuid } from '../lib/ids'
import {
  createObrigacaoViaApi,
  deleteObrigacaoViaApi,
  loadObrigacoesFromApi,
  updateObrigacaoViaApi,
} from '../lib/obrigacoesApi'
import {
  createObrigacaoTipoViaApi,
  deleteObrigacaoTipoViaApi,
  loadObrigacaoTiposFromApi,
  updateObrigacaoTipoViaApi,
  type ObrigacaoTipoInput,
} from '../lib/obrigacaoTiposApi'
import { supabaseBrowserConfigured } from '../lib/supabaseBrowser'
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
  deleteFilho: (id: string) => Promise<{ ok: boolean; error?: string }>
  addObrigacao: (
    obrigacao: Omit<Obrigacao, 'id'> & { id?: string },
  ) => Promise<{ ok: boolean; error?: string }>
  updateObrigacao: (
    id: string,
    patch: Partial<Obrigacao>,
  ) => Promise<{ ok: boolean; error?: string }>
  deleteObrigacao: (id: string) => Promise<{ ok: boolean; error?: string }>
  /** Replica obrigação do catálogo aos filhos; pula duplicatas (mesmo tipo+data ou lote). */
  replicateObrigacao: (input: {
    tipoId: ObligationTypeId
    data: string
    observacoes?: string
    itens: Obrigacao['itens']
    filhoIds: string[]
  }) => Promise<{
    ok: boolean
    created: number
    skipped: number
    error?: string
  }>
  addTipo: (
    input: ObrigacaoTipoInput,
  ) => Promise<{ ok: boolean; error?: string; tipo?: ObligationType }>
  updateTipo: (
    id: ObligationTypeId,
    patch: Partial<ObrigacaoTipoInput> & { active?: boolean },
  ) => Promise<{ ok: boolean; error?: string; tipo?: ObligationType }>
  toggleTipo: (
    id: ObligationTypeId,
  ) => Promise<{ ok: boolean; error?: string }>
  deleteTipo: (
    id: ObligationTypeId,
  ) => Promise<{ ok: boolean; error?: string }>
  addCobranca: (
    cobranca: CobrancaInput,
  ) => Promise<{ ok: boolean; error?: string }>
  updateCobranca: (
    id: string,
    patch: Partial<CobrancaInput> & { pago?: boolean },
  ) => Promise<{ ok: boolean; error?: string }>
  markCobrancaPago: (
    id: string,
    pago: boolean,
  ) => Promise<{ ok: boolean; error?: string }>
  deleteCobranca: (id: string) => Promise<{ ok: boolean; error?: string }>
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
  openNovaObrigacao: boolean
  setOpenNovoFilho: (v: boolean) => void
  setEditingFilho: (filho: Filho | null) => void
  setOpenAgendar: (v: boolean) => void
  setOpenNovaCobranca: (v: boolean) => void
  setOpenNovaObrigacao: (v: boolean) => void
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
  const [state, setState] = useState<AppState>(() => {
    const initial = createInitialState()
    // Avoid flashing mock ids (f11, …) before remote load on production.
    if (supabaseBrowserConfigured()) {
      return {
        ...initial,
        filhos: [],
        obrigacoes: [],
        cobrancas: [],
        dataSource: 'supabase',
      }
    }
    return initial
  })
  const [loadingFilhos, setLoadingFilhos] = useState(true)
  const [openNovoFilho, setOpenNovoFilho] = useState(false)
  const [editingFilho, setEditingFilho] = useState<Filho | null>(null)
  const [openAgendar, setOpenAgendar] = useState(false)
  const [openNovaCobranca, setOpenNovaCobranca] = useState(false)
  const [openNovaObrigacao, setOpenNovaObrigacao] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingFilhos(true)
      const [remoteFilhos, remoteObr, remoteFin, remoteTipos] =
        await Promise.all([
          loadFilhosFromApi(),
          loadObrigacoesFromApi(),
          loadCobrancasFromApi(),
          loadObrigacaoTiposFromApi(),
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
        // Production (Supabase/Postgres): never hydrate mock ids (f11, …).
        // Sample/demo is only for local /api without a remote DB, or explicit resetDemo.
        const remoteConnected =
          remoteFilhos.source === 'supabase' ||
          remoteFilhos.source === 'postgres' ||
          remoteFilhos.source === 'pglite' ||
          supabaseBrowserConfigured()

        if (
          remoteFilhos.source === 'supabase' ||
          remoteFilhos.source === 'postgres' ||
          remoteFilhos.source === 'pglite'
        ) {
          next = {
            ...next,
            filhos: remoteFilhos.filhos,
            dataSource: remoteFilhos.source,
          }
        } else if (remoteConnected) {
          next = { ...next, filhos: [], dataSource: 'supabase' }
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
        } else if (remoteConnected || !isAdmin) {
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
          } else {
            next = { ...next, cobrancas: [] }
          }
        } else if (remoteConnected) {
          next = {
            ...next,
            cobrancas: [],
            cobrancaTipos: DEFAULT_COBRANCA_TIPOS.map((t) => ({ ...t })),
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

        if (
          remoteTipos.source === 'supabase' ||
          remoteTipos.source === 'postgres' ||
          remoteTipos.source === 'pglite'
        ) {
          if (remoteTipos.tipos.length > 0) {
            next = { ...next, tipos: remoteTipos.tipos }
          } else {
            next = {
              ...next,
              tipos: DEFAULT_TIPOS.map((t) => ({
                ...t,
                itensPadrao: t.itensPadrao?.map((i) => ({ ...i })),
              })),
            }
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
    // Local demo only. With Supabase configured this must not replace DB UUIDs
    // in a way that later deletes send mock ids (f11) to Postgres.
    if (supabaseBrowserConfigured()) {
      window.alert(
        'Dados de exemplo ficam só no modo local. Em produção use os cadastros do banco (UUID).',
      )
      return
    }
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
    if (!isDbUuid(id)) {
      if (supabaseBrowserConfigured()) {
        return {
          ok: false,
          error:
            'id_invalido: use o UUID do cadastro no banco, não id de exemplo',
        }
      }
      setState((prev) => {
        const filhos = applyLocalUpdate(prev.filhos, id, filho)
        saveLocalFilhos(filhos)
        return { ...prev, filhos, dataSource: 'local' }
      })
      return { ok: true }
    }

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

  const deleteFilho = useCallback(async (id: string) => {
    if (!isDbUuid(id)) {
      if (supabaseBrowserConfigured()) {
        return {
          ok: false,
          error:
            'id_invalido: use o UUID do cadastro no banco, não id de exemplo (ex.: f11)',
        }
      }
      setState((prev) => {
        const filhos = prev.filhos.filter((f) => f.id !== id)
        const cobrancas = prev.cobrancas.filter((c) => c.filhoId !== id)
        saveLocalFilhos(filhos)
        saveLocalCobrancas(cobrancas)
        return {
          ...prev,
          filhos,
          obrigacoes: prev.obrigacoes.filter((o) => o.filhoId !== id),
          cobrancas,
          dataSource: 'local',
        }
      })
      return { ok: true }
    }

    const remote = await deleteFilhoViaApi(id)
    if (remote.ok === true) {
      setState((prev) => ({
        ...prev,
        filhos: prev.filhos.filter((f) => f.id !== id),
        obrigacoes: prev.obrigacoes.filter((o) => o.filhoId !== id),
        cobrancas: prev.cobrancas.filter((c) => c.filhoId !== id),
      }))
      return { ok: true }
    }

    if (
      remote.error === 'network' ||
      remote.error.startsWith('http_5') ||
      remote.error === 'not_found'
    ) {
      setState((prev) => {
        const filhos = prev.filhos.filter((f) => f.id !== id)
        const cobrancas = prev.cobrancas.filter((c) => c.filhoId !== id)
        if (prev.dataSource === 'local' || prev.dataSource === 'sample') {
          saveLocalFilhos(filhos)
          saveLocalCobrancas(cobrancas)
        }
        return {
          ...prev,
          filhos,
          obrigacoes: prev.obrigacoes.filter((o) => o.filhoId !== id),
          cobrancas,
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
      if (!isDbUuid(payload.filhoId)) {
        if (supabaseBrowserConfigured()) {
          return {
            ok: false,
            error:
              'id_invalido: filho_id deve ser o UUID do cadastro no banco',
          }
        }
        setState((prev) => ({
          ...prev,
          obrigacoes: [
            ...prev.obrigacoes,
            { ...payload, id: obrigacao.id ?? uid('o') },
          ],
        }))
        return { ok: true }
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
      if (
        !isDbUuid(id) ||
        (patch.filhoId != null && !isDbUuid(patch.filhoId))
      ) {
        if (supabaseBrowserConfigured()) {
          return {
            ok: false,
            error:
              'id_invalido: use o UUID do cadastro no banco, não id de exemplo',
          }
        }
        setState((prev) => ({
          ...prev,
          obrigacoes: prev.obrigacoes.map((o) =>
            o.id === id ? { ...o, ...patch, id } : o,
          ),
        }))
        return { ok: true }
      }
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

  const deleteObrigacao = useCallback(async (id: string) => {
    if (!isDbUuid(id)) {
      if (supabaseBrowserConfigured()) {
        return {
          ok: false,
          error:
            'id_invalido: use o UUID do cadastro no banco, não id de exemplo',
        }
      }
      setState((prev) => ({
        ...prev,
        obrigacoes: prev.obrigacoes.filter((o) => o.id !== id),
      }))
      return { ok: true }
    }
    const remote = await deleteObrigacaoViaApi(id)
    if (remote.ok === true) {
      setState((prev) => ({
        ...prev,
        obrigacoes: prev.obrigacoes.filter((o) => o.id !== id),
      }))
      return { ok: true }
    }
    if (
      remote.error === 'network' ||
      remote.error.startsWith('http_5') ||
      remote.error === 'not_found'
    ) {
      setState((prev) => ({
        ...prev,
        obrigacoes: prev.obrigacoes.filter((o) => o.id !== id),
      }))
      return { ok: true }
    }
    return { ok: false, error: remote.error }
  }, [])

  const replicateObrigacao = useCallback(
    async (input: {
      tipoId: ObligationTypeId
      data: string
      observacoes?: string
      itens: Obrigacao['itens']
      filhoIds: string[]
    }) => {
      const tipoId = String(input.tipoId ?? '').trim()
      const data = input.data.trim().slice(0, 10)
      const filhoIds = [...new Set(input.filhoIds.filter(Boolean))]
      if (!tipoId || !data || filhoIds.length === 0) {
        return {
          ok: false,
          created: 0,
          skipped: 0,
          error: 'missing_fields',
        }
      }

      const tipo = state.tipos.find((t) => t.id === tipoId)
      if (!tipo || !tipo.active) {
        return {
          ok: false,
          created: 0,
          skipped: 0,
          error: 'tipo_invalido',
        }
      }

      const loteId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : uid('lote')

      let created = 0
      let skipped = 0
      let lastError: string | undefined

      for (const filhoId of filhoIds) {
        if (!isDbUuid(filhoId)) {
          if (supabaseBrowserConfigured()) {
            lastError =
              'id_invalido: filho_id deve ser o UUID do cadastro no banco'
            continue
          }
        }
        const already = state.obrigacoes.some((o) => {
          if (o.filhoId !== filhoId) return false
          if (o.loteId && o.loteId === loteId) return true
          return o.tipoId === tipoId && o.data === data
        })
        if (already) {
          skipped += 1
          continue
        }

        const payload: Omit<Obrigacao, 'id'> & { id?: string } = {
          filhoId,
          tipoId,
          data,
          observacoes: input.observacoes?.trim() || undefined,
          itens: input.itens ?? [],
          loteId,
        }

        if (!isDbUuid(filhoId)) {
          created += 1
          setState((prev) => ({
            ...prev,
            obrigacoes: [
              ...prev.obrigacoes,
              { ...payload, id: uid('o') },
            ],
          }))
          continue
        }

        const remote = await createObrigacaoViaApi(payload)

        if (remote.ok === true) {
          created += 1
          setState((prev) => ({
            ...prev,
            obrigacoes: [...prev.obrigacoes, remote.obrigacao],
          }))
          continue
        }

        if (remote.error === 'already_exists') {
          skipped += 1
          continue
        }

        if (
          remote.error === 'network' ||
          remote.error.startsWith('http_5') ||
          remote.error.startsWith('http_')
        ) {
          created += 1
          setState((prev) => ({
            ...prev,
            obrigacoes: [
              ...prev.obrigacoes,
              { ...payload, id: uid('o') },
            ],
          }))
          continue
        }

        lastError = remote.error
      }

      if (created === 0 && skipped === 0) {
        return {
          ok: false,
          created: 0,
          skipped: 0,
          error: lastError ?? 'create_failed',
        }
      }

      return { ok: true, created, skipped, error: lastError }
    },
    [state.obrigacoes, state.tipos],
  )

  const addTipo = useCallback(async (input: ObrigacaoTipoInput) => {
    const nome = input.name.trim()
    if (!nome) return { ok: false, error: 'nome_required' }
    const remote = await createObrigacaoTipoViaApi({
      ...input,
      name: nome,
    })
    if (remote.ok === true) {
      setState((prev) => ({
        ...prev,
        tipos: [...prev.tipos, remote.tipo].sort((a, b) =>
          a.name.localeCompare(b.name, 'pt-BR'),
        ),
      }))
      return { ok: true, tipo: remote.tipo }
    }
    if (
      remote.error === 'network' ||
      remote.error.startsWith('http_5') ||
      remote.error.startsWith('http_') ||
      remote.error === 'supabase_unconfigured'
    ) {
      const tipo: ObligationType = {
        id: input.id?.trim() || uid('ot'),
        name: nome,
        description: (input.description ?? '').trim(),
        yearsOffset:
          input.yearsOffset != null && Number(input.yearsOffset) > 0
            ? Math.floor(Number(input.yearsOffset))
            : null,
        isFestiva: Boolean(input.isFestiva),
        color: (input.color ?? '#6B5B4A').trim() || '#6B5B4A',
        active: true,
        itensPadrao: input.itensPadrao?.map((i) => ({ ...i })),
      }
      setState((prev) => ({
        ...prev,
        tipos: [...prev.tipos, tipo].sort((a, b) =>
          a.name.localeCompare(b.name, 'pt-BR'),
        ),
      }))
      return { ok: true, tipo }
    }
    return { ok: false, error: remote.error }
  }, [])

  const updateTipo = useCallback(
    async (
      id: ObligationTypeId,
      patch: Partial<ObrigacaoTipoInput> & { active?: boolean },
    ) => {
      const remote = await updateObrigacaoTipoViaApi(id, patch)
      if (remote.ok === true) {
        setState((prev) => ({
          ...prev,
          tipos: prev.tipos.map((t) => (t.id === id ? remote.tipo : t)),
        }))
        return { ok: true, tipo: remote.tipo }
      }
      if (
        remote.error === 'network' ||
        remote.error.startsWith('http_5') ||
        remote.error.startsWith('http_') ||
        remote.error === 'supabase_unconfigured'
      ) {
        let updated: ObligationType | undefined
        setState((prev) => ({
          ...prev,
          tipos: prev.tipos.map((t) => {
            if (t.id !== id) return t
            updated = {
              ...t,
              ...(patch.name != null ? { name: patch.name.trim() } : {}),
              ...(patch.description != null
                ? { description: patch.description.trim() }
                : {}),
              ...('yearsOffset' in patch
                ? {
                    yearsOffset:
                      patch.yearsOffset != null &&
                      Number(patch.yearsOffset) > 0
                        ? Math.floor(Number(patch.yearsOffset))
                        : null,
                  }
                : {}),
              ...(patch.isFestiva != null
                ? { isFestiva: Boolean(patch.isFestiva) }
                : {}),
              ...(patch.color != null
                ? { color: patch.color.trim() || t.color }
                : {}),
              ...(patch.active != null ? { active: Boolean(patch.active) } : {}),
              ...(patch.itensPadrao != null
                ? { itensPadrao: patch.itensPadrao.map((i) => ({ ...i })) }
                : {}),
            }
            return updated
          }),
        }))
        if (!updated) return { ok: false, error: 'not_found' }
        return { ok: true, tipo: updated }
      }
      return { ok: false, error: remote.error }
    },
    [],
  )

  const toggleTipo = useCallback(
    async (id: ObligationTypeId) => {
      const current = state.tipos.find((t) => t.id === id)
      if (!current) return { ok: false, error: 'not_found' }
      return updateTipo(id, { active: !current.active })
    },
    [state.tipos, updateTipo],
  )

  const deleteTipo = useCallback(async (id: ObligationTypeId) => {
    const remote = await deleteObrigacaoTipoViaApi(id)
    if (remote.ok === true) {
      setState((prev) => ({
        ...prev,
        tipos: prev.tipos.filter((t) => t.id !== id),
      }))
      return { ok: true }
    }
    if (remote.error === 'in_use') {
      return { ok: false, error: 'in_use' }
    }
    if (
      remote.error === 'network' ||
      remote.error.startsWith('http_5') ||
      remote.error.startsWith('http_') ||
      remote.error === 'supabase_unconfigured' ||
      remote.error === 'not_found'
    ) {
      setState((prev) => ({
        ...prev,
        tipos: prev.tipos.filter((t) => t.id !== id),
      }))
      return { ok: true }
    }
    return { ok: false, error: remote.error }
  }, [])

  const addCobranca = useCallback(async (cobranca: CobrancaInput) => {
    if (!isDbUuid(cobranca.filhoId)) {
      if (supabaseBrowserConfigured()) {
        return {
          ok: false,
          error:
            'id_invalido: filho_id deve ser o UUID do cadastro no banco',
        }
      }
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

  const updateCobranca = useCallback(
    async (id: string, patch: Partial<CobrancaInput> & { pago?: boolean }) => {
      if (
        !isDbUuid(id) ||
        (patch.filhoId != null && !isDbUuid(patch.filhoId))
      ) {
        if (supabaseBrowserConfigured()) {
          return {
            ok: false,
            error:
              'id_invalido: use o UUID do cadastro no banco, não id de exemplo',
          }
        }
        setState((prev) => {
          const cobrancas = prev.cobrancas.map((c) => {
            if (c.id !== id) return c
            const next: Cobranca = { ...c, ...patch, id: c.id }
            if (patch.pago != null) {
              next.pago = patch.pago
              next.pagoEm = patch.pago
                ? new Date().toISOString()
                : undefined
            }
            return next
          })
          saveLocalCobrancas(cobrancas)
          return { ...prev, cobrancas }
        })
        return { ok: true }
      }
      const remote = await updateCobrancaViaApi(id, patch)
      if (remote.ok === true) {
        setState((prev) => ({
          ...prev,
          cobrancas: prev.cobrancas.map((c) =>
            c.id === id ? remote.cobranca : c,
          ),
        }))
        return { ok: true }
      }
      if (
        remote.error === 'network' ||
        remote.error.startsWith('http_5') ||
        remote.error.startsWith('http_')
      ) {
        setState((prev) => {
          const cobrancas = prev.cobrancas.map((c) => {
            if (c.id !== id) return c
            const next: Cobranca = { ...c, ...patch, id: c.id }
            if (patch.pago != null) {
              next.pago = patch.pago
              next.pagoEm = patch.pago
                ? new Date().toISOString()
                : undefined
            }
            return next
          })
          saveLocalCobrancas(cobrancas)
          return { ...prev, cobrancas }
        })
        return { ok: true }
      }
      return { ok: false, error: remote.error }
    },
    [],
  )

  const markCobrancaPago = useCallback(async (id: string, pago: boolean) => {
    return updateCobranca(id, { pago })
  }, [updateCobranca])

  const deleteCobranca = useCallback(async (id: string) => {
    if (!isDbUuid(id)) {
      if (supabaseBrowserConfigured()) {
        return {
          ok: false,
          error:
            'id_invalido: use o UUID do cadastro no banco, não id de exemplo',
        }
      }
      setState((prev) => {
        const cobrancas = prev.cobrancas.filter((c) => c.id !== id)
        saveLocalCobrancas(cobrancas)
        return { ...prev, cobrancas }
      })
      return { ok: true }
    }
    const remote = await deleteCobrancaViaApi(id)
    if (remote.ok === true) {
      setState((prev) => {
        const cobrancas = prev.cobrancas.filter((c) => c.id !== id)
        if (prev.dataSource === 'local' || prev.dataSource === 'sample') {
          saveLocalCobrancas(cobrancas)
        }
        return { ...prev, cobrancas }
      })
      return { ok: true }
    }
    if (
      remote.error === 'network' ||
      remote.error.startsWith('http_5') ||
      remote.error === 'not_found'
    ) {
      setState((prev) => {
        const cobrancas = prev.cobrancas.filter((c) => c.id !== id)
        saveLocalCobrancas(cobrancas)
        return { ...prev, cobrancas }
      })
      return { ok: true }
    }
    return { ok: false, error: remote.error }
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
      deleteFilho,
      addObrigacao,
      updateObrigacao,
      deleteObrigacao,
      replicateObrigacao,
      addTipo,
      updateTipo,
      toggleTipo,
      deleteTipo,
      addCobranca,
      updateCobranca,
      markCobrancaPago,
      deleteCobranca,
      addCobrancaTipo,
      updateCobrancaTipo,
      openNovoFilho,
      editingFilho,
      openAgendar,
      openNovaCobranca,
      openNovaObrigacao,
      setOpenNovoFilho,
      setEditingFilho,
      setOpenAgendar,
      setOpenNovaCobranca,
      setOpenNovaObrigacao,
    }),
    [
      state,
      loadingFilhos,
      resetDemo,
      addFilho,
      updateFilho,
      deleteFilho,
      addObrigacao,
      updateObrigacao,
      deleteObrigacao,
      replicateObrigacao,
      addTipo,
      updateTipo,
      toggleTipo,
      deleteTipo,
      addCobranca,
      updateCobranca,
      markCobrancaPago,
      deleteCobranca,
      addCobrancaTipo,
      updateCobrancaTipo,
      openNovoFilho,
      editingFilho,
      openAgendar,
      openNovaCobranca,
      openNovaObrigacao,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
