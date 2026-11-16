import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { AppRole, AuthUser } from '../context/AuthContext'

export function Usuarios() {
  const { state } = useApp()
  const [users, setUsers] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [nome, setNome] = useState('')
  const [identificador, setIdentificador] = useState('')
  const [senha, setSenha] = useState('')
  const [role, setRole] = useState<AppRole>('medium')
  const [filhoId, setFilhoId] = useState(state.filhos[0]?.id ?? '')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/auth/users', { credentials: 'same-origin' })
    const data = (await res.json()) as { users?: AuthUser[]; error?: string }
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? 'Erro ao listar usuários')
      return
    }
    setUsers(data.users ?? [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch('/api/auth/users', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nome,
        identificador,
        senha,
        role,
        filhoId: role === 'medium' ? filhoId : undefined,
      }),
    })
    const data = (await res.json()) as { error?: string }
    setSaving(false)
    if (!res.ok) {
      setError(
        data.error === 'identificador_em_uso'
          ? 'Identificador já em uso.'
          : data.error === 'medium_requires_filho'
            ? 'Médium precisa de um filho vinculado.'
            : data.error ?? 'Não foi possível criar.',
      )
      return
    }
    setNome('')
    setIdentificador('')
    setSenha('')
    await load()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-[var(--color-forest)] sm:text-3xl">
          Usuários e papéis
        </h2>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Administradores têm acesso total. Médiuns veem apenas o próprio
          cadastro, obrigações e cobranças.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)]/80 p-4 shadow-sm"
      >
        <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-[var(--color-forest)]">
          <UserPlus size={18} />
          Novo usuário
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
            Nome
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case"
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
            CPF / e-mail / celular
            <input
              required
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case"
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
            Senha (mín. 8)
            <input
              required
              type="password"
              minLength={8}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case"
            />
          </label>
          <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
            Papel
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AppRole)}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case"
            >
              <option value="medium">Médium</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
        </div>
        {role === 'medium' ? (
          <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
            Filho vinculado
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
        ) : null}
        {error ? (
          <p className="text-sm text-[var(--color-status-vencida-fg)]">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-forest)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)] disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          Criar usuário
        </button>
      </form>

      <ul className="space-y-2">
        {loading ? (
          <li className="text-sm text-[var(--color-ink-muted)]">Carregando…</li>
        ) : (
          users.map((u) => (
            <li
              key={u.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)]/80 px-4 py-3 text-sm"
            >
              <p className="font-semibold text-[var(--color-ink)]">{u.nome}</p>
              <p className="text-[var(--color-ink-muted)]">
                {u.role === 'admin' ? 'Administrador' : 'Médium'}
                {u.email ? ` · ${u.email}` : ''}
                {u.cpf ? ` · CPF ${u.cpf}` : ''}
                {u.celular ? ` · ${u.celular}` : ''}
                {u.filhoId ? ` · filho ${u.filhoId}` : ''}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
