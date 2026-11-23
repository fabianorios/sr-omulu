import { useMemo, useState } from 'react'
import { CheckCircle2, Pencil, Plus, Search, Wallet } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import {
  categoriaLabel,
  financeStatusLabel,
  formatBRL,
  getFinanceStatus,
} from '../lib/finance'
import { formatBR } from '../utils/status'
import type { Cobranca, CobrancaCategoria, FinanceStatus } from '../types'

type StatusFilter = 'todos' | FinanceStatus
type TipoFilter = 'todos' | string

function matchesTipo(c: Cobranca, tipoId: string, tipoNome?: string): boolean {
  if (c.tipoId && c.tipoId === tipoId) return true
  if (!c.tipoId && tipoNome && c.tipoNome === tipoNome) return true
  return false
}

export function Financeiro() {
  const { state, setOpenNovaCobranca, markCobrancaPago, addCobrancaTipo, updateCobrancaTipo } =
    useApp()
  const { isAdmin } = useAuth()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('todos')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [showTiposAdmin, setShowTiposAdmin] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoCat, setNovoCat] = useState<CobrancaCategoria>('contribuicao')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editCat, setEditCat] = useState<CobrancaCategoria>('contribuicao')
  const [tipoBusy, setTipoBusy] = useState<string | null>(null)
  const [tipoError, setTipoError] = useState('')

  const filhoMap = useMemo(
    () => new Map(state.filhos.map((f) => [f.id, f])),
    [state.filhos],
  )

  const tiposOrdenados = useMemo(
    () =>
      [...state.cobrancaTipos].sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR'),
      ),
    [state.cobrancaTipos],
  )

  const tiposParaFiltro = useMemo(
    () => tiposOrdenados.filter((t) => t.ativo),
    [tiposOrdenados],
  )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const tipoAtivo =
      tipoFilter === 'todos'
        ? null
        : tiposOrdenados.find((t) => t.id === tipoFilter) ?? null
    return state.cobrancas
      .map((c) => ({
        cobranca: c,
        filho: filhoMap.get(c.filhoId),
        status: getFinanceStatus(c),
      }))
      .filter(({ cobranca, filho, status }) => {
        if (statusFilter !== 'todos' && status !== statusFilter) return false
        if (tipoAtivo && !matchesTipo(cobranca, tipoAtivo.id, tipoAtivo.nome)) {
          return false
        }
        if (!q) return true
        const hay = [
          filho?.nome ?? '',
          cobranca.tipoNome,
          cobranca.descricao ?? '',
          cobranca.referencia ?? '',
        ]
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => {
        const order = { vencido: 0, aberto: 1, pago: 2 }
        const so = order[a.status] - order[b.status]
        if (so !== 0) return so
        return a.cobranca.vencimento.localeCompare(b.cobranca.vencimento)
      })
  }, [state.cobrancas, filhoMap, query, statusFilter, tipoFilter, tiposOrdenados])

  const totaisPorTipo = useMemo(() => {
    return tiposParaFiltro.map((tipo) => {
      const doTipo = state.cobrancas.filter((c) =>
        matchesTipo(c, tipo.id, tipo.nome),
      )
      const total = doTipo.reduce((s, c) => s + Number(c.valor || 0), 0)
      const emAberto = doTipo
        .filter((c) => getFinanceStatus(c) !== 'pago')
        .reduce((s, c) => s + Number(c.valor || 0), 0)
      return { tipo, total, emAberto, qtd: doTipo.length }
    })
  }, [state.cobrancas, tiposParaFiltro])

  const totaisVisiveis = useMemo(() => {
    if (tipoFilter === 'todos') return totaisPorTipo
    return totaisPorTipo.filter((t) => t.tipo.id === tipoFilter)
  }, [totaisPorTipo, tipoFilter])

  async function togglePago(id: string, pago: boolean) {
    setBusyId(id)
    await markCobrancaPago(id, pago)
    setBusyId(null)
  }

  async function handleAddTipo() {
    const nome = novoNome.trim()
    if (!nome) return
    setTipoBusy('new')
    setTipoError('')
    const result = await addCobrancaTipo({ nome, categoria: novoCat })
    setTipoBusy(null)
    if (!result.ok) {
      setTipoError(result.error ?? 'Não foi possível criar o tipo.')
      return
    }
    setNovoNome('')
    setNovoCat('contribuicao')
  }

  async function handleSaveEdit(id: string) {
    const nome = editNome.trim()
    if (!nome) return
    setTipoBusy(id)
    setTipoError('')
    const result = await updateCobrancaTipo(id, {
      nome,
      categoria: editCat,
    })
    setTipoBusy(null)
    if (!result.ok) {
      setTipoError(result.error ?? 'Não foi possível salvar.')
      return
    }
    setEditingId(null)
  }

  async function handleToggleAtivo(id: string, ativo: boolean) {
    setTipoBusy(id)
    setTipoError('')
    const result = await updateCobrancaTipo(id, { ativo })
    setTipoBusy(null)
    if (!result.ok) {
      setTipoError(result.error ?? 'Não foi possível atualizar.')
      return
    }
    if (!ativo && tipoFilter === id) setTipoFilter('todos')
  }

  const statusFilters: { id: StatusFilter; label: string }[] = [
    { id: 'todos', label: 'Todas' },
    { id: 'vencido', label: 'Vencidas' },
    { id: 'aberto', label: 'Em aberto' },
    { id: 'pago', label: 'Pagas' },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="animate-fade-in flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--color-forest)] sm:text-3xl md:text-4xl">
            Agenda financeira
          </h2>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            Filtre por tipo de pagamento cadastrado no terreiro. Marque
            pagamentos e acompanhe devedores.
          </p>
        </div>
        {isAdmin ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowTiposAdmin((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-white/80 px-3.5 py-2 text-sm font-semibold text-[var(--color-ink-muted)] hover:bg-[var(--color-parchment)]/60"
            >
              Tipos de pagamento
            </button>
            <button
              type="button"
              onClick={() => setOpenNovaCobranca(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-forest)] px-3.5 py-2 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-forest-hover)]"
            >
              <Wallet size={16} />
              + Nova cobrança
            </button>
          </div>
        ) : null}
      </div>

      {isAdmin && showTiposAdmin ? (
        <section className="animate-fade-in space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)]/80 p-4 shadow-sm">
          <div>
            <h3 className="font-serif text-lg font-semibold text-[var(--color-forest)]">
              Tipos de pagamento
            </h3>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              Cadastre os tipos usados no terreiro. Eles aparecem como filtros na
              agenda.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_auto]">
            <input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome do tipo (ex.: Mensalidade)"
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)] focus:ring-2 focus:ring-[var(--color-forest)]/15"
            />
            <select
              value={novoCat}
              onChange={(e) => setNovoCat(e.target.value as CobrancaCategoria)}
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)]"
            >
              <option value="mensalidade">Mensalidade</option>
              <option value="contribuicao">Contribuição</option>
              <option value="outro">Outro</option>
            </select>
            <button
              type="button"
              disabled={tipoBusy === 'new' || !novoNome.trim()}
              onClick={handleAddTipo}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[var(--color-forest)] px-3 py-2 text-sm font-semibold text-[var(--color-forest)] disabled:opacity-50"
            >
              <Plus size={14} />
              Incluir
            </button>
          </div>

          {tipoError ? (
            <p className="text-sm text-[var(--color-status-vencida-fg)]">
              {tipoError}
            </p>
          ) : null}

          <ul className="space-y-2">
            {tiposOrdenados.map((tipo) => (
              <li
                key={tipo.id}
                className={[
                  'flex flex-col gap-2 rounded-md border border-[var(--color-border-soft)] bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between',
                  !tipo.ativo ? 'opacity-60' : '',
                ].join(' ')}
              >
                {editingId === tipo.id ? (
                  <div className="grid w-full gap-2 sm:grid-cols-[1.4fr_1fr_auto_auto]">
                    <input
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      className="rounded-md border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm"
                    />
                    <select
                      value={editCat}
                      onChange={(e) =>
                        setEditCat(e.target.value as CobrancaCategoria)
                      }
                      className="rounded-md border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm"
                    >
                      <option value="mensalidade">Mensalidade</option>
                      <option value="contribuicao">Contribuição</option>
                      <option value="outro">Outro</option>
                    </select>
                    <button
                      type="button"
                      disabled={tipoBusy === tipo.id}
                      onClick={() => handleSaveEdit(tipo.id)}
                      className="rounded-md bg-[var(--color-forest)] px-3 py-1.5 text-xs font-semibold text-[var(--color-cream)]"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-md px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-muted)]"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--color-ink)]">
                        {tipo.nome}
                      </p>
                      <p className="text-xs text-[var(--color-ink-faint)]">
                        {categoriaLabel(tipo.categoria)}
                        {!tipo.ativo ? ' · inativo' : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(tipo.id)
                          setEditNome(tipo.nome)
                          setEditCat(tipo.categoria)
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-ink-muted)]"
                      >
                        <Pencil size={12} />
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={tipoBusy === tipo.id}
                        onClick={() => handleToggleAtivo(tipo.id, !tipo.ativo)}
                        className="rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-ink-muted)]"
                      >
                        {tipo.ativo ? 'Desativar' : 'Reativar'}
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="animate-fade-in-delay-1 flex flex-col gap-3">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-ink-faint)]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por filho, tipo ou descrição..."
            className="w-full rounded-md border border-[var(--color-border)] bg-white/80 py-2.5 pr-4 pl-10 text-sm outline-none focus:border-[var(--color-forest)] focus:ring-2 focus:ring-[var(--color-forest)]/15"
          />
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-[var(--color-ink-faint)] uppercase">
            Tipo de pagamento
          </p>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={tipoFilter === 'todos'}
              onClick={() => setTipoFilter('todos')}
              label="Todos"
            />
            {tiposParaFiltro.map((t) => (
              <FilterChip
                key={t.id}
                active={tipoFilter === t.id}
                onClick={() => setTipoFilter(t.id)}
                label={t.nome}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-[var(--color-ink-faint)] uppercase">
            Situação
          </p>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((f) => (
              <FilterChip
                key={f.id}
                active={statusFilter === f.id}
                onClick={() => setStatusFilter(f.id)}
                label={f.label}
              />
            ))}
          </div>
        </div>
      </div>

      {totaisVisiveis.length > 0 ? (
        <div className="animate-fade-in-delay-1 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--color-ink-muted)]">
          {totaisVisiveis.map(({ tipo, total, emAberto, qtd }) => (
            <div key={tipo.id}>
              <span className="font-semibold text-[var(--color-ink)]">
                {tipo.nome}
              </span>
              {': '}
              {formatBRL(total)}
              {emAberto > 0 ? (
                <span className="text-[var(--color-ink-faint)]">
                  {' '}
                  ({formatBRL(emAberto)} em aberto · {qtd})
                </span>
              ) : (
                <span className="text-[var(--color-ink-faint)]"> · {qtd}</span>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <div className="animate-fade-in-delay-2 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">
            Nenhuma cobrança neste filtro.
          </p>
        ) : null}
        {rows.map(({ cobranca, filho, status }) => (
          <article
            key={cobranca.id}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)]/80 p-4 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--color-ink)]">
                  {filho?.nome ?? 'Filho removido'}
                </p>
                <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                  {cobranca.tipoNome}
                  <span className="text-[var(--color-ink-faint)]">
                    {' '}
                    · {categoriaLabel(cobranca.categoria)}
                  </span>
                </p>
                {cobranca.descricao ? (
                  <p className="mt-1 text-xs text-[var(--color-ink-faint)]">
                    {cobranca.descricao}
                  </p>
                ) : null}
                <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-ink-muted)]">
                  <div>
                    <span className="text-[var(--color-ink-faint)]">Valor </span>
                    {formatBRL(cobranca.valor)}
                  </div>
                  <div>
                    <span className="text-[var(--color-ink-faint)]">
                      Vencimento{' '}
                    </span>
                    {formatBR(cobranca.vencimento)}
                    {cobranca.diaVencimento
                      ? ` (dia ${cobranca.diaVencimento})`
                      : ''}
                  </div>
                  {cobranca.referencia ? (
                    <div>
                      <span className="text-[var(--color-ink-faint)]">
                        Ref.{' '}
                      </span>
                      {cobranca.referencia}
                    </div>
                  ) : null}
                </dl>
              </div>
              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                <FinanceBadge status={status} />
                <button
                  type="button"
                  disabled={busyId === cobranca.id}
                  onClick={() => togglePago(cobranca.id, !cobranca.pago)}
                  className={[
                    'inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold',
                    cobranca.pago
                      ? 'border-[var(--color-border)] text-[var(--color-ink-muted)] hover:bg-[var(--color-parchment)]'
                      : 'border-[var(--color-forest)] text-[var(--color-forest)] hover:bg-[var(--color-parchment)]',
                  ].join(' ')}
                >
                  <CheckCircle2 size={14} />
                  {cobranca.pago ? 'Desmarcar pagamento' : 'Marcar como pago'}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-md border px-3 py-1.5 text-xs font-semibold transition',
        active
          ? 'border-[var(--color-forest)] bg-[var(--color-parchment)] text-[var(--color-forest)]'
          : 'border-[var(--color-border)] bg-white/70 text-[var(--color-ink-muted)] hover:bg-[var(--color-parchment)]/60',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function FinanceBadge({ status }: { status: FinanceStatus }) {
  const styles =
    status === 'pago'
      ? 'bg-[var(--color-status-emdia-bg)] text-[var(--color-status-emdia-fg)]'
      : status === 'vencido'
        ? 'bg-[var(--color-status-vencida-bg)] text-[var(--color-status-vencida-fg)]'
        : 'bg-[var(--color-status-proxima-bg)] text-[var(--color-status-proxima-fg)]'
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${styles}`}
    >
      {financeStatusLabel(status)}
    </span>
  )
}
