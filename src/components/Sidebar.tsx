import { NavLink } from 'react-router-dom'
import {
  CalendarDays,
  LayoutDashboard,
  Settings,
  Shield,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { Logo } from './Logo'
import { useAuth } from '../context/AuthContext'

const baseLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/financeiro', label: 'Agenda financeira', icon: Wallet },
  { to: '/filhos', label: 'Lista de Filhos', icon: Users },
]

type SidebarProps = {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const { isAdmin } = useAuth()
  const links = [
    ...baseLinks,
    ...(isAdmin
      ? [
          { to: '/config', label: 'Obrigações & Config.', icon: Settings },
          { to: '/usuarios', label: 'Usuários', icon: Shield },
        ]
      : []),
  ]

  return (
    <>
      <div
        className={[
          'fixed inset-0 z-40 bg-[var(--color-ink)]/40 transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-[min(280px,86vw)] shrink-0 flex-col border-r border-[var(--color-border-soft)] bg-[var(--color-cream-deep)] px-4 py-6 shadow-xl transition-transform duration-200 md:static md:z-auto md:w-[240px] md:shadow-none md:transition-none',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
        aria-label="Navegação principal"
      >
        <div className="mb-8 flex items-start justify-between gap-2 px-1">
          <div className="flex flex-1 flex-col items-center text-center">
            <Logo size={148} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-parchment)] md:hidden"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--color-parchment)] text-[var(--color-forest)] shadow-sm ring-1 ring-[var(--color-border)]'
                    : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-parchment)]/60 hover:text-[var(--color-forest)]',
                ].join(' ')
              }
            >
              <Icon size={18} strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <p className="mt-auto px-2 pt-6 text-center text-[10px] leading-relaxed text-[var(--color-ink-faint)]">
          Tenda de Umbanda — Agenda e controle inteligente de obrigações dos
          médiuns.
        </p>
      </aside>
    </>
  )
}
