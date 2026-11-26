import { useMemo, useState, type FormEvent } from 'react'
import { Loader2, Pencil, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  referenciaFromDate,
  vencimentoFromDiaMes,
} from '../../lib/finance'
import type { Cobranca } from '../../types'

type Props = {
  cobranca: Cobranca
  onClose: () => void
}

export function EditarCobrancaModal({ cobranca, onClose }: Props) {
  const { state, updateCobranca } = useApp()
  const tipos = state.cobrancaTipos.filter((t) => t.ativo)
  const filho = state.filhos.find((f) => f.id === cobranca.filhoId)

  const [filhoId, setFilhoId] = useState(cobranca.filhoId)
  const [tipoId, setTipoId] = useState(
    cobranca.tipoId ??
      tipos.find((t) => t.nome === cobranca.tipoNome)?.id ??
      tipos[0]?.id ??
      '',
  )
  const [valor, setValor] = useState(String(cobranca.valor))
  const [diaVencimento, setDiaVencimento] = useState(
    String(cobranca.diaVencimento ?? 10),
  )
  const [vencimentoManual, setVencimentoManual] = useState(cobranca.vencimento)
  const [descricao, setDescricao] = useState(cobranca.descricao ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const tipo = useMemo(
    () =>
      tipos.find((t) => t.id === tipoId) ??
      state.cobrancaTipos.find((t) => t.id === tipoId) ??
      state.cobrancaTipos.find((t) => t.nome === cobranca.tipoNome),
    [tipos, tipoId, state.cobrancaTipos, cobranca.tipoNome],
  )
  const isMensalidade = tipo?.categoria === 'mensalidade'

  const vencimentoCalculado = useMemo(() => {
    if (!isMensalidade) return vencimentoManual
    const dia = Number(diaVencimento)
    if (!Number.isFinite(dia)) return vencimentoManual
    // Keep existing date month/year when editing; only rebuild if blank
    if (vencimentoManual) return vencimentoManual
    return vencimentoFromDiaMes(dia)
  }, [isMensalidade, diaVencimento, vencimentoManual])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!filhoId || !tipo) {
      setError('Selecione o filho e o tipo de cobrança.')
      return
    }
    const valorNum = Number(String(valor).replace(',', '.'))
    if (!Number.isFinite(valorNum) || valorNum < 0) {
      setError('Informe um valor válido.')
      return
    }
    const vencimento = isMensalidade ? vencimentoManual || vencimentoCalculado : vencimentoManual
    if (!vencimento) {
      setError(
        isMensalidade
          ? 'Informe a data de vencimento.'
          : 'Informe a data de vencimento.',
      )
      return
    }

    setSaving(true)
    const result = await updateCobranca(cobranca.id, {
      filhoId,
      tipoId: tipo.id,
      tipoNome: tipo.nome,
      categoria: tipo.categoria,
      valor: valorNum,
      vencimento,
      diaVencimento: isMensalidade
        ? Number(diaVencimento) || cobranca.diaVencimento
        : undefined,
      referencia: isMensalidade ? referenciaFromDate(vencimento) : undefined,
      descricao: descricao.trim() || undefined,
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
              Editar cobrança
            </h3>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              {filho?.nome ?? 'Filho'} · {cobranca.tipoNome}
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
          Filho
          <select
            required
            value={filhoId}
            onChange={(e) => setFilhoId(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case"
          >
            {state.filhos.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
          Tipo
          <select
            required
            value={tipoId}
            onChange={(e) => setTipoId(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case"
          >
            {state.cobrancaTipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
                {!t.ativo ? ' (inativo)' : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
          Valor (R$)
          <input
            required
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case"
          />
        </label>

        {isMensalidade ? (
          <label className="mt-3 block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
            Dia do vencimento (1–28)
            <input
              type="number"
              min={1}
              max={28}
              value={diaVencimento}
              onChange={(e) => setDiaVencimento(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case"
            />
          </label>
        ) : null}

        <label className="mt-3 block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
          Vencimento
          <input
            required
            type="date"
            value={vencimentoManual}
            onChange={(e) => setVencimentoManual(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case"
          />
        </label>

        <label className="mt-3 block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
          Descrição
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case"
          />
        </label>

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
