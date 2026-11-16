import { useState, type FormEvent, type ReactNode } from 'react'
import { Loader2, Plus, Trash2, UserPlus, X } from 'lucide-react'
import {
  MAES_DE_CABECA,
  PAIS_DE_CABECA,
  TIPOS_ENTIDADE,
  type MaeDeCabeca,
  type PaiDeCabeca,
  type TipoEntidade,
} from '../../data/catalog'
import { useApp } from '../../context/AppContext'
import { ensureEntidadeRows, sanitizeEntidadesForSave } from '../../lib/entidades'
import { formatCep, lookupCep } from '../../lib/viacep'
import type { Endereco, EntidadeLinha, Filho } from '../../types'
import { emptyEndereco, emptyEntidadeLinha } from '../../types'

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
  const [paiDeCabeca, setPaiDeCabeca] = useState<PaiDeCabeca>(
    initial?.paiDeCabeca ?? 'Omulu',
  )
  const [maeDeCabeca, setMaeDeCabeca] = useState<MaeDeCabeca>(
    initial?.maeDeCabeca ?? 'Oxum',
  )
  const [entidades, setEntidades] = useState<EntidadeLinha[]>(() =>
    ensureEntidadeRows(initial?.entidades ?? []),
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

  function updateEntidade(
    index: number,
    patch: Partial<EntidadeLinha>,
  ) {
    setEntidades((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    )
  }

  function addEntidadeRow() {
    setEntidades((prev) => [...prev, emptyEntidadeLinha()])
  }

  function removeEntidadeRow(index: number) {
    setEntidades((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return next.length > 0 ? next : [emptyEntidadeLinha()]
    })
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
      paiDeCabeca,
      maeDeCabeca,
      entidades: sanitizeEntidadesForSave(entidades),
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
    const result =
      editing && initial
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Pai de cabeça">
                <select
                  required
                  value={paiDeCabeca}
                  onChange={(e) =>
                    setPaiDeCabeca(e.target.value as PaiDeCabeca)
                  }
                  className="field-input"
                >
                  {PAIS_DE_CABECA.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Mãe de cabeça">
                <select
                  required
                  value={maeDeCabeca}
                  onChange={(e) =>
                    setMaeDeCabeca(e.target.value as MaeDeCabeca)
                  }
                  className="field-input"
                >
                  {MAES_DE_CABECA.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Entidades que atuam com o médium">
            <div className="space-y-3">
              {entidades.map((row, index) => (
                <div
                  key={`entidade-${index}`}
                  className="grid gap-2 sm:grid-cols-[1.1fr_1.4fr_auto]"
                >
                  <Field label={index === 0 ? 'Entidade' : undefined}>
                    <select
                      value={row.tipo}
                      onChange={(e) =>
                        updateEntidade(index, {
                          tipo: e.target.value as TipoEntidade,
                        })
                      }
                      className="field-input"
                    >
                      {TIPOS_ENTIDADE.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={index === 0 ? 'Nome' : undefined}>
                    <input
                      value={row.nome}
                      onChange={(e) =>
                        updateEntidade(index, { nome: e.target.value })
                      }
                      placeholder="Nome da entidade"
                      className="field-input"
                    />
                  </Field>
                  <div
                    className={[
                      'flex items-end',
                      index === 0 ? 'pb-0.5' : '',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      onClick={() => removeEntidadeRow(index)}
                      className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:bg-[var(--color-parchment)] hover:text-[var(--color-forest)]"
                      aria-label={`Remover entidade ${index + 1}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addEntidadeRow}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-forest)] px-3 py-2 text-sm font-semibold text-[var(--color-forest)] hover:bg-[var(--color-parchment)]"
              >
                <Plus size={14} />
                Adicionar entidade
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
  label?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
          {label}
        </span>
      ) : null}
      {children}
    </label>
  )
}
