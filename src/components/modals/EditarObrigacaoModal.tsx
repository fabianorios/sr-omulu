import { useState, type FormEvent } from 'react'
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { Obrigacao, ObrigacaoItem } from '../../types'
import { emptyObrigacaoItem, obrigacaoLabel } from '../../types'

type Props = {
  obrigacao: Obrigacao
  onClose: () => void
}

export function EditarObrigacaoModal({ obrigacao, onClose }: Props) {
  const { state, updateObrigacao } = useApp()
  const tipo = state.tipos.find((t) => t.id === obrigacao.tipoId)
  const filho = state.filhos.find((f) => f.id === obrigacao.filhoId)

  const [data, setData] = useState(obrigacao.data)
  const [nome, setNome] = useState(obrigacao.nome ?? '')
  const [observacoes, setObservacoes] = useState(obrigacao.observacoes ?? '')
  const [itens, setItens] = useState<ObrigacaoItem[]>(
    obrigacao.itens?.length
      ? obrigacao.itens.map((i) => ({ ...i }))
      : [emptyObrigacaoItem()],
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateItem(index: number, patch: Partial<ObrigacaoItem>) {
    setItens((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!data) {
      setError('Informe a data.')
      return
    }
    const cleanItens = itens
      .map((i) => ({
        nome: i.nome.trim(),
        quantidade: Number(i.quantidade) > 0 ? Number(i.quantidade) : 1,
        ...(i.observacao?.trim()
          ? { observacao: i.observacao.trim() }
          : {}),
      }))
      .filter((i) => i.nome)

    setSaving(true)
    const result = await updateObrigacao(obrigacao.id, {
      data,
      nome: nome.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
      itens: cleanItens,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.error ?? 'Não foi possível salvar.')
      return
    }
    onClose()
  }

  return (
    <div
      className="animate-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-ink)]/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <form
        className="animate-modal max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-cream)] p-5 shadow-xl sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-serif text-xl font-semibold text-[var(--color-forest)]">
              <Pencil size={18} />
              Editar obrigação
            </h3>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              {filho?.nome ?? 'Filho'} ·{' '}
              {obrigacaoLabel(obrigacao, tipo?.name)}
            </p>
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

        <label className="mt-4 block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
          Data
          <input
            required
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case"
          />
        </label>

        {obrigacao.nome || !tipo ? (
          <label className="mt-3 block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
            Nome (legado)
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case"
            />
          </label>
        ) : null}

        <label className="mt-3 block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
          Observações
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case"
          />
        </label>

        <div className="mt-4 space-y-2">
          <span className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
            Itens
          </span>
          {itens.map((item, index) => (
            <div
              key={`item-${index}`}
              className="grid grid-cols-[1fr_5rem_auto] gap-2"
            >
              <input
                value={item.nome}
                onChange={(e) => updateItem(index, { nome: e.target.value })}
                placeholder="Item"
                className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={1}
                value={item.quantidade}
                onChange={(e) =>
                  updateItem(index, {
                    quantidade: Number(e.target.value) || 1,
                  })
                }
                className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  setItens((prev) => prev.filter((_, i) => i !== index))
                }
                className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-ink-muted)]"
                aria-label="Remover item"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setItens((prev) => [...prev, emptyObrigacaoItem()])}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-forest)]"
          >
            <Plus size={14} />
            Adicionar item
          </button>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-[var(--color-status-vencida-fg)]">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm text-[var(--color-ink-muted)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-forest)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)] disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Salvar
          </button>
        </div>
      </form>
    </div>
  )
}
