import { useState, type FormEvent } from 'react'
import { Loader2, Lock, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/Logo'
import { MandalaOrixas } from '../components/MandalaOrixas'

export function Login() {
  const {
    login,
    bootstrap,
    needsBootstrap,
    loading,
    browserSupabase,
    pagesMissingVite,
  } = useAuth()
  const [nome, setNome] = useState('')
  const [identificador, setIdentificador] = useState('')
  const [senha, setSenha] = useState('')
  const [bootstrapSecret, setBootstrapSecret] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const errorMap: Record<string, string> = {
    invalid_credentials: 'Identificador ou senha incorretos.',
    nome_identificador_senha_min_8:
      'Nome, identificador e senha (mín. 8) são obrigatórios.',
    bootstrap_closed: 'Já existe administrador. Faça login.',
    invalid_bootstrap_secret: 'Código de instalação inválido.',
    bootstrap_unavailable:
      'Bootstrap indisponível. Configure o segredo com set_bootstrap_secret no SQL Editor.',
    identificador_senha_required: 'Preencha identificador e senha.',
    too_many_attempts:
      'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
    api_unreachable:
      'API de login indisponível neste host. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Cloudflare Pages (Build variables) e faça Redeploy.',
    pages_missing_vite:
      'Deploy sem VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. No Cloudflare Pages → Settings → Environment variables (Production, Build), adicione as duas, salve e Redeploy main.',
    server_error:
      'Servidor indisponível. Confirme schema/RLS e variáveis VITE_* no Pages.',
    email_required_pages:
      'Neste host use e-mail (não CPF/celular) + senha do Supabase Auth.',
    email_confirm_required:
      'E-mail ainda não confirmado no Auth. Em Authentication → Providers → Email, desative “Confirm email”, ou confirme pelo link e tente de novo.',
    account_exists_wrong_password:
      'Esta conta Auth já existe. Use a mesma senha do cadastro anterior, ou apague o usuário em Authentication → Users e tente Criar administrador de novo.',
    session_required:
      'Não foi possível abrir sessão Auth. Verifique Confirm email desligado e tente de novo (ou use Entrar se a conta já existir).',
    supabase_unconfigured:
      'Supabase do browser não configurado (faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).',
    bootstrap_failed:
      'Falha ao criar administrador (Auth ok, mas claim_bootstrap/perfil falhou).',
    auth_failed:
      'Falha no Auth/RPC. Veja o detalhe abaixo (secret, claim_bootstrap, pgcrypto).',
    not_authenticated:
      'Sessão Auth ausente ao chamar claim_bootstrap. Tente de novo.',
    login_failed: 'Login falhou.',
  }

  function formatAuthError(code?: string, detail?: string): string {
    const base =
      errorMap[code ?? ''] ??
      `Não foi possível entrar. [${code || 'unknown'}]`
    if (detail && detail.trim() && detail !== code) {
      return `${base} — ${detail}`
    }
    return base
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (pagesMissingVite) {
      setError(errorMap.pages_missing_vite)
      return
    }
    setSaving(true)
    try {
      const result = needsBootstrap
        ? await bootstrap({ nome, identificador, senha, bootstrapSecret })
        : await login(identificador, senha)
      if (!result.ok) {
        setError(formatAuthError(result.error, result.detail))
      }
    } catch (err) {
      setError(
        formatAuthError(
          'api_unreachable',
          err instanceof Error ? err.message : undefined,
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F3EB] text-sm text-[#5c5348]">
        Carregando…
      </div>
    )
  }

  const fieldClass =
    'w-full rounded-lg border border-[#D6D3C9] bg-white px-3.5 py-2.5 text-sm text-[#1E2B24] shadow-sm outline-none transition placeholder:text-[#8a7f70] focus:border-[#1A3628] focus:ring-2 focus:ring-[#1A3628]/15'

  const labelClass =
    'mb-1.5 block text-xs font-semibold tracking-wide text-[#5c5348] uppercase'

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F6F3EB]">
      {/* Subtle brand gradient — warm off-white, forest tint */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 55% 45% at 18% 42%, rgba(26, 54, 40, 0.06), transparent 70%),
            radial-gradient(ellipse 50% 40% at 88% 12%, rgba(140, 122, 91, 0.1), transparent 65%),
            linear-gradient(165deg, #F8F5ED 0%, #F6F3EB 45%, #F0EBE0 100%)
          `,
        }}
      />

      {/* Mobile watermark mandala */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center lg:hidden"
      >
        <MandalaOrixas
          watermark
          className="h-[min(92vw,520px)] w-[min(92vw,520px)]"
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        {/* Desktop mandala panel ~42% */}
        <aside className="hidden lg:flex lg:w-[42%] lg:items-center lg:justify-center lg:px-6 lg:py-10 xl:px-10">
          <MandalaOrixas className="h-auto w-full max-w-[560px] animate-fade-in" />
        </aside>

        {/* Login panel ~58% — pulled toward mandala on large screens */}
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 lg:w-[58%] lg:items-start lg:justify-center lg:pl-2 lg:pr-10 xl:pl-4 xl:pr-16">
          <div className="w-full max-w-md animate-fade-in lg:max-w-[420px]">
            <header className="mb-6 text-center lg:mb-7 lg:text-left">
              <h1 className="font-serif text-2xl leading-tight font-semibold text-[#1E2B24] sm:text-3xl">
                T.U. Sr. Omulu — Irmãos de Fé
              </h1>
              <p className="mt-2 text-sm text-[#5c5348]">
                {needsBootstrap
                  ? 'Primeiro acesso: cadastre o administrador da casa.'
                  : browserSupabase
                    ? 'Acesso via e-mail e senha (Supabase Auth).'
                    : 'Acesso para administração e médiuns da casa.'}
              </p>
            </header>

            <div className="w-full max-w-[420px] rounded-2xl border border-[#D6D3C9] bg-[#FAF8F2] p-8 shadow-md animate-fade-in-delay-1">
              <div className="mb-6 flex flex-col items-center text-center">
                <Logo size={120} className="drop-shadow-sm" />
                <h2 className="mt-4 font-serif text-xl font-semibold text-[#1A3628]">
                  {needsBootstrap ? 'Criar administrador' : 'Entrar'}
                </h2>
                <p className="mt-1.5 max-w-xs text-sm text-[#5c5348]">
                  {needsBootstrap
                    ? browserSupabase
                      ? 'Informe o código de instalação (mesmo valor de set_bootstrap_secret), e-mail e senha.'
                      : 'Informe o código de instalação (BOOTSTRAP_SECRET) e os dados do administrador.'
                    : browserSupabase
                      ? 'Use o e-mail e a senha cadastrados no Supabase Auth.'
                      : 'Use CPF, e-mail ou celular e sua senha.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {pagesMissingVite ? (
                  <p
                    role="alert"
                    className="rounded-lg bg-[#f5e0e0] px-3 py-2 text-sm text-[#9b3a3a]"
                  >
                    {errorMap.pages_missing_vite}
                  </p>
                ) : null}
                {needsBootstrap ? (
                  <>
                    <label className="block">
                      <span className={labelClass}>Código de instalação</span>
                      <input
                        required
                        type="password"
                        value={bootstrapSecret}
                        onChange={(e) => setBootstrapSecret(e.target.value)}
                        className={fieldClass}
                        autoComplete="off"
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Nome</span>
                      <div className="relative">
                        <UserRound
                          size={16}
                          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#8C7A5B]"
                          aria-hidden
                        />
                        <input
                          required
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          className={`${fieldClass} pl-9`}
                        />
                      </div>
                    </label>
                  </>
                ) : null}

                <label className="block">
                  <span className={labelClass}>
                    {browserSupabase ? 'E-mail' : 'CPF, e-mail ou celular'}
                  </span>
                  <div className="relative">
                    <UserRound
                      size={16}
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#8C7A5B]"
                      aria-hidden
                    />
                    <input
                      required
                      type={browserSupabase ? 'email' : 'text'}
                      value={identificador}
                      onChange={(e) => setIdentificador(e.target.value)}
                      placeholder={
                        browserSupabase
                          ? 'email@casa.org'
                          : 'email@casa.org · 000.000.000-00 · (11) 90000-0000'
                      }
                      className={`${fieldClass} pl-9`}
                      autoComplete="username"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className={labelClass}>Senha</span>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#8C7A5B]"
                      aria-hidden
                    />
                    <input
                      required
                      type="password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      minLength={needsBootstrap ? 8 : 1}
                      className={`${fieldClass} pl-9`}
                      autoComplete={
                        needsBootstrap ? 'new-password' : 'current-password'
                      }
                    />
                  </div>
                </label>

                {error ? (
                  <p
                    role="alert"
                    className="rounded-lg bg-[#f5e0e0] px-3 py-2 text-sm text-[#9b3a3a]"
                  >
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={saving || pagesMissingVite}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1A3628] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12261C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A3628] disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Lock size={16} />
                  )}
                  {needsBootstrap ? 'Criar administrador' : 'Entrar'}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
