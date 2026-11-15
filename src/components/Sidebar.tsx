import { NavLink } from 'react-router-dom'
import { CalendarDays, LayoutDashboard, Settings, Users } from 'lucide-react'
import { Logo } from './Logo'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/filhos', label: 'Lista de Filhos', icon: Users },
  { to: '/config', label: 'Obrigações & Config.', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-[var(--color-border-soft)] bg-[var(--color-cream-deep)]/90 px-4 py-6">
      <div className="mb-8 flex flex-col items-center gap-3 px-2 text-center">
        <Logo size={64} />
        <div>
          <p className="font-serif text-xl font-semibold leading-tight text-[var(--color-forest)]">
            Senhor Omulu
          </p>
          <p className="mt-1 text-[10px] font-semibold tracking-[0.22em] text-[var(--color-ink-faint)]">
            IRMÃOS DE FÉ
          </p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
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
    </aside>
  )
}
