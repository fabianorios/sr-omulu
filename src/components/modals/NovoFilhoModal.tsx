import { useState, type FormEvent, type ReactNode } from 'react'
import { UserPlus, X } from 'lucide-react'
import { ORIXAS } from '../../data/mock'
import { useApp } from '../../context/AppContext'
import type { Orixa } from '../../types'

export function NovoFilhoModal({ onClose }: { onClose: () => void }) {
  const { addFilho } = useApp()
  const [nome, setNome] = useState('')
  const [orixa, setOrixa] = useState<Orixa>('Omulu')
  const [iniciacao, setIniciacao] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !iniciacao || !telefone.trim()) return
    addFilho({
      nome: nome.trim(),
      orixa,
      iniciacao,
      telefone: telefone.trim(),
      email: email.trim() || undefined,
    })
    onClose()
  }

  return (
    <div
      className="animate-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="animate-modal w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="novo-filho-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-5 py-4">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-[var(--color-forest)]" />
            <h2
              id="novo-filho-title"
              className="font-serif text-xl font-semibold text-[var(--color-forest)]"
            >
              + Novo Filho
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
          <Field label="Nome completo">
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do médium"
              className="field-input"
            />
          </Field>

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

          <Field label="Data iniciação / fechamento">
            <input
              required
              type="date"
              value={iniciacao}
              onChange={(e) => setIniciacao(e.target.value)}
              className="field-input"
            />
          </Field>

          <Field label="Telefone / WhatsApp">
            <input
              required
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 90000-0000"
              className="field-input"
            />
          </Field>

          <Field label="E-mail (opcional)">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="field-input"
            />
          </Field>

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
              Salvar filho
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
