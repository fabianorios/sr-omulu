import { useState, type FormEvent } from 'react'
import { FlaskConical, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type {
  ObligationType,
  ObligationTypeId,
  ObrigacaoItem,
} from '../types'
import { emptyObrigacaoItem, formatObrigacaoItem } from '../types'
import { calculateNextDate, formatBR } from '../utils/status'

export function Config() {
  const { state, toggleTipo, updateTipo } = useApp()
  const [editing, setEditing] = useState<ObligationType | null>(null)
  const [testTipo, setTestTipo] = useState<ObligationTypeId>('1_ano')
  const [testDate, setTestDate] = useState('2025-11-15')
  const [testResult, setTestResult] = useState<string | null>(null)

  function handleTest() {
    const tipo = state.tipos.find((t) => t.id === testTipo)
    if (!tipo) return
    const next = calculateNextDate(testDate, tipo)
    if (!next) {
      setTestResult(
        `${tipo.name}: pontual — sem intervalo automático a partir de ${formatBR(testDate)}.`,
      )
      return
    }
    const festiva = tipo.isFestiva ? ' (Festiva)' : ''
    setTestResult(
      `${tipo.name}: ${formatBR(testDate)} → ${formatBR(next)} (+${tipo.yearsOffset} ano(s)${festiva})`,
    )
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    const itensPadrao = (editing.itensPadrao ?? [])
      .map((i) => ({
        nome: i.nome.trim(),
        quantidade: Number(i.quantidade) > 0 ? Number(i.quantidade) : 1,
      }))
      .filter((i) => i.nome)
    updateTipo(editing.id, {
      name: editing.name,
      description: editing.description,
      itensPadrao,
    })
    setEditing(null)
  }

  function updateEditingItem(index: number, patch: Partial<ObrigacaoItem>) {
    if (!editing) return
    const itensPadrao = [...(editing.itensPadrao ?? [])]
    itensPadrao[index] = { ...itensPadrao[index], ...patch }
    setEditing({ ...editing, itensPadrao })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="animate-fade-in">
        <h2 className="font-serif text-2xl font-semibold text-[var(--color-forest)] sm:text-3xl md:text-4xl">
          Tipos de Obrigações
        </h2>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Ciclos espirituais (1, 3, 7 anos, festivas) com cálculo automático.
          Obrigações manuais (sem cálculo) são criadas em Agenda → Nova
          obrigação.
        </p>
      </div>

      <ul className="animate-fade-in-delay-1 space-y-3">
        {state.tipos.map((tipo) => (
          <li
            key={tipo.id}
            className={[
              'flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)]/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between',
              !tipo.active ? 'opacity-55' : '',
            ].join(' ')}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span
                className="mt-1 h-4 w-4 shrink-0 rounded-[3px]"
                style={{
                  backgroundColor:
                    tipo.id === 'feitura' || tipo.id === 'troca_guia'
                      ? 'var(--color-gold)'
                      : tipo.id === 'festiva'
                        ? '#6B5344'
                        : 'var(--color-forest)',
                }}
              />
              <div className="min-w-0">
                <p className="font-semibold text-[var(--color-ink)]">
                  {tipo.name}
                  {!tipo.active && (
                    <span className="ml-2 text-xs font-normal text-[var(--color-ink-faint)]">
                      (inativo)
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                  {tipo.description}
                </p>
                <p className="mt-1.5 text-xs text-[var(--color-ink-faint)]">
                  {tipo.yearsOffset == null
                    ? 'Pontual — sem intervalo automático.'
                    : `Auto-cálculo: +${tipo.yearsOffset} ano(s) a partir da última data${tipo.isFestiva ? ' — Festiva' : ''}.`}
                </p>
                {tipo.itensPadrao && tipo.itensPadrao.length > 0 ? (
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                    Itens padrão:{' '}
                    {tipo.itensPadrao.map(formatObrigacaoItem).join(', ')}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setEditing({ ...tipo })}
                className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-forest)] hover:bg-[var(--color-parchment)]"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (tipo.active) {
                    const ok = window.confirm(
                      `Desativar "${tipo.name}"?\n\nEle deixa de aparecer ao agendar novas obrigações.`,
                    )
                    if (!ok) return
                  }
                  toggleTipo(tipo.id)
                }}
                className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-muted)] hover:bg-[var(--color-parchment)]"
              >
                {tipo.active ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <section className="animate-fade-in-delay-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)]/80 p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <FlaskConical size={18} className="text-[var(--color-gold)]" />
          <h3 className="font-serif text-xl font-semibold text-[var(--color-forest)]">
            Testar regra de auto-cálculo
          </h3>
        </div>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Informe uma última data e um tipo para ver a próxima data calculada.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
            Tipo
            <select
              value={testTipo}
              onChange={(e) =>
                setTestTipo(e.target.value as ObligationTypeId)
              }
              className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case text-[var(--color-ink)]"
            >
              {state.tipos
                .filter((t) => t.id !== 'manual')
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
            Última data
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case text-[var(--color-ink)]"
            />
          </label>
          <button
            type="button"
            onClick={handleTest}
            className="rounded-md bg-[var(--color-forest)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-forest-hover)]"
          >
            Calcular
          </button>
        </div>

        {testResult && (
          <p className="mt-4 rounded-md border border-[var(--color-border-soft)] bg-[var(--color-parchment)]/50 px-3 py-2 text-sm text-[var(--color-ink)]">
            {testResult}
          </p>
        )}
      </section>

      {editing && (
        <div
          className="animate-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/40 p-4"
          onClick={() => setEditing(null)}
          role="presentation"
        >
          <form
            className="animate-modal w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveEdit}
          >
            <h3 className="font-serif text-xl font-semibold text-[var(--color-forest)]">
              Editar tipo
            </h3>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
                Nome
              </span>
              <input
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
                className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
                Descrição
              </span>
              <textarea
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
                rows={3}
                className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                required
              />
            </label>
            <div className="mt-4 space-y-2">
              <span className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
                Itens padrão (nome + quantidade)
              </span>
              {(editing.itensPadrao ?? []).map((item, index) => (
                <div
                  key={`padrao-${index}`}
                  className="grid grid-cols-[1fr_5rem_auto] gap-2"
                >
                  <input
                    value={item.nome}
                    onChange={(e) =>
                      updateEditingItem(index, { nome: e.target.value })
                    }
                    placeholder="Item"
                    className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.quantidade}
                    onChange={(e) =>
                      updateEditingItem(index, {
                        quantidade: Number(e.target.value) || 1,
                      })
                    }
                    className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        itensPadrao: (editing.itensPadrao ?? []).filter(
                          (_, i) => i !== index,
                        ),
                      })
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
                onClick={() =>
                  setEditing({
                    ...editing,
                    itensPadrao: [
                      ...(editing.itensPadrao ?? []),
                      emptyObrigacaoItem(),
                    ],
                  })
                }
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-forest)]"
              >
                <Plus size={14} />
                Adicionar item
              </button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-3 py-2 text-sm text-[var(--color-ink-muted)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-md bg-[var(--color-forest)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)]"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
