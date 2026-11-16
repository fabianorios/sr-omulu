import { useMemo, useState } from 'react'
import { History, Pencil, Search, UserPlus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { StatusBadge } from '../components/StatusBadge'
import {
  formatBR,
  getStatus,
  nextObligationForFilho,
} from '../utils/status'
import type { Filho } from '../types'
import { formatEntidade, formatObrigacaoItem } from '../types'

export function Filhos() {
  const {
    state,
    loadingFilhos,
    setOpenNovoFilho,
    setEditingFilho,
  } = useApp()
  const { isAdmin } = useAuth()
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
        const hay = [
          f.nome,
          f.paiDeCabeca,
          f.maeDeCabeca,
          ...f.entidades.map((e) => `${e.tipo} ${e.nome}`),
          f.endereco.cidade,
        ]
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
      .map((filho) => {
        const obr = nextObligationForFilho(filho.id, state.obrigacoes)
        return {
          filho,
          obr,
          status: obr ? getStatus(obr.data) : null,
        }
      })
  }, [state.filhos, state.obrigacoes, query])

  const detailFilho = state.filhos.find((f) => f.id === detailId)
  const detailHistory = detailId
    ? state.obrigacoes
        .filter((o) => o.filhoId === detailId)
        .sort((a, b) => a.data.localeCompare(b.data))
    : []

  function openEdit(filho: Filho) {
    setDetailId(null)
    setEditingFilho(filho)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="animate-fade-in flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--color-forest)] sm:text-3xl md:text-4xl">
            Lista de Filhos
          </h2>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            Cadastro completo: pai/mãe de cabeça, entidades, datas, telefones e
            endereço. Busque por nome, pai, mãe ou entidade.
          </p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => {
              setEditingFilho(null)
              setOpenNovoFilho(true)
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--color-forest)] px-3.5 py-2 text-sm font-semibold text-[var(--color-cream)] transition hover:bg-[var(--color-forest-hover)]"
          >
            <UserPlus size={16} />
            + Novo Filho
          </button>
        ) : null}
      </div>

      <div className="animate-fade-in-delay-1 relative">
        <Search
          size={18}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--color-ink-faint)]"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, pai, mãe, entidade ou cidade..."
          className="w-full rounded-md border border-[var(--color-border)] bg-white/80 py-2.5 pr-4 pl-10 text-sm outline-none focus:border-[var(--color-forest)] focus:ring-2 focus:ring-[var(--color-forest)]/15"
        />
      </div>

      {loadingFilhos ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Carregando filhos…</p>
      ) : null}

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
                  Pai {filho.paiDeCabeca} · Mãe {filho.maeDeCabeca}
                </p>
                {filho.entidades.length > 0 ? (
                  <p className="mt-1 text-xs text-[var(--color-ink-faint)]">
                    Entidades:{' '}
                    {filho.entidades.map(formatEntidade).join(', ')}
                  </p>
                ) : null}
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
                <dt className="text-[var(--color-ink-faint)]">Entrada</dt>
                <dd>{formatBR(filho.dataEntrada)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--color-ink-faint)]">Iniciação</dt>
                <dd>{formatBR(filho.iniciacao)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--color-ink-faint)]">WhatsApp</dt>
                <dd>{filho.telefone1 || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--color-ink-faint)]">Cidade</dt>
                <dd>
                  {[filho.endereco.cidade, filho.endereco.uf]
                    .filter(Boolean)
                    .join('/') || '—'}
                </dd>
              </div>
            </dl>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => openEdit(filho)}
                className="inline-flex items-center justify-center gap-1.5 rounded border border-[var(--color-border)] bg-white/70 px-2.5 py-2 text-xs font-medium text-[var(--color-forest)] hover:bg-[var(--color-parchment)]"
              >
                <Pencil size={13} />
                Editar
              </button>
              <button
                type="button"
                onClick={() => setDetailId(filho.id)}
                className="inline-flex items-center justify-center gap-1.5 rounded border border-[var(--color-border)] bg-white/70 px-2.5 py-2 text-xs font-medium text-[var(--color-forest)] hover:bg-[var(--color-parchment)]"
              >
                <History size={13} />
                Histórico
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="animate-fade-in-delay-2 hidden overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)]/80 shadow-sm md:block">
        <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-soft)] text-[11px] tracking-wide text-[var(--color-ink-faint)] uppercase">
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Pai / Mãe</th>
              <th className="px-4 py-3 font-semibold">Entidades</th>
              <th className="px-4 py-3 font-semibold">Datas</th>
              <th className="px-4 py-3 font-semibold">Telefones</th>
              <th className="px-4 py-3 font-semibold">Cidade</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-soft)]">
            {rows.map(({ filho, obr, status }) => (
              <tr key={filho.id} className="hover:bg-[var(--color-parchment)]/40">
                <td className="px-4 py-3.5 font-semibold text-[var(--color-ink)]">
                  {filho.nome}
                </td>
                <td className="px-4 py-3.5 text-[var(--color-ink-muted)]">
                  <div>Pai {filho.paiDeCabeca}</div>
                  <div className="text-xs text-[var(--color-ink-faint)]">
                    Mãe {filho.maeDeCabeca}
                  </div>
                </td>
                <td className="max-w-[200px] px-4 py-3.5 text-xs text-[var(--color-ink-muted)]">
                  {filho.entidades.length
                    ? filho.entidades.map(formatEntidade).join(', ')
                    : '—'}
                </td>
                <td className="px-4 py-3.5 text-xs text-[var(--color-ink-muted)]">
                  <div>Nasc. {formatBR(filho.dataNascimento)}</div>
                  <div>Entr. {formatBR(filho.dataEntrada)}</div>
                  <div>Inic. {formatBR(filho.iniciacao)}</div>
                </td>
                <td className="px-4 py-3.5 text-[var(--color-ink-muted)]">
                  <div>{filho.telefone1 || '—'}</div>
                  {filho.telefone2 ? (
                    <div className="text-xs text-[var(--color-ink-faint)]">
                      {filho.telefone2}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3.5 text-[var(--color-ink-muted)]">
                  {[filho.endereco.cidade, filho.endereco.uf]
                    .filter(Boolean)
                    .join('/') || '—'}
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
                    <span className="text-xs text-[var(--color-ink-faint)]">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(filho)}
                      className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] bg-white/70 px-2 py-1 text-xs font-medium text-[var(--color-forest)] hover:bg-[var(--color-parchment)]"
                    >
                      <Pencil size={12} />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailId(filho.id)}
                      className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] bg-white/70 px-2 py-1 text-xs font-medium text-[var(--color-forest)] hover:bg-[var(--color-parchment)]"
                    >
                      <History size={12} />
                      Histórico
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailFilho && (
        <div
          className="animate-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-ink)]/40 p-0 sm:items-center sm:p-4"
          onClick={() => setDetailId(null)}
          role="presentation"
        >
          <div
            className="animate-modal max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-cream)] p-5 shadow-xl sm:rounded-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <h3 className="font-serif text-2xl font-semibold text-[var(--color-forest)]">
              {detailFilho.nome}
            </h3>
            <dl className="mt-3 space-y-1.5 text-sm text-[var(--color-ink-muted)]">
              <div>Pai de cabeça: {detailFilho.paiDeCabeca}</div>
              <div>Mãe de cabeça: {detailFilho.maeDeCabeca}</div>
              <div>
                Entidades:{' '}
                {detailFilho.entidades.length
                  ? detailFilho.entidades.map(formatEntidade).join(', ')
                  : '—'}
              </div>
              <div>Nascimento: {formatBR(detailFilho.dataNascimento)}</div>
              <div>Entrada no terreiro: {formatBR(detailFilho.dataEntrada)}</div>
              <div>Iniciação / fechamento: {formatBR(detailFilho.iniciacao)}</div>
              <div>Tel. 1: {detailFilho.telefone1 || '—'}</div>
              <div>Tel. 2: {detailFilho.telefone2 || '—'}</div>
              {detailFilho.email ? <div>E-mail: {detailFilho.email}</div> : null}
              <div>
                Endereço:{' '}
                {[
                  detailFilho.endereco.logradouro,
                  detailFilho.endereco.numero,
                  detailFilho.endereco.complemento,
                  detailFilho.endereco.bairro,
                  detailFilho.endereco.cidade,
                  detailFilho.endereco.uf,
                  detailFilho.endereco.cep,
                ]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </div>
            </dl>

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
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--color-ink)]">
                          {tipo?.name ?? o.tipoId}
                        </p>
                        <p className="text-xs text-[var(--color-ink-muted)]">
                          {formatBR(o.data)}
                        </p>
                        {o.itens?.length ? (
                          <p className="mt-0.5 text-xs text-[var(--color-ink-faint)]">
                            Itens:{' '}
                            {o.itens.map(formatObrigacaoItem).join(', ')}
                          </p>
                        ) : null}
                      </div>
                      <StatusBadge status={getStatus(o.data)} />
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => openEdit(detailFilho)}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-forest)] px-4 py-2 text-sm font-semibold text-[var(--color-forest)]"
              >
                <Pencil size={14} />
                Editar cadastro
              </button>
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
