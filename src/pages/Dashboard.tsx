import {
  AlertTriangle,
  CalendarPlus,
  Clock,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { REFERENCE_DATE } from '../data/mock'
import { useApp } from '../context/AppContext'
import { StatusBadge } from '../components/StatusBadge'
import {
  countFilhosDevedores,
  countMensalidadesVencidas,
  formatBRL,
  getFinanceStatus,
  filhosDevedores,
} from '../lib/finance'
import {
  buildAlerts,
  countDueThisMonth,
  countNext15Days,
  formatBR,
  nextHouseEvent,
} from '../utils/status'

export function Dashboard() {
  const { state, setOpenNovoFilho, setOpenAgendar, setOpenNovaCobranca } =
    useApp()
  const alerts = buildAlerts(state.filhos, state.obrigacoes, state.tipos)
  const nextEvent = nextHouseEvent(state.eventos)
  const dueMonth = countDueThisMonth(state.obrigacoes)
  const next15 = countNext15Days(state.obrigacoes)
  const monthLabel = format(REFERENCE_DATE, 'MMMM yyyy', { locale: ptBR })
  const mensVencidas = countMensalidadesVencidas(state.cobrancas)
  const nDevedores = countFilhosDevedores(state.cobrancas)
  const listaDevedores = filhosDevedores(state.filhos, state.cobrancas)

  const cards = [
    {
      label: 'Total Filhos',
      value: String(state.filhos.length),
      sub: 'Filhos da Casa Cadastrados',
      icon: Users,
    },
    {
      label: 'Vencendo no Mês',
      value: String(dueMonth),
      sub: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      icon: Clock,
    },
    {
      label: 'Mensalidades vencidas',
      value: String(mensVencidas),
      sub: 'Cobranças mensais em atraso',
      icon: Wallet,
    },
    {
      label: 'Filhos em débito',
      value: String(nDevedores),
      sub: 'Com cobrança vencida em aberto',
      icon: AlertTriangle,
    },
  ]

  const secondaryCards = [
    {
      label: 'Próximas em 15 Dias',
      value: String(next15),
      sub: `Até ${format(new Date(2026, 10, 30), 'dd/MM')}`,
    },
    {
      label: 'Próxima Festa/Gira',
      value: nextEvent
        ? format(new Date(nextEvent.data + 'T12:00:00'), 'd MMM', {
            locale: ptBR,
          })
        : '—',
      sub: nextEvent?.titulo ?? 'Sem eventos',
    },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="animate-fade-in">
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--color-tan)] uppercase">
            Visão Geral
          </p>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-[var(--color-forest)] sm:text-3xl md:text-4xl">
            Dashboard da Casa
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--color-ink-muted)]">
            Acompanhe obrigações dos médiuns, alertas de prazo e a próxima gira
            da corrente.
          </p>
        </div>

        <div className="animate-fade-in-delay-1 flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpenNovoFilho(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-forest)] bg-white/70 px-3.5 py-2 text-sm font-semibold text-[var(--color-forest)] transition hover:bg-[var(--color-parchment)]"
          >
            <UserPlus size={16} />
            + Novo Filho
          </button>
          <button
            type="button"
            onClick={() => setOpenNovaCobranca(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-forest)] bg-white/70 px-3.5 py-2 text-sm font-semibold text-[var(--color-forest)] transition hover:bg-[var(--color-parchment)]"
          >
            <Wallet size={16} />
            + Cobrança
          </button>
          <button
            type="button"
            onClick={() => setOpenAgendar(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-forest)] px-3.5 py-2 text-sm font-semibold text-[var(--color-cream)] transition hover:bg-[var(--color-forest-hover)]"
          >
            <CalendarPlus size={16} />
            + Agendar Obrigação
          </button>
        </div>
      </div>

      <div className="animate-fade-in-delay-1 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, sub, icon: Icon }) => (
          <div
            key={label}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)]/80 p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-semibold tracking-wide text-[var(--color-ink-faint)] uppercase">
                {label}
              </p>
              <Icon
                size={18}
                className="text-[var(--color-gold)]"
                strokeWidth={1.75}
              />
            </div>
            <p className="mt-2 font-serif text-3xl font-semibold text-[var(--color-forest)]">
              {value}
            </p>
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {secondaryCards.map(({ label, value, sub }) => (
          <div
            key={label}
            className="rounded-lg border border-[var(--color-border-soft)] bg-white/50 px-4 py-3"
          >
            <p className="text-[11px] font-semibold tracking-wide text-[var(--color-ink-faint)] uppercase">
              {label}
            </p>
            <p className="mt-1 font-serif text-2xl font-semibold text-[var(--color-forest)]">
              {value}
            </p>
            <p className="text-xs text-[var(--color-ink-muted)]">{sub}</p>
          </div>
        ))}
      </div>

      <section className="animate-fade-in-delay-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)]/80 shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-soft)] px-5 py-4">
          <div>
            <h3 className="font-serif text-xl font-semibold text-[var(--color-forest)]">
              Débitos em aberto
            </h3>
            <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
              Filhos com cobrança vencida —{' '}
              <Link
                to="/financeiro"
                className="font-semibold text-[var(--color-forest)] underline-offset-2 hover:underline"
              >
                ver agenda financeira
              </Link>
            </p>
          </div>
        </div>
        {listaDevedores.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[var(--color-ink-muted)]">
            Nenhum filho em débito no momento.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border-soft)]">
            {listaDevedores.slice(0, 6).map((filho) => {
              const debitos = state.cobrancas.filter(
                (c) =>
                  c.filhoId === filho.id &&
                  getFinanceStatus(c) === 'vencido',
              )
              const total = debitos.reduce((s, c) => s + c.valor, 0)
              return (
                <li
                  key={filho.id}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--color-ink)]">
                      {filho.nome}
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                      {debitos.length} cobrança(s) · {formatBRL(total)}
                    </p>
                  </div>
                  <span className="rounded bg-[var(--color-status-vencida-bg)] px-2 py-0.5 text-[11px] font-semibold tracking-wide text-[var(--color-status-vencida-fg)] uppercase">
                    Devedor
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="animate-fade-in-delay-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)]/80 shadow-sm">
        <div className="border-b border-[var(--color-border-soft)] px-5 py-4">
          <h3 className="font-serif text-xl font-semibold text-[var(--color-forest)]">
            Alertas de obrigações
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            Em dia · Próxima · Vencida — ordenados por urgência
          </p>
        </div>

        <ul className="divide-y divide-[var(--color-border-soft)]">
          {alerts.slice(0, 8).map(({ filho, tipo, obrigacao, status }) => (
            <li
              key={obrigacao.id}
              className="flex items-center justify-between gap-3 px-4 py-3.5 sm:gap-4 sm:px-5"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--color-ink)]">
                  {filho.nome}
                </p>
                <p className="mt-0.5 truncate text-sm text-[var(--color-ink-muted)]">
                  Pai {filho.paiDeCabeca} · Mãe {filho.maeDeCabeca} ·{' '}
                  {tipo.name} · {formatBR(obrigacao.data)}
                  {obrigacao.itens?.length
                    ? ` · ${obrigacao.itens.map((i) => `${i.nome}×${i.quantidade}`).join(', ')}`
                    : ''}
                </p>
              </div>
              <StatusBadge status={status} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
