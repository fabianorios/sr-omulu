import { useApp } from '../context/AppContext'
import { Logo } from './Logo'

export function Header() {
  const { resetDemo } = useApp()

  return (
    <header className="flex items-center justify-between gap-4 border-b border-[var(--color-border-soft)] bg-[var(--color-cream)]/80 px-6 py-3 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-3">
        <Logo size={36} className="shrink-0" />
        <div className="min-w-0">
          <h1 className="truncate font-serif text-lg font-semibold leading-tight text-[var(--color-forest)] md:text-xl">
            Tenda de Umbanda Senhor Omulu Irmãos de Fé
          </h1>
          <p className="truncate text-xs text-[var(--color-ink-muted)] md:text-sm">
            Agenda e Controle Inteligente de Obrigações dos Médiuns
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={resetDemo}
        className="shrink-0 rounded border border-[var(--color-forest)]/40 bg-[var(--color-forest)] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[var(--color-cream)] uppercase transition hover:bg-[var(--color-forest-hover)]"
        title="Restaurar dados de exemplo"
      >
        Dados de exemplo
      </button>
    </header>
  )
}
