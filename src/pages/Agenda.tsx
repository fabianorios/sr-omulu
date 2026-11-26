import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from 'lucide-react'
import { PAIS_DE_CABECA, type PaiDeCabeca } from '../data/catalog'
import { REFERENCE_DATE } from '../data/mock'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { EditarObrigacaoModal } from '../components/modals/EditarObrigacaoModal'
import type { ObligationTypeId, Obrigacao } from '../types'
import { obrigacaoLabel } from '../types'
import { formatBR, formatLongDay, parseDate } from '../utils/status'

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

type DayItemKind = 'obrigacao' | 'evento'

export function Agenda() {
  const { state, setOpenNovaObrigacao, deleteObrigacao } = useApp()
  const { isAdmin } = useAuth()
  const [month, setMonth] = useState(() => startOfMonth(REFERENCE_DATE))
  const [selected, setSelected] = useState(() => REFERENCE_DATE)
  const [filterPai, setFilterPai] = useState<PaiDeCabeca | 'Todos'>('Todos')
  const [filterTipo, setFilterTipo] = useState<ObligationTypeId | 'Todos'>(
    'Todos',
  )
  const [editingObr, setEditingObr] = useState<Obrigacao | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const filhoMap = useMemo(
    () => new Map(state.filhos.map((f) => [f.id, f])),
    [state.filhos],
  )
  const tipoMap = useMemo(
    () => new Map(state.tipos.map((t) => [t.id, t])),
    [state.tipos],
  )

  const filteredObrigacoes = useMemo(() => {
    return state.obrigacoes.filter((o) => {
      const filho = filhoMap.get(o.filhoId)
      if (!filho) return false
      if (filterPai !== 'Todos' && filho.paiDeCabeca !== filterPai) return false
      if (filterTipo !== 'Todos' && o.tipoId !== filterTipo) return false
      return true
    })
  }, [state.obrigacoes, filhoMap, filterPai, filterTipo])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [month])

  function markersForDay(day: Date) {
    const dots: { key: string; color: string; label: string }[] = []

    for (const o of filteredObrigacoes) {
      if (isSameDay(parseDate(o.data), day)) {
        const tipo = tipoMap.get(o.tipoId)
        dots.push({
          key: o.id,
          color: tipo?.color ?? '#6B5B4A',
          label: obrigacaoLabel(o, tipo?.name),
        })
      }
    }

    if (filterTipo === 'Todos' || filterTipo === 'festiva') {
      for (const e of state.eventos) {
        if (isSameDay(parseDate(e.data), day)) {
          dots.push({
            key: e.id,
            color: 'var(--color-house-event)',
            label: e.titulo,
          })
        }
      }
    }

    return dots
  }

  const selectedItems = useMemo(() => {
    const items: {
      id: string
      kind: DayItemKind
      title: string
      detail: string
      color: string
      obrigacao?: Obrigacao
    }[] = []

    for (const o of filteredObrigacoes) {
      if (isSameDay(parseDate(o.data), selected)) {
        const filho = filhoMap.get(o.filhoId)
        const tipo = tipoMap.get(o.tipoId)
        if (filho) {
          const label = obrigacaoLabel(o, tipo?.name)
          const itensHint =
            o.itens?.length > 0
              ? ` · ${o.itens.length} item(ns)`
              : ''
          items.push({
            id: o.id,
            kind: 'obrigacao',
            title: filho.nome,
            detail: `${label}${itensHint} · Pai ${filho.paiDeCabeca} · Mãe ${filho.maeDeCabeca}`,
            color: tipo?.color ?? '#6B5B4A',
            obrigacao: o,
          })
        }
      }
    }

    for (const e of state.eventos) {
      if (isSameDay(parseDate(e.data), selected)) {
        items.push({
          id: e.id,
          kind: 'evento',
          title: e.titulo,
          detail: 'Evento da casa',
          color: 'var(--color-house-event)',
        })
      }
    }

    return items
  }, [filteredObrigacoes, selected, filhoMap, tipoMap, state.eventos])

  async function handleDeleteObrigacao(o: Obrigacao, title: string) {
    if (!isAdmin) return
    const ok = window.confirm(
      `Excluir obrigação de ${title}?\n\nEsta ação não pode ser desfeita.`,
    )
    if (!ok) return
    setBusyId(o.id)
    const result = await deleteObrigacao(o.id)
    setBusyId(null)
    if (!result.ok) {
      window.alert(result.error ?? 'Não foi possível excluir.')
      return
    }
    if (editingObr?.id === o.id) setEditingObr(null)
  }

  const legend = [
    ...state.tipos.map((t) => ({
      name: t.name.replace('Obrigação de ', '').replace('Obrigação ', ''),
      color: t.color,
    })),
    { name: 'Evento da casa', color: 'var(--color-house-event)' },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="animate-fade-in flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--color-tan)] uppercase">
            Calendário
          </p>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-[var(--color-forest)] sm:text-3xl md:text-4xl">
            Agenda da Casa
          </h2>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            Marcadores coloridos por tipo de obrigação e eventos da corrente.
          </p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setOpenNovaObrigacao(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--color-forest)] px-3.5 py-2 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-forest-hover)]"
          >
            <CalendarPlus size={16} />
            Agendar obrigação
          </button>
        ) : null}
      </div>

      <div className="animate-fade-in-delay-1 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
          Pai de cabeça
          <select
            value={filterPai}
            onChange={(e) =>
              setFilterPai(e.target.value as PaiDeCabeca | 'Todos')
            }
            className="min-w-[160px] rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case text-[var(--color-ink)]"
          >
            <option value="Todos">Todos</option>
            {PAIS_DE_CABECA.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
          Tipo de obrigação
          <select
            value={filterTipo}
            onChange={(e) =>
              setFilterTipo(e.target.value as ObligationTypeId | 'Todos')
            }
            className="min-w-[200px] rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case text-[var(--color-ink)]"
          >
            <option value="Todos">Todos</option>
            {state.tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="animate-fade-in-delay-2 grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)]/80 p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              className="rounded p-1.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-parchment)]"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={20} />
            </button>
            <h3 className="font-serif text-xl font-semibold capitalize text-[var(--color-forest)]">
              {format(month, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="rounded p-1.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-parchment)]"
              aria-label="Próximo mês"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-1 text-center text-[10px] font-semibold tracking-wide text-[var(--color-ink-faint)]"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const inMonth = isSameMonth(day, month)
              const isSelected = isSameDay(day, selected)
              const dots = markersForDay(day)
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelected(day)}
                  className={[
                    'flex min-h-[48px] flex-col items-center rounded-md border p-1 transition sm:min-h-[68px] sm:p-1.5',
                    isSelected
                      ? 'border-[var(--color-gold)] bg-[var(--color-parchment)]'
                      : 'border-transparent hover:bg-[var(--color-parchment)]/70',
                    inMonth
                      ? 'text-[var(--color-ink)]'
                      : 'text-[var(--color-ink-faint)]/50',
                  ].join(' ')}
                >
                  <span className="text-xs font-medium sm:text-sm">
                    {format(day, 'd')}
                  </span>
                  <div className="mt-auto flex flex-wrap justify-center gap-0.5 pb-0.5">
                    {dots.slice(0, 4).map((d) => (
                      <span
                        key={d.key}
                        title={d.label}
                        className="h-1.5 w-1.5 rounded-[2px]"
                        style={{ backgroundColor: d.color }}
                      />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-[var(--color-border-soft)] pt-4">
            {legend.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)]"
              >
                <span
                  className="h-2.5 w-2.5 rounded-[2px]"
                  style={{ backgroundColor: item.color }}
                />
                {item.name}
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)]/80 p-5 shadow-sm">
          <h3 className="font-serif text-xl font-semibold text-[var(--color-forest)]">
            {formatLongDay(selected)}
          </h3>
          {selectedItems.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--color-ink-muted)]">
              Nada agendado neste dia.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {selectedItems.map((item) => (
                <li
                  key={item.id}
                  className="rounded-md border border-[var(--color-border-soft)] bg-white/50 p-3"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[var(--color-ink)]">
                        {item.title}
                      </p>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        {item.detail}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">
                        {formatBR(format(selected, 'yyyy-MM-dd'))}
                      </p>
                      {isAdmin && item.kind === 'obrigacao' && item.obrigacao ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingObr(item.obrigacao!)}
                            className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] bg-white/70 px-2 py-1 text-xs font-medium text-[var(--color-forest)] hover:bg-[var(--color-parchment)]"
                          >
                            <Pencil size={12} />
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() =>
                              void handleDeleteObrigacao(
                                item.obrigacao!,
                                item.title,
                              )
                            }
                            className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] bg-white/70 px-2 py-1 text-xs font-medium text-[var(--color-status-vencida-fg)] hover:bg-[var(--color-parchment)] disabled:opacity-60"
                          >
                            <Trash2 size={12} />
                            Excluir
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {editingObr ? (
        <EditarObrigacaoModal
          key={editingObr.id}
          obrigacao={editingObr}
          onClose={() => setEditingObr(null)}
        />
      ) : null}
    </div>
  )
}
