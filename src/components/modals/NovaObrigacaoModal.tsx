import { useMemo, useState, type FormEvent } from 'react'
import { CalendarPlus, Plus, Trash2, Users, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { ObrigacaoItem } from '../../types'
import { emptyObrigacaoItem } from '../../types'

export function NovaObrigacaoModal({ onClose }: { onClose: () => void }) {
  const { state, replicateObrigacao } = useApp()

  const [nome, setNome] = useState('')
  const [data, setData] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [itens, setItens] = useState<ObrigacaoItem[]>([emptyObrigacaoItem()])
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const filhosOrdenados = useMemo(
    () => [...state.filhos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [state.filhos],
  )

  function updateItem(index: number, patch: Partial<ObrigacaoItem>) {
    setItens((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    )
  }

  function toggleFilho(id: string) {
    setSelectAll(false)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelectAll(checked: boolean) {
    setSelectAll(checked)
    if (checked) {
      setSelected(new Set(filhosOrdenados.map((f) => f.id)))
    } else {
      setSelected(new Set())
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    const nomeTrim = nome.trim()
    if (!nomeTrim || !data) {
      setError('Informe o nome e a data da obrigação.')
      return
    }
    const filhoIds = selectAll
      ? filhosOrdenados.map((f) => f.id)
      : [...selected]
    if (filhoIds.length === 0) {
      setError('Selecione ao menos um filho para replicar.')
      return
    }

    const cleanItens = itens
      .map((i) => {
        const observacao = i.observacao?.trim()
        return {
          nome: i.nome.trim(),
          quantidade: Number(i.quantidade) > 0 ? Number(i.quantidade) : 1,
          ...(observacao ? { observacao } : {}),
        }
      })
      .filter((i) => i.nome)

    setSaving(true)
    const result = await replicateObrigacao({
      nome: nomeTrim,
      data,
      observacoes: observacoes.trim() || undefined,
      itens: cleanItens,
      filhoIds,
    })
    setSaving(false)

    if (!result.ok) {
      setError(
        result.error === 'missing_fields'
          ? 'Preencha nome, data e filhos.'
          : (result.error ?? 'Não foi possível replicar.'),
      )
      return
    }

    if (result.created === 0 && result.skipped > 0) {
      setInfo(
        `Nenhuma nova obrigação criada: ${result.skipped} filho(s) já tinham esta obrigação (mesmo nome e data).`,
      )
      return
    }

    if (result.skipped > 0) {
      setInfo(
        `Criadas ${result.created}. Ignorados ${result.skipped} (já existiam com o mesmo nome e data).`,
      )
      // still close after short success with skips — keep open so user sees message
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
      <div
        className="animate-modal max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-cream)] shadow-xl sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="nova-obrigacao-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarPlus size={18} className="text-[var(--color-forest)]" />
            <h2
              id="nova-obrigacao-title"
              className="font-serif text-xl font-semibold text-[var(--color-forest)]"
            >
              Nova obrigação
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
          <p className="text-sm text-[var(--color-ink-muted)]">
            Criação manual: informe nome, data e itens. Sem cálculo automático
            de ciclo. Em seguida, replique aos filhos selecionados.
          </p>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
              Nome da obrigação
            </span>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Obrigação de Oxalá 2026"
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)] focus:ring-2 focus:ring-[var(--color-forest)]/20"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
              Data
            </span>
            <input
              required
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)] focus:ring-2 focus:ring-[var(--color-forest)]/20"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
              Observações
            </span>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              placeholder="Opcional"
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)] focus:ring-2 focus:ring-[var(--color-forest)]/20"
            />
          </label>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-[0.14em] text-[var(--color-tan)] uppercase">
              Itens da obrigação
            </h3>
            {itens.map((item, index) => (
              <div key={`item-${index}`} className="space-y-1.5">
                <div className="grid grid-cols-[1fr_5.5rem_auto] gap-2">
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
                    aria-label={`Quantidade do item ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setItens((prev) => {
                        const next = prev.filter((_, i) => i !== index)
                        return next.length ? next : [emptyObrigacaoItem()]
                      })
                    }
                    className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:bg-[var(--color-parchment)]"
                    aria-label={`Remover item ${index + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <input
                  value={item.observacao ?? ''}
                  onChange={(e) =>
                    updateItem(index, { observacao: e.target.value })
                  }
                  placeholder="Observação do item (opcional)"
                  className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItens((prev) => [...prev, emptyObrigacaoItem()])}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-forest)]"
            >
              <Plus size={14} />
              Adicionar item
            </button>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.14em] text-[var(--color-tan)] uppercase">
                <Users size={14} />
                Replicar aos filhos
              </h3>
              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-muted)]">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-[var(--color-border)]"
                />
                Todos
              </label>
            </div>
            {filhosOrdenados.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)]">
                Nenhum filho cadastrado.
              </p>
            ) : (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-[var(--color-border-soft)] bg-white/60 p-2">
                {filhosOrdenados.map((f) => (
                  <li key={f.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--color-parchment)]/70">
                      <input
                        type="checkbox"
                        checked={selected.has(f.id)}
                        onChange={() => toggleFilho(f.id)}
                        className="rounded border-[var(--color-border)]"
                      />
                      <span className="min-w-0 truncate">{f.nome}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-[var(--color-ink-faint)]">
              Se o filho já tiver obrigação com o mesmo nome e data, será
              ignorado (sem duplicar).
            </p>
          </section>

          {error ? (
            <p className="text-sm text-[var(--color-status-vencida-fg)]">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="text-sm text-[var(--color-forest)]">{info}</p>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              {info ? 'Fechar' : 'Cancelar'}
            </button>
            <button
              type="submit"
              disabled={saving || filhosOrdenados.length === 0}
              className="rounded-md bg-[var(--color-forest)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-forest-hover)] disabled:opacity-60"
            >
              {saving ? 'Replicando…' : 'Replicar aos filhos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
