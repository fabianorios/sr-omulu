import { useMemo, useState } from 'react'
import { History, Search } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { StatusBadge } from '../components/StatusBadge'
import {
  formatBR,
  getStatus,
  nextObligationForFilho,
} from '../utils/status'

export function Filhos() {
  const { state } = useApp()
  const [query, setQuery] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)

  const tipoMap = useMemo(
    () => new Map(state.tipos.map((t) => [t.id, t])),
    [state.tipos],
  )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.filhos
      .filter((f) => {
        if (!q) return true
        return (
          f.nome.toLowerCase().includes(q) ||
          f.orixa.toLowerCase().includes(q)
        )
      })
      .map((filho) => {
        const obr = nextObligationForFilho(filho.id, state.obrigacoes)
        return {
          filho,
          obr,
          status: obr ? getStatus(obr.data) : null,
          tipo: obr ? tipoMap.get(obr.tipoId) : null,
        }
      })
  }, [state.filhos, state.obrigacoes, query, tipoMap])

  const detailFilho = state.filhos.find((f) => f.id === detailId)
  const detailHistory = detailId
    ? state.obrigacoes
        .filter((o) => o.filhoId === detailId)
        .sort((a, b) => a.data.localeCompare(b.data))
    : []

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="animate-fade-in">
        <h2 className="font-serif text-2xl font-semibold text-[var(--color-forest)] sm:text-3xl md:text-4xl">
          Lista de Filhos
        </h2>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Busque por nome ou Orixá de cabeça. Consulte o histórico detalhado de
          cada filho.
        </p>
      </div>

      <div className="animate-fade-in-delay-1 relative">
        <Search
          size={18}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-ink-faint)]"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou Orixá..."
          className="w-full rounded-md border border-[var(--color-border)] bg-white/80 py-2.5 pr-4 pl-10 text-sm outline-none focus:border-[var(--color-forest)] focus:ring-2 focus:ring-[var(--color-forest)]/15"
        />
      </div>

      <div className="animate-fade-in-delay-2 space-y-3 md:hidden">
        {rows.map(({ filho, obr, status }) => (
          <article
            key={filho.id}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)]/80 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--color-ink)]">
                  {filho.nome}
                </p>
                <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                  {filho.orixa}
                </p>
              </div>
              {status && obr ? (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={status} />
                  <span className="text-[11px] text-[var(--color-ink-faint)]">
                    {formatBR(obr.data)}
                  </span>
                </div>
              ) : null}
            </div>
            <dl className="mt-3 space-y-1 text-sm text-[var(--color-ink-muted)]">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--color-ink-faint)]">Iniciação</dt>
                <dd>{formatBR(filho.iniciacao)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--color-ink-faint)]">WhatsApp</dt>
                <dd>{filho.telefone}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setDetailId(filho.id)}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded border border-[var(--color-border)] bg-white/70 px-2.5 py-2 text-xs font-medium text-[var(--color-forest)] hover:bg-[var(--color-parchment)]"
            >
              <History size={13} />
              Detalhes
            </button>
          </article>
        ))}
      </div>

      <div className="animate-fade-in-delay-2 hidden overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)]/80 shadow-sm md:block">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-soft)] text-[11px] tracking-wide text-[var(--color-ink-faint)] uppercase">
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Orixá de cabeça</th>
              <th className="px-4 py-3 font-semibold">Iniciação / Fechamento</th>
              <th className="px-4 py-3 font-semibold">Telefone / WhatsApp</th>
              <th className="px-4 py-3 font-semibold">Status Obrigação</th>
              <th className="px-4 py-3 font-semibold">Histórico</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-soft)]">
            {rows.map(({ filho, obr, status }) => (
              <tr key={filho.id} className="hover:bg-[var(--color-parchment)]/40">
                <td className="px-4 py-3.5 font-semibold text-[var(--color-ink)]">
                  {filho.nome}
                </td>
                <td className="px-4 py-3.5 text-[var(--color-ink-muted)]">
                  {filho.orixa}
                </td>
                <td className="px-4 py-3.5 text-[var(--color-ink-muted)]">
                  {formatBR(filho.iniciacao)}
                </td>
                <td className="px-4 py-3.5 text-[var(--color-ink-muted)]">
                  {filho.telefone}
                </td>
                <td className="px-4 py-3.5">
                  {status && obr ? (
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={status} />
                      <span className="text-xs text-[var(--color-ink-faint)]">
                        {formatBR(obr.data)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--color-ink-faint)]">
                      —
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => setDetailId(filho.id)}
                    className="inline-flex items-center gap-1.5 rounded border border-[var(--color-border)] bg-white/70 px-2.5 py-1 text-xs font-medium text-[var(--color-forest)] hover:bg-[var(--color-parchment)]"
                  >
                    <History size={13} />
                    Detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailFilho && (
        <div
          className="animate-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/40 p-4"
          onClick={() => setDetailId(null)}
          role="presentation"
        >
          <div
            className="animate-modal w-full max-w-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <h3 className="font-serif text-2xl font-semibold text-[var(--color-forest)]">
              {detailFilho.nome}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              {detailFilho.orixa} · Iniciação {formatBR(detailFilho.iniciacao)}
              {detailFilho.email ? ` · ${detailFilho.email}` : ''}
            </p>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              {detailFilho.telefone}
            </p>

            <h4 className="mt-5 text-xs font-semibold tracking-wide text-[var(--color-ink-faint)] uppercase">
              Histórico de obrigações
            </h4>
            {detailHistory.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                Nenhuma obrigação registrada.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-[var(--color-border-soft)]">
                {detailHistory.map((o) => {
                  const tipo = tipoMap.get(o.tipoId)
                  return (
                    <li
                      key={o.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div>
                        <p className="font-medium text-[var(--color-ink)]">
                          {tipo?.name ?? o.tipoId}
                        </p>
                        <p className="text-xs text-[var(--color-ink-muted)]">
                          {formatBR(o.data)}
                        </p>
                      </div>
                      <StatusBadge status={getStatus(o.data)} />
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailId(null)}
                className="rounded-md bg-[var(--color-forest)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
