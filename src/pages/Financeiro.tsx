import { useMemo, useState } from 'react'
import { CheckCircle2, Search, Wallet } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  categoriaLabel,
  financeStatusLabel,
  formatBRL,
  getFinanceStatus,
} from '../lib/finance'
import { formatBR } from '../utils/status'
import type { FinanceStatus } from '../types'

type Filter = 'todos' | FinanceStatus | 'mensalidade'

export function Financeiro() {
  const { state, setOpenNovaCobranca, markCobrancaPago } = useApp()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('todos')
  const [busyId, setBusyId] = useState<string | null>(null)

  const filhoMap = useMemo(
    () => new Map(state.filhos.map((f) => [f.id, f])),
    [state.filhos],
  )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.cobrancas
      .map((c) => ({
        cobranca: c,
        filho: filhoMap.get(c.filhoId),
        status: getFinanceStatus(c),
      }))
      .filter(({ cobranca, filho, status }) => {
        if (filter === 'mensalidade' && cobranca.categoria !== 'mensalidade') {
          return false
        }
        if (
          filter !== 'todos' &&
          filter !== 'mensalidade' &&
          status !== filter
        ) {
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
  }, [state.cobrancas, filhoMap, query, filter])

  async function togglePago(id: string, pago: boolean) {
    setBusyId(id)
    await markCobrancaPago(id, pago)
    setBusyId(null)
  }

  const filters: { id: Filter; label: string }[] = [
    { id: 'todos', label: 'Todas' },
    { id: 'vencido', label: 'Vencidas' },
    { id: 'aberto', label: 'Em aberto' },
    { id: 'pago', label: 'Pagas' },
    { id: 'mensalidade', label: 'Mensalidades' },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="animate-fade-in flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--color-forest)] sm:text-3xl md:text-4xl">
            Agenda financeira
          </h2>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            Mensalidades (valor fixo + dia do mês) e contribuições do terreiro.
            Marque pagamentos e acompanhe devedores.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpenNovaCobranca(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--color-forest)] px-3.5 py-2 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-forest-hover)]"
        >
          <Wallet size={16} />
          + Nova cobrança
        </button>
      </div>

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
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={[
                'rounded-md border px-3 py-1.5 text-xs font-semibold transition',
                filter === f.id
                  ? 'border-[var(--color-forest)] bg-[var(--color-parchment)] text-[var(--color-forest)]'
                  : 'border-[var(--color-border)] bg-white/70 text-[var(--color-ink-muted)] hover:bg-[var(--color-parchment)]/60',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

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
