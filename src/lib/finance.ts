import { format, getDaysInMonth, parseISO, startOfDay } from 'date-fns'
import { REFERENCE_DATE } from '../data/mock'
import type {
  Cobranca,
  CobrancaCategoria,
  FinanceStatus,
  Filho,
} from '../types'

/** Dia do mês (1–28) → data de vencimento no ciclo atual/próximo. */
export function vencimentoFromDiaMes(
  dia: number,
  reference: Date = REFERENCE_DATE,
): string {
  const safeDia = Math.min(28, Math.max(1, Math.floor(Number(dia)) || 1))
  const ref = startOfDay(reference)
  const year = ref.getFullYear()
  const month = ref.getMonth()
  const dim = getDaysInMonth(new Date(year, month, 1))
  const day = Math.min(safeDia, dim)
  let due = startOfDay(new Date(year, month, day))
  if (due.getTime() < ref.getTime()) {
    const next = new Date(year, month + 1, 1)
    const dimNext = getDaysInMonth(next)
    due = startOfDay(
      new Date(next.getFullYear(), next.getMonth(), Math.min(safeDia, dimNext)),
    )
  }
  return format(due, 'yyyy-MM-dd')
}

export function referenciaFromDate(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM')
}

export function getFinanceStatus(
  cobranca: Cobranca,
  reference: Date = REFERENCE_DATE,
): FinanceStatus {
  if (cobranca.pago) return 'pago'
  const due = startOfDay(parseISO(cobranca.vencimento))
  const today = startOfDay(reference)
  return due < today ? 'vencido' : 'aberto'
}

export function financeStatusLabel(status: FinanceStatus): string {
  switch (status) {
    case 'pago':
      return 'Pago'
    case 'vencido':
      return 'Vencido'
    case 'aberto':
      return 'Em aberto'
  }
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function isMensalidade(c: Cobranca): boolean {
  return c.categoria === 'mensalidade'
}

export function countMensalidadesVencidas(
  cobrancas: Cobranca[],
  reference: Date = REFERENCE_DATE,
): number {
  return cobrancas.filter(
    (c) =>
      isMensalidade(c) && getFinanceStatus(c, reference) === 'vencido',
  ).length
}

export function countFilhosDevedores(
  cobrancas: Cobranca[],
  reference: Date = REFERENCE_DATE,
): number {
  const ids = new Set(
    cobrancas
      .filter((c) => getFinanceStatus(c, reference) === 'vencido')
      .map((c) => c.filhoId),
  )
  return ids.size
}

export function filhosDevedores(
  filhos: Filho[],
  cobrancas: Cobranca[],
  reference: Date = REFERENCE_DATE,
): Filho[] {
  const ids = new Set(
    cobrancas
      .filter((c) => getFinanceStatus(c, reference) === 'vencido')
      .map((c) => c.filhoId),
  )
  return filhos.filter((f) => ids.has(f.id))
}

export function categoriaLabel(cat: CobrancaCategoria): string {
  switch (cat) {
    case 'mensalidade':
      return 'Mensalidade'
    case 'contribuicao':
      return 'Contribuição'
    case 'outro':
      return 'Outro'
  }
}
