import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Loader2, Pencil, UserPlus, UserX } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth, type AppRole, type AuthUser } from '../context/AuthContext'
import {
  sbCreateAppUser,
  sbDeactivateAppUser,
  sbListUsuarios,
  sbUpdateAppUser,
} from '../lib/supabaseUsers'

const errorMap: Record<string, string> = {
  identificador_em_uso: 'Identificador já em uso.',
  medium_requires_filho: 'Médium precisa de um filho vinculado.',
  nome_identificador_senha_min_8:
    'Nome, identificador e senha (mín. 8) são obrigatórios.',
  nome_email_senha_min_8:
    'Nome, e-mail e senha temporária (mín. 8) são obrigatórios.',
  email_required_pages: 'Informe um e-mail válido.',
  admin_required: 'Somente administradores podem gerenciar usuários.',
  unauthorized: 'Sessão expirada. Faça login novamente.',
  user_already_exists: 'Já existe um usuário com este e-mail.',
  auth_user_not_found:
    'Conta Auth não encontrada para este e-mail. Confirme o e-mail no Supabase ou desative “Confirm email”.',
  email_mismatch: 'E-mail não corresponde à conta Auth informada.',
  signup_failed: 'Não foi possível criar a conta no Supabase Auth.',
  email_confirm_required:
    'Confirme o e-mail no link do Supabase, ou desative “Confirm email” em Authentication → Providers.',
  create_failed: 'Não foi possível criar o usuário.',
  update_failed: 'Não foi possível atualizar o usuário.',
  supabase_unconfigured: 'Supabase do browser não configurado.',
  invalid_role: 'Papel inválido.',
  cpf_em_uso: 'CPF já em uso por outro usuário.',
  celular_em_uso: 'Celular já em uso por outro usuário.',
  last_admin: 'Não é possível desativar ou rebaixar o último administrador ativo.',
  not_found: 'Usuário não encontrado.',
}

const inputClass =
  'mt-1 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-normal normal-case'

type EditDraft = {
  id: string
  nome: string
  role: AppRole
  ativo: boolean
  cpf: string
  celular: string
  filhoId: string
}

export function Usuarios() {
  const { state } = useApp()
  const { browserSupabase } = useAuth()
  const [users, setUsers] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [celular, setCelular] = useState('')
  const [identificador, setIdentificador] = useState('')
  const [senha, setSenha] = useState('')
  const [role, setRole] = useState<AppRole>('admin')
  const [filhoId, setFilhoId] = useState(state.filhos[0]?.id ?? '')
  const [edit, setEdit] = useState<EditDraft | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    if (browserSupabase) {
      const result = await sbListUsuarios()
      setLoading(false)
      if (result.ok === false) {
        setError(errorMap[result.error] ?? result.error)
        return
      }
      setUsers(result.users)
      return
    }

    const res = await fetch('/api/auth/users', { credentials: 'same-origin' })
    const data = (await res.json()) as { users?: AuthUser[]; error?: string }
    setLoading(false)
    if (!res.ok) {
      setError(errorMap[data.error ?? ''] ?? data.error ?? 'Erro ao listar usuários')
      return
    }
    setUsers(data.users ?? [])
  }, [browserSupabase])

  useEffect(() => {
    void load()
  }, [load])

  function startEdit(u: AuthUser) {
    setError('')
    setNotice('')
    setEdit({
      id: u.id,
      nome: u.nome,
      role: u.role,
      ativo: u.ativo !== false,
      cpf: u.cpf ?? '',
      celular: u.celular ?? '',
      filhoId: u.filhoId ?? state.filhos[0]?.id ?? '',
    })
  }

  async function handleCreatePages(e: FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
    setSaving(true)
    const result = await sbCreateAppUser({
      email,
      nome,
      senha,
      role,
      cpf: cpf.trim() || undefined,
      celular: celular.trim() || undefined,
      filhoId: role === 'medium' ? filhoId : undefined,
    })
    setSaving(false)
    if (result.ok === false) {
      setError(errorMap[result.error] ?? result.error)
      return
    }
    setNome('')
    setEmail('')
    setCpf('')
    setCelular('')
    setSenha('')
    setNotice(
      'Usuário criado. A senha temporária vale para contas Auth novas; se o e-mail já existia no Auth, a senha anterior permanece.',
    )
    await load()
  }

  async function handleCreateApi(e: FormEvent) {
    e.preventDefault()
    setError('')
    setNotice('')
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
        errorMap[data.error ?? ''] ?? data.error ?? 'Não foi possível criar.',
      )
      return
    }
    setNome('')
    setIdentificador('')
    setSenha('')
    await load()
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault()
    if (!edit) return
    setError('')
    setNotice('')
    setSaving(true)

    if (browserSupabase) {
      const result = await sbUpdateAppUser({
        id: edit.id,
        nome: edit.nome,
        role: edit.role,
        ativo: edit.ativo,
        cpf: edit.cpf,
        celular: edit.celular,
        filhoId: edit.role === 'medium' ? edit.filhoId : null,
      })
      setSaving(false)
      if (result.ok === false) {
        setError(errorMap[result.error] ?? result.error)
        return
      }
      setEdit(null)
      setNotice('Usuário atualizado.')
      await load()
      return
    }

    const res = await fetch(`/api/auth/users/${encodeURIComponent(edit.id)}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nome: edit.nome,
        role: edit.role,
        ativo: edit.ativo,
        filhoId: edit.role === 'medium' ? edit.filhoId : '',
        identificador: edit.cpf.trim() || edit.celular.trim() || undefined,
      }),
    })
    const data = (await res.json()) as { error?: string }
    setSaving(false)
    if (!res.ok) {
      setError(errorMap[data.error ?? ''] ?? data.error ?? 'Não foi possível atualizar.')
      return
    }
    setEdit(null)
    setNotice('Usuário atualizado.')
    await load()
  }

  async function handleDeactivate(u: AuthUser) {
    if (u.ativo === false) return
    if (!window.confirm(`Desativar ${u.nome}? O login ficará bloqueado.`)) return
    setError('')
    setNotice('')
    setSaving(true)

    if (browserSupabase) {
      const result = await sbDeactivateAppUser(u.id)
      setSaving(false)
      if (result.ok === false) {
        setError(errorMap[result.error] ?? result.error)
        return
      }
      if (edit?.id === u.id) setEdit(null)
      setNotice('Usuário desativado.')
      await load()
      return
    }

    const res = await fetch(`/api/auth/users/${encodeURIComponent(u.id)}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ativo: false }),
    })
    const data = (await res.json()) as { error?: string }
    setSaving(false)
    if (!res.ok) {
      setError(errorMap[data.error ?? ''] ?? data.error ?? 'Não foi possível desativar.')
      return
    }
    if (edit?.id === u.id) setEdit(null)
    setNotice('Usuário desativado.')
    await load()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-[var(--color-forest)] sm:text-3xl">
          Usuários e papéis
        </h2>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          {browserSupabase
            ? 'Administradores criam e editam usuários via Supabase Auth (sem código de instalação). Médiuns veem apenas o próprio cadastro.'
            : 'Administradores têm acesso total. Médiuns veem apenas o próprio cadastro, obrigações e cobranças.'}
        </p>
      </div>

      {browserSupabase ? (
        <form
          onSubmit={handleCreatePages}
          className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)]/80 p-4 shadow-sm"
        >
          <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-[var(--color-forest)]">
            <UserPlus size={18} />
            Novo usuário
          </h3>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Cria conta no Auth com senha temporária e registra em{' '}
            <code className="text-[var(--color-ink)]">public.usuarios</code>.
            Não usa <code className="text-[var(--color-ink)]">service_role</code>.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
              Nome
              <input
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
              E-mail
              <input
                required
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
              Senha temporária (mín. 8)
              <input
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
              Papel
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AppRole)}
                className={inputClass}
              >
                <option value="admin">Administrador</option>
                <option value="medium">Médium</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
              CPF (opcional)
              <input
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
              Celular (opcional)
              <input
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          {role === 'medium' ? (
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
              Filho vinculado
              <select
                required
                value={filhoId}
                onChange={(e) => setFilhoId(e.target.value)}
                className={inputClass}
              >
                {state.filhos.length === 0 ? (
                  <option value="">Cadastre um filho primeiro</option>
                ) : null}
                {state.filhos.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {error && !edit ? (
            <p className="text-sm text-[var(--color-status-vencida-fg)]">{error}</p>
          ) : null}
          {notice && !edit ? (
            <p className="text-sm text-[var(--color-forest)]">{notice}</p>
          ) : null}
          <button
            type="submit"
            disabled={saving || (role === 'medium' && state.filhos.length === 0)}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-forest)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)] disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Criar usuário
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleCreateApi}
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
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
              CPF / e-mail / celular
              <input
                required
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                className={inputClass}
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
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
              Papel
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as AppRole)}
                className={inputClass}
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
                className={inputClass}
              >
                {state.filhos.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {error && !edit ? (
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
      )}

      {edit ? (
        <form
          onSubmit={handleSaveEdit}
          className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)]/80 p-4 shadow-sm"
        >
          <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-[var(--color-forest)]">
            <Pencil size={18} />
            Editar usuário
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
              Nome
              <input
                required
                value={edit.nome}
                onChange={(e) => setEdit({ ...edit, nome: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
              Papel
              <select
                value={edit.role}
                onChange={(e) =>
                  setEdit({ ...edit, role: e.target.value as AppRole })
                }
                className={inputClass}
              >
                <option value="admin">Administrador</option>
                <option value="medium">Médium</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
              CPF
              <input
                value={edit.cpf}
                onChange={(e) => setEdit({ ...edit, cpf: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
              Celular
              <input
                value={edit.celular}
                onChange={(e) => setEdit({ ...edit, celular: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--color-ink-muted)] uppercase sm:col-span-2">
              <input
                type="checkbox"
                checked={edit.ativo}
                onChange={(e) => setEdit({ ...edit, ativo: e.target.checked })}
                className="rounded border-[var(--color-border)]"
              />
              Ativo
            </label>
          </div>
          {edit.role === 'medium' ? (
            <label className="block text-xs font-semibold text-[var(--color-ink-muted)] uppercase">
              Filho vinculado
              <select
                required
                value={edit.filhoId}
                onChange={(e) => setEdit({ ...edit, filhoId: e.target.value })}
                className={inputClass}
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
          {notice ? (
            <p className="text-sm text-[var(--color-forest)]">{notice}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-[var(--color-forest)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)] disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Salvar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setEdit(null)
                setError('')
                setNotice('')
              }}
              className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <ul className="space-y-2">
        {loading ? (
          <li className="text-sm text-[var(--color-ink-muted)]">Carregando…</li>
        ) : users.length === 0 ? (
          <li className="text-sm text-[var(--color-ink-muted)]">
            Nenhum usuário listado.
          </li>
        ) : (
          users.map((u) => (
            <li
              key={u.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)]/80 px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[var(--color-ink)]">
                    {u.nome}
                    {u.ativo === false ? (
                      <span className="ml-2 text-xs font-normal text-[var(--color-status-vencida-fg)]">
                        (inativo)
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[var(--color-ink-muted)]">
                    {u.role === 'admin' ? 'Administrador' : 'Médium'}
                    {u.email ? ` · ${u.email}` : ''}
                    {u.cpf ? ` · CPF ${u.cpf}` : ''}
                    {u.celular ? ` · ${u.celular}` : ''}
                    {u.filhoId
                      ? ` · filho ${
                          state.filhos.find((f) => f.id === u.filhoId)?.nome ??
                          u.filhoId
                        }`
                      : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => startEdit(u)}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-xs font-semibold text-[var(--color-ink)] disabled:opacity-60"
                  >
                    <Pencil size={12} />
                    Editar
                  </button>
                  {u.ativo !== false ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleDeactivate(u)}
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-xs font-semibold text-[var(--color-status-vencida-fg)] disabled:opacity-60"
                    >
                      <UserX size={12} />
                      Desativar
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
