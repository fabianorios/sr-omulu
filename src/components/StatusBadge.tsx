import type { ObligationStatus } from '../types'
import { statusLabel } from '../utils/status'

const styles: Record<ObligationStatus, string> = {
  vencida: 'bg-[var(--color-status-vencida-bg)] text-[var(--color-status-vencida-fg)]',
  proxima: 'bg-[var(--color-status-proxima-bg)] text-[var(--color-status-proxima-fg)]',
  em_dia: 'bg-[var(--color-status-emdia-bg)] text-[var(--color-status-emdia-fg)]',
}

export function StatusBadge({
  status,
  className = '',
}: {
  status: ObligationStatus
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold tracking-wide ${styles[status]} ${className}`}
    >
      {statusLabel(status)}
    </span>
  )
}
