import { useState, type FormEvent } from 'react'
import { Loader2, Lock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/Logo'

export function Login() {
  const { login, bootstrap, needsBootstrap, loading } = useAuth()
  const [nome, setNome] = useState('')
  const [identificador, setIdentificador] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const result = needsBootstrap
      ? await bootstrap({ nome, identificador, senha })
      : await login(identificador, senha)
    setSaving(false)
    if (!result.ok) {
      const map: Record<string, string> = {
        invalid_credentials: 'Identificador ou senha incorretos.',
        nome_identificador_senha_min_8:
          'Nome, identificador e senha (mín. 8) são obrigatórios.',
        bootstrap_closed: 'Já existe administrador. Faça login.',
        identificador_senha_required: 'Preencha identificador e senha.',
      }
      setError(map[result.error ?? ''] ?? 'Não foi possível entrar.')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--color-ink-muted)]">
        Carregando…
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)]/90 p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={96} />
          <h1 className="mt-3 font-serif text-2xl font-semibold text-[var(--color-forest)]">
            {needsBootstrap ? 'Criar administrador' : 'Entrar'}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {needsBootstrap
              ? 'Primeiro acesso: cadastre o administrador da casa (único enquanto não houver usuários).'
              : 'Use CPF, e-mail ou celular e sua senha.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {needsBootstrap ? (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
                Nome
              </span>
              <input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
              CPF, e-mail ou celular
            </span>
            <input
              required
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="email@casa.org · 000.000.000-00 · (11) 90000-0000"
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
              Senha
            </span>
            <input
              required
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              minLength={needsBootstrap ? 8 : 1}
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              autoComplete={needsBootstrap ? 'new-password' : 'current-password'}
            />
          </label>

          {error ? (
            <p className="text-sm text-[var(--color-status-vencida-fg)]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--color-forest)] px-4 py-2.5 text-sm font-semibold text-[var(--color-cream)] disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            {needsBootstrap ? 'Criar administrador' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
