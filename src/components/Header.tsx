import { Menu } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Logo } from './Logo'

type HeaderProps = {
  onOpenMenu?: () => void
}

const SOURCE_LABEL = {
  sample: 'Dados de exemplo',
  local: 'Rascunho local',
  supabase: 'Supabase',
  unset: 'Sem banco',
} as const

export function Header({ onOpenMenu }: HeaderProps) {
  const { resetDemo, state } = useApp()

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--color-border-soft)] bg-[var(--color-cream)]/90 px-3 py-2.5 backdrop-blur-sm sm:gap-4 sm:px-6 sm:py-3">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          className="shrink-0 rounded-md p-2 text-[var(--color-forest)] hover:bg-[var(--color-parchment)] md:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
        <Logo size={40} emblemOnly className="hidden shrink-0 sm:block" />
        <div className="min-w-0">
          <h1 className="truncate font-serif text-base font-semibold leading-tight text-[var(--color-forest)] sm:text-lg md:text-xl">
            <span className="sm:hidden">Senhor Omulu</span>
            <span className="hidden sm:inline">
              Tenda de Umbanda Senhor Omulu Irmãos de Fé
            </span>
          </h1>
          <p className="hidden truncate text-xs text-[var(--color-ink-muted)] sm:block md:text-sm">
            Agenda e Controle Inteligente de Obrigações dos Médiuns
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className="hidden rounded border border-[var(--color-border)] bg-white/70 px-2 py-1 text-[10px] font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase sm:inline"
          title="Origem dos dados de filhos"
        >
          {SOURCE_LABEL[state.dataSource]}
        </span>
        <button
          type="button"
          onClick={resetDemo}
          className="rounded border border-[var(--color-forest)]/40 bg-[var(--color-forest)] px-2.5 py-1.5 text-[10px] font-semibold tracking-wide text-[var(--color-cream)] uppercase transition hover:bg-[var(--color-forest-hover)] sm:px-3 sm:text-[11px]"
          title="Restaurar dados de exemplo"
        >
          <span className="sm:hidden">Exemplo</span>
          <span className="hidden sm:inline">Dados de exemplo</span>
        </button>
      </div>
    </header>
  )
}
