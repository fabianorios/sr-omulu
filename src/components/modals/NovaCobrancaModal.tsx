import { useMemo, useState, type FormEvent } from 'react'
import { Loader2, Plus, Wallet, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import {
  referenciaFromDate,
  vencimentoFromDiaMes,
} from '../../lib/finance'
import type { CobrancaCategoria } from '../../types'

export function NovaCobrancaModal({ onClose }: { onClose: () => void }) {
  const { state, addCobranca, addCobrancaTipo } = useApp()
  const tipos = state.cobrancaTipos.filter((t) => t.ativo)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [filhoId, setFilhoId] = useState(state.filhos[0]?.id ?? '')
  const [tipoId, setTipoId] = useState(tipos[0]?.id ?? '')
  const [valor, setValor] = useState('80')
  const [diaVencimento, setDiaVencimento] = useState('10')
  const [vencimentoManual, setVencimentoManual] = useState('')
  const [descricao, setDescricao] = useState('')
  const [novoTipoNome, setNovoTipoNome] = useState('')
  const [novoTipoCat, setNovoTipoCat] =
    useState<CobrancaCategoria>('contribuicao')
  const [showNovoTipo, setShowNovoTipo] = useState(false)

  const tipo = useMemo(
    () => tipos.find((t) => t.id === tipoId) ?? tipos[0],
    [tipos, tipoId],
  )
  const isMensalidade = tipo?.categoria === 'mensalidade'

  const vencimentoCalculado = useMemo(() => {
    if (!isMensalidade) return vencimentoManual
    const dia = Number(diaVencimento)
    if (!Number.isFinite(dia)) return ''
    return vencimentoFromDiaMes(dia)
  }, [isMensalidade, diaVencimento, vencimentoManual])

  async function handleAddTipo() {
    const nome = novoTipoNome.trim()
    if (!nome) return
    const result = await addCobrancaTipo({
      nome,
      categoria: novoTipoCat,
    })
    if (result.ok && result.tipo) {
      setTipoId(result.tipo.id)
      setNovoTipoNome('')
      setShowNovoTipo(false)
    }
  }

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
    const vencimento = isMensalidade
      ? vencimentoCalculado
      : vencimentoManual
    if (!vencimento) {
      setError(
        isMensalidade
          ? 'Informe o dia do vencimento (1–28).'
          : 'Informe a data de vencimento.',
      )
      return
    }

    setSaving(true)
    const result = await addCobranca({
      filhoId,
      tipoId: tipo.id,
      tipoNome: tipo.nome,
      categoria: tipo.categoria,
      valor: valorNum,
      vencimento,
      diaVencimento: isMensalidade ? Number(diaVencimento) : undefined,
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
      <div
        className="animate-modal max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-cream)] shadow-xl sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="cobranca-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-[var(--color-forest)]" />
            <h2
              id="cobranca-title"
              className="font-serif text-xl font-semibold text-[var(--color-forest)]"
            >
              + Nova cobrança
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
              className="field"
            >
              {state.filhos.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
                Tipo de cobrança
              </span>
              <button
                type="button"
                onClick={() => setShowNovoTipo((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-forest)]"
              >
                <Plus size={12} />
                Novo tipo
              </button>
            </div>
            <select
              required
              value={tipo?.id ?? ''}
              onChange={(e) => setTipoId(e.target.value)}
              className="field"
            >
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
            {showNovoTipo ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-[1.4fr_1fr_auto]">
                <input
                  value={novoTipoNome}
                  onChange={(e) => setNovoTipoNome(e.target.value)}
                  placeholder="Nome do tipo"
                  className="field"
                />
                <select
                  value={novoTipoCat}
                  onChange={(e) =>
                    setNovoTipoCat(e.target.value as CobrancaCategoria)
                  }
                  className="field"
                >
                  <option value="mensalidade">Mensalidade</option>
                  <option value="contribuicao">Contribuição</option>
                  <option value="outro">Outro</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddTipo}
                  className="rounded-md border border-[var(--color-forest)] px-3 py-2 text-sm font-semibold text-[var(--color-forest)]"
                >
                  Incluir
                </button>
              </div>
            ) : null}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
              Valor (R$)
            </span>
            <input
              required
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              inputMode="decimal"
              className="field"
            />
          </label>

          {isMensalidade ? (
            <div className="space-y-2 rounded-md border border-[var(--color-border-soft)] bg-[var(--color-parchment)]/40 p-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
                  Dia do vencimento (todo mês)
                </span>
                <input
                  required
                  type="number"
                  min={1}
                  max={28}
                  value={diaVencimento}
                  onChange={(e) => setDiaVencimento(e.target.value)}
                  className="field"
                />
              </label>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Próximo vencimento deste ciclo:{' '}
                <strong className="text-[var(--color-ink)]">
                  {vencimentoCalculado || '—'}
                </strong>
                . Use dia 1–28 para evitar meses curtos.
              </p>
            </div>
          ) : (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
                Data de vencimento
              </span>
              <input
                required
                type="date"
                value={vencimentoManual}
                onChange={(e) => setVencimentoManual(e.target.value)}
                className="field"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
              Descrição (opcional)
            </span>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Festa de Nanã"
              className="field"
            />
          </label>

          {error ? (
            <p className="text-sm text-[var(--color-status-vencida-fg)]">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--color-forest)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)] disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Salvar cobrança
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .field {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid var(--color-border);
          background: white;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--color-ink);
          outline: none;
        }
        .field:focus {
          border-color: var(--color-forest);
          box-shadow: 0 0 0 2px rgba(27, 58, 42, 0.15);
        }
      `}</style>
    </div>
  )
}
