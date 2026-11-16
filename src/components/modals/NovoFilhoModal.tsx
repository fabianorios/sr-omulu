import { useState, type FormEvent, type ReactNode } from 'react'
import { Loader2, Plus, Trash2, UserPlus, X } from 'lucide-react'
import { ORIXAS } from '../../data/mock'
import { useApp } from '../../context/AppContext'
import { formatCep, lookupCep } from '../../lib/viacep'
import type { Endereco, Filho, Orixa } from '../../types'
import { emptyEndereco } from '../../types'

type Props = {
  onClose: () => void
  initial?: Filho | null
}

export function NovoFilhoModal({ onClose, initial = null }: Props) {
  const { addFilho, updateFilho } = useApp()
  const editing = Boolean(initial?.id)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [cepStatus, setCepStatus] = useState('')
  const [cepLoading, setCepLoading] = useState(false)

  const [nome, setNome] = useState(initial?.nome ?? '')
  const [orixa, setOrixa] = useState<Orixa>(initial?.orixa ?? 'Omulu')
  const [paiDeCabeca, setPaiDeCabeca] = useState(initial?.paiDeCabeca ?? '')
  const [maeDeCabeca, setMaeDeCabeca] = useState(initial?.maeDeCabeca ?? '')
  const [guias, setGuias] = useState<string[]>(
    initial?.guias?.length ? initial.guias : [''],
  )
  const [dataNascimento, setDataNascimento] = useState(
    initial?.dataNascimento ?? '',
  )
  const [dataEntrada, setDataEntrada] = useState(initial?.dataEntrada ?? '')
  const [iniciacao, setIniciacao] = useState(initial?.iniciacao ?? '')
  const [telefone1, setTelefone1] = useState(initial?.telefone1 ?? '')
  const [telefone2, setTelefone2] = useState(initial?.telefone2 ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [endereco, setEndereco] = useState<Endereco>(
    initial?.endereco ?? emptyEndereco(),
  )

  function updateGuia(index: number, value: string) {
    setGuias((prev) => prev.map((g, i) => (i === index ? value : g)))
  }

  function addGuia() {
    setGuias((prev) => [...prev, ''])
  }

  function removeGuia(index: number) {
    setGuias((prev) =>
      prev.length <= 1 ? [''] : prev.filter((_, i) => i !== index),
    )
  }

  async function handleCepLookup() {
    const digits = endereco.cep.replace(/\D/g, '')
    if (digits.length !== 8) {
      setCepStatus('CEP deve ter 8 dígitos.')
      return
    }
    setCepLoading(true)
    setCepStatus('')
    const result = await lookupCep(digits)
    setCepLoading(false)
    if (result.ok === false) {
      setCepStatus(result.error)
      return
    }
    setEndereco((prev) => ({
      ...prev,
      ...result.partial,
      numero: prev.numero,
      complemento: prev.complemento,
    }))
    setCepStatus('Endereço preenchido pelo CEP.')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!nome.trim() || !telefone1.trim()) {
      setError('Nome e telefone 1 são obrigatórios.')
      return
    }
    const payload = {
      nome: nome.trim(),
      orixa,
      paiDeCabeca: paiDeCabeca.trim() || orixa,
      maeDeCabeca: maeDeCabeca.trim(),
      guias: guias.map((g) => g.trim()).filter(Boolean),
      dataNascimento,
      dataEntrada,
      iniciacao,
      telefone1: telefone1.trim(),
      telefone2: telefone2.trim(),
      email: email.trim() || undefined,
      endereco: {
        ...endereco,
        cep: formatCep(endereco.cep),
        uf: endereco.uf.toUpperCase().slice(0, 2),
      },
    }
    setSaving(true)
    const result = editing && initial
      ? await updateFilho(initial.id, payload)
      : await addFilho(payload)
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
        className="animate-modal max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-cream)] shadow-xl sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="filho-form-title"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border-soft)] bg-[var(--color-cream)] px-5 py-4">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-[var(--color-forest)]" />
            <h2
              id="filho-form-title"
              className="font-serif text-xl font-semibold text-[var(--color-forest)]"
            >
              {editing ? 'Editar Filho' : '+ Novo Filho'}
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

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
          <Section title="Identificação">
            <Field label="Nome completo">
              <input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do médium"
                className="field-input"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Orixá de cabeça">
                <select
                  value={orixa}
                  onChange={(e) => setOrixa(e.target.value as Orixa)}
                  className="field-input"
                >
                  {ORIXAS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Pai de cabeça">
                <input
                  value={paiDeCabeca}
                  onChange={(e) => setPaiDeCabeca(e.target.value)}
                  placeholder="Ex.: Omulu"
                  list="orixas-list"
                  className="field-input"
                />
              </Field>
              <Field label="Mãe de cabeça">
                <input
                  value={maeDeCabeca}
                  onChange={(e) => setMaeDeCabeca(e.target.value)}
                  placeholder="Ex.: Nanã"
                  list="orixas-list"
                  className="field-input"
                />
              </Field>
            </div>
            <datalist id="orixas-list">
              {ORIXAS.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </Section>

          <Section title="Guias que atuam com o médium">
            <div className="space-y-2">
              {guias.map((guia, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    value={guia}
                    onChange={(e) => updateGuia(index, e.target.value)}
                    placeholder={`Nome da guia ${index + 1}`}
                    className="field-input"
                  />
                  <button
                    type="button"
                    onClick={() => removeGuia(index)}
                    className="rounded-md border border-[var(--color-border)] px-2 text-[var(--color-ink-muted)] hover:bg-[var(--color-parchment)]"
                    aria-label="Remover guia"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addGuia}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-forest)] hover:underline"
              >
                <Plus size={14} />
                Adicionar guia
              </button>
            </div>
          </Section>

          <Section title="Datas">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Data de nascimento">
                <input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="field-input"
                />
              </Field>
              <Field label="Entrada no terreiro">
                <input
                  type="date"
                  value={dataEntrada}
                  onChange={(e) => setDataEntrada(e.target.value)}
                  className="field-input"
                />
              </Field>
              <Field label="Iniciação / fechamento">
                <input
                  type="date"
                  value={iniciacao}
                  onChange={(e) => setIniciacao(e.target.value)}
                  className="field-input"
                />
              </Field>
            </div>
          </Section>

          <Section title="Contato">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Telefone 1 / WhatsApp">
                <input
                  required
                  value={telefone1}
                  onChange={(e) => setTelefone1(e.target.value)}
                  placeholder="(11) 90000-0000"
                  className="field-input"
                />
              </Field>
              <Field label="Telefone 2 (opcional)">
                <input
                  value={telefone2}
                  onChange={(e) => setTelefone2(e.target.value)}
                  placeholder="(11) 90000-0000"
                  className="field-input"
                />
              </Field>
            </div>
            <Field label="E-mail (opcional)">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="field-input"
              />
            </Field>
          </Section>

          <Section title="Endereço residencial">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Field label="CEP">
                <input
                  value={endereco.cep}
                  onChange={(e) =>
                    setEndereco((prev) => ({
                      ...prev,
                      cep: formatCep(e.target.value),
                    }))
                  }
                  onBlur={handleCepLookup}
                  placeholder="00000-000"
                  inputMode="numeric"
                  className="field-input"
                />
              </Field>
              <div className="flex items-end pb-0.5">
                <button
                  type="button"
                  onClick={handleCepLookup}
                  disabled={cepLoading}
                  className="inline-flex h-[38px] items-center gap-1.5 rounded-md border border-[var(--color-forest)] px-3 text-sm font-semibold text-[var(--color-forest)] hover:bg-[var(--color-parchment)] disabled:opacity-60"
                >
                  {cepLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : null}
                  Buscar CEP
                </button>
              </div>
            </div>
            {cepStatus ? (
              <p className="text-xs text-[var(--color-ink-muted)]">{cepStatus}</p>
            ) : null}
            <Field label="Logradouro">
              <input
                value={endereco.logradouro}
                onChange={(e) =>
                  setEndereco((prev) => ({
                    ...prev,
                    logradouro: e.target.value,
                  }))
                }
                className="field-input"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr]">
              <Field label="Número">
                <input
                  value={endereco.numero}
                  onChange={(e) =>
                    setEndereco((prev) => ({ ...prev, numero: e.target.value }))
                  }
                  className="field-input"
                />
              </Field>
              <Field label="Complemento">
                <input
                  value={endereco.complemento}
                  onChange={(e) =>
                    setEndereco((prev) => ({
                      ...prev,
                      complemento: e.target.value,
                    }))
                  }
                  className="field-input"
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1.4fr_1.4fr_0.6fr]">
              <Field label="Bairro">
                <input
                  value={endereco.bairro}
                  onChange={(e) =>
                    setEndereco((prev) => ({ ...prev, bairro: e.target.value }))
                  }
                  className="field-input"
                />
              </Field>
              <Field label="Cidade">
                <input
                  value={endereco.cidade}
                  onChange={(e) =>
                    setEndereco((prev) => ({ ...prev, cidade: e.target.value }))
                  }
                  className="field-input"
                />
              </Field>
              <Field label="UF">
                <input
                  value={endereco.uf}
                  onChange={(e) =>
                    setEndereco((prev) => ({
                      ...prev,
                      uf: e.target.value.toUpperCase().slice(0, 2),
                    }))
                  }
                  maxLength={2}
                  className="field-input"
                />
              </Field>
            </div>
          </Section>

          {error ? (
            <p className="text-sm text-[var(--color-status-vencida-fg)]">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border-soft)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--color-forest)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-forest-hover)] disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {editing ? 'Salvar alterações' : 'Salvar filho'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .field-input {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid var(--color-border);
          background: white;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--color-ink);
          outline: none;
        }
        .field-input:focus {
          border-color: var(--color-forest);
          box-shadow: 0 0 0 2px rgba(27, 58, 42, 0.15);
        }
      `}</style>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold tracking-[0.14em] text-[var(--color-tan)] uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
        {label}
      </span>
      {children}
    </label>
  )
}
