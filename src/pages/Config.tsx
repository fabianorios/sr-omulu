import { useMemo, useState, type FormEvent } from 'react'
import { FlaskConical, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type {
  ObligationType,
  ObligationTypeId,
  ObrigacaoItem,
} from '../types'
import { emptyObrigacaoItem, formatObrigacaoItem } from '../types'
import { calculateNextDate, formatBR } from '../utils/status'

const COLOR_OPTIONS = [
  '#3B6EA5',
  '#1E4D7B',
  '#0F2F4A',
  '#7BA3C4',
  '#C4A35A',
  '#8B9A7D',
  '#6B5B4A',
  '#A65D4E',
]

function emptyDraft(): ObligationType {
  return {
    id: '',
    name: '',
    description: '',
    yearsOffset: null,
    isFestiva: false,
    color: COLOR_OPTIONS[6],
    active: true,
    itensPadrao: [emptyObrigacaoItem()],
  }
}

export function Config() {
  const { state, addTipo, updateTipo, toggleTipo, deleteTipo } = useApp()
  const [editing, setEditing] = useState<ObligationType | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<ObligationType>(() => emptyDraft())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [testTipo, setTestTipo] = useState<ObligationTypeId>('1_ano')
  const [testDate, setTestDate] = useState('2025-11-15')
  const [testResult, setTestResult] = useState<string | null>(null)

  const tiposOrdenados = useMemo(
    () =>
      [...state.tipos].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [state.tipos],
  )

  const ciclicos = useMemo(
    () => tiposOrdenados.filter((t) => t.yearsOffset != null),
    [tiposOrdenados],
  )

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

  function openCreate() {
    setError('')
    setCreating(true)
    setEditing(null)
    setDraft(emptyDraft())
  }

  function openEdit(tipo: ObligationType) {
    setError('')
    setCreating(false)
    setEditing(tipo)
    setDraft({
      ...tipo,
      itensPadrao: tipo.itensPadrao?.length
        ? tipo.itensPadrao.map((i) => ({ ...i }))
        : [emptyObrigacaoItem()],
    })
  }

  function closeForm() {
    setCreating(false)
    setEditing(null)
    setError('')
  }

  function updateDraftItem(index: number, patch: Partial<ObrigacaoItem>) {
    setDraft((prev) => {
      const itensPadrao = [...(prev.itensPadrao ?? [])]
      itensPadrao[index] = { ...itensPadrao[index], ...patch }
      return { ...prev, itensPadrao }
    })
  }

  async function saveForm(e: FormEvent) {
    e.preventDefault()
    setError('')
    const name = draft.name.trim()
    if (!name) {
      setError('Informe o nome do tipo.')
      return
    }
    const itensPadrao = (draft.itensPadrao ?? [])
      .map((i) => ({
        nome: i.nome.trim(),
        quantidade: Number(i.quantidade) > 0 ? Number(i.quantidade) : 1,
      }))
      .filter((i) => i.nome)

    const payload = {
      name,
      description: draft.description.trim(),
      yearsOffset: draft.yearsOffset,
      isFestiva: Boolean(draft.isFestiva),
      color: draft.color,
      itensPadrao,
    }

    setBusyId(creating ? 'new' : draft.id)
    if (creating) {
      const result = await addTipo(payload)
      setBusyId(null)
      if (!result.ok) {
        setError(
          result.error === 'nome_exists'
            ? 'Já existe um tipo com este nome.'
            : (result.error ?? 'Não foi possível criar.'),
        )
        return
      }
      closeForm()
      return
    }

    const result = await updateTipo(draft.id, payload)
    setBusyId(null)
    if (!result.ok) {
      setError(
        result.error === 'nome_exists'
          ? 'Já existe um tipo com este nome.'
          : (result.error ?? 'Não foi possível salvar.'),
      )
      return
    }
    closeForm()
  }

  async function handleToggle(tipo: ObligationType) {
    if (tipo.active) {
      const ok = window.confirm(
        `Desativar "${tipo.name}"?\n\nEle deixa de aparecer ao agendar novas obrigações.`,
      )
      if (!ok) return
    }
    setBusyId(tipo.id)
    const result = await toggleTipo(tipo.id)
    setBusyId(null)
    if (!result.ok) {
      window.alert(result.error ?? 'Não foi possível alterar.')
    }
  }

  async function handleDelete(tipo: ObligationType) {
    const ok = window.confirm(
      `Excluir o tipo "${tipo.name}"?\n\nSó é permitido se não houver obrigações no calendário com este tipo. Esta ação não pode ser desfeita.`,
    )
    if (!ok) return
    setBusyId(tipo.id)
    const result = await deleteTipo(tipo.id)
    setBusyId(null)
    if (!result.ok) {
      window.alert(
        result.error === 'in_use'
          ? 'Há obrigações no calendário com este tipo. Desative-o ou remova as instâncias antes de excluir.'
          : (result.error ?? 'Não foi possível excluir.'),
      )
      return
    }
    if (editing?.id === tipo.id) closeForm()
  }

  const formOpen = creating || editing != null

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="animate-fade-in flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[var(--color-forest)] sm:text-3xl md:text-4xl">
            Tipos de Obrigações
          </h2>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            Cadastro do terreiro: crie, edite e exclua tipos. O calendário agenda
            instâncias a partir deste catálogo (sem obrigações avulsas).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--color-forest)] px-3.5 py-2 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-forest-hover)]"
        >
          <Plus size={16} />
          Novo tipo
        </button>
      </div>

      <ul className="animate-fade-in-delay-1 space-y-3">
        {tiposOrdenados.map((tipo) => (
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
                style={{ backgroundColor: tipo.color }}
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

            <div className="flex shrink-0 flex-wrap gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => openEdit(tipo)}
                className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-forest)] hover:bg-[var(--color-parchment)]"
              >
                Editar
              </button>
              <button
                type="button"
                disabled={busyId === tipo.id}
                onClick={() => void handleToggle(tipo)}
                className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-muted)] hover:bg-[var(--color-parchment)] disabled:opacity-60"
              >
                {tipo.active ? 'Desativar' : 'Ativar'}
              </button>
              <button
                type="button"
                disabled={busyId === tipo.id}
                onClick={() => void handleDelete(tipo)}
                className="inline-flex items-center gap-1 rounded border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-status-vencida-fg)] hover:bg-[var(--color-parchment)] disabled:opacity-60"
              >
                <Trash2 size={12} />
                Excluir
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
          Informe uma última data e um tipo cíclico para ver a próxima data
          calculada.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
            Tipo
            <select
              value={testTipo}
              onChange={(e) => setTestTipo(e.target.value)}
              className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case text-[var(--color-ink)]"
            >
              {(ciclicos.length > 0 ? ciclicos : tiposOrdenados).map((t) => (
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

      {formOpen ? (
        <div
          className="animate-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/40 p-4"
          onClick={closeForm}
          role="presentation"
        >
          <form
            className="animate-modal max-h-[92vh] w-full max-w-md overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void saveForm(e)}
          >
            <h3 className="font-serif text-xl font-semibold text-[var(--color-forest)]">
              {creating ? 'Novo tipo de obrigação' : 'Editar tipo'}
            </h3>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
                Nome
              </span>
              <input
                value={draft.name}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, name: e.target.value }))
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
                value={draft.description}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
                className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
                  Ciclo (anos)
                </span>
                <input
                  type="number"
                  min={1}
                  placeholder="Pontual"
                  value={draft.yearsOffset ?? ''}
                  onChange={(e) => {
                    const v = e.target.value.trim()
                    setDraft((prev) => ({
                      ...prev,
                      yearsOffset: v === '' ? null : Number(v) || null,
                    }))
                  }}
                  className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
                  Cor
                </span>
                <select
                  value={draft.color}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, color: e.target.value }))
                  }
                  className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                >
                  {COLOR_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--color-ink)]">
              <input
                type="checkbox"
                checked={Boolean(draft.isFestiva)}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    isFestiva: e.target.checked,
                  }))
                }
                className="rounded border-[var(--color-border)]"
              />
              Festiva
            </label>
            <div className="mt-4 space-y-2">
              <span className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
                Itens padrão (nome + quantidade)
              </span>
              {(draft.itensPadrao ?? []).map((item, index) => (
                <div
                  key={`padrao-${index}`}
                  className="grid grid-cols-[1fr_5rem_auto] gap-2"
                >
                  <input
                    value={item.nome}
                    onChange={(e) =>
                      updateDraftItem(index, { nome: e.target.value })
                    }
                    placeholder="Item"
                    className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.quantidade}
                    onChange={(e) =>
                      updateDraftItem(index, {
                        quantidade: Number(e.target.value) || 1,
                      })
                    }
                    className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        itensPadrao: (prev.itensPadrao ?? []).filter(
                          (_, i) => i !== index,
                        ),
                      }))
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
                  setDraft((prev) => ({
                    ...prev,
                    itensPadrao: [
                      ...(prev.itensPadrao ?? []),
                      emptyObrigacaoItem(),
                    ],
                  }))
                }
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
                onClick={closeForm}
                className="px-3 py-2 text-sm text-[var(--color-ink-muted)]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busyId != null}
                className="rounded-md bg-[var(--color-forest)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)] disabled:opacity-60"
              >
                {busyId != null ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
