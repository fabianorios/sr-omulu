import { useMemo, useState, type FormEvent } from 'react'
import { CalendarPlus, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { ObligationTypeId } from '../../types'
import { calculateNextDate, formatBR } from '../../utils/status'

export function AgendarObrigacaoModal({ onClose }: { onClose: () => void }) {
  const { state, addObrigacao } = useApp()
  const activeTipos = state.tipos.filter((t) => t.active)

  const [filhoId, setFilhoId] = useState(state.filhos[0]?.id ?? '')
  const [tipoId, setTipoId] = useState<ObligationTypeId>(
    activeTipos[0]?.id ?? '1_ano',
  )
  const [ultimaData, setUltimaData] = useState('')
  const [proximaData, setProximaData] = useState('')
  const [calcMsg, setCalcMsg] = useState('')

  const tipo = useMemo(
    () => state.tipos.find((t) => t.id === tipoId),
    [state.tipos, tipoId],
  )

  function handleCalcular() {
    if (!tipo || !ultimaData) {
      setCalcMsg('Informe a última data para calcular.')
      return
    }
    const next = calculateNextDate(ultimaData, tipo)
    if (!next) {
      setCalcMsg(
        'Este tipo é pontual — sem intervalo automático. Escolha a data manualmente.',
      )
      setProximaData('')
      return
    }
    setProximaData(next)
    setCalcMsg(`Próxima data calculada: ${formatBR(next)}`)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const data = proximaData || ultimaData
    if (!filhoId || !tipoId || !data) return
    addObrigacao({
      filhoId,
      tipoId,
      data,
      ultimaData: ultimaData || undefined,
    })
    onClose()
  }

  return (
    <div
      className="animate-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-ink)]/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="animate-modal max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-cream)] shadow-xl sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="agendar-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarPlus size={18} className="text-[var(--color-forest)]" />
            <h2
              id="agendar-title"
              className="font-serif text-xl font-semibold text-[var(--color-forest)]"
            >
              + Agendar Obrigação
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--color-ink-muted)] hover:bg-[var(--color-parchment)]"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
              Filho
            </span>
            <select
              required
              value={filhoId}
              onChange={(e) => setFilhoId(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)] focus:ring-2 focus:ring-[var(--color-forest)]/20"
            >
              {state.filhos.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
              Tipo de obrigação
            </span>
            <select
              required
              value={tipoId}
              onChange={(e) => setTipoId(e.target.value as ObligationTypeId)}
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)] focus:ring-2 focus:ring-[var(--color-forest)]/20"
            >
              {activeTipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
              Última data
            </span>
            <input
              type="date"
              value={ultimaData}
              onChange={(e) => {
                setUltimaData(e.target.value)
                setCalcMsg('')
              }}
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)] focus:ring-2 focus:ring-[var(--color-forest)]/20"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCalcular}
              className="rounded-md border border-[var(--color-forest)] px-3 py-2 text-sm font-medium text-[var(--color-forest)] hover:bg-[var(--color-parchment)]"
            >
              Calcular próxima
            </button>
            {proximaData && (
              <span className="text-sm text-[var(--color-ink-muted)]">
                Agendar em: <strong className="text-[var(--color-ink)]">{formatBR(proximaData)}</strong>
              </span>
            )}
          </div>

          {calcMsg && (
            <p className="text-xs text-[var(--color-ink-muted)]">{calcMsg}</p>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
              Data a agendar
            </span>
            <input
              required
              type="date"
              value={proximaData}
              onChange={(e) => setProximaData(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)] focus:ring-2 focus:ring-[var(--color-forest)]/20"
            />
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-[var(--color-forest)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-forest-hover)]"
            >
              Agendar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
