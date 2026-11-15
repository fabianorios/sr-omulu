import {
  addYears,
  differenceInCalendarDays,
  format,
  isSameMonth,
  parseISO,
  startOfDay,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { REFERENCE_DATE } from '../data/mock'
import type {
  Filho,
  HouseEvent,
  ObligationStatus,
  ObligationType,
  Obrigacao,
} from '../types'

export function parseDate(iso: string): Date {
  return startOfDay(parseISO(iso))
}

export function formatBR(iso: string): string {
  return format(parseDate(iso), 'dd/MM/yyyy')
}

export function formatShortMonthDay(iso: string): string {
  return format(parseDate(iso), 'd MMM', { locale: ptBR })
}

export function formatLongDay(date: Date): string {
  return format(date, "d 'de' MMMM", { locale: ptBR })
}

export function getStatus(
  dueIso: string,
  reference: Date = REFERENCE_DATE,
): ObligationStatus {
  const due = parseDate(dueIso)
  const today = startOfDay(reference)
  const diff = differenceInCalendarDays(due, today)
  if (diff < 0) return 'vencida'
  if (diff <= 15) return 'proxima'
  return 'em_dia'
}

export function statusLabel(status: ObligationStatus): string {
  switch (status) {
    case 'vencida':
      return 'Vencida'
    case 'proxima':
      return 'Próxima'
    case 'em_dia':
      return 'Em dia'
  }
}

export function statusOrder(status: ObligationStatus): number {
  switch (status) {
    case 'vencida':
      return 0
    case 'proxima':
      return 1
    case 'em_dia':
      return 2
  }
}

export interface AlertItem {
  obrigacao: Obrigacao
  filho: Filho
  tipo: ObligationType
  status: ObligationStatus
}

export function buildAlerts(
  filhos: Filho[],
  obrigacoes: Obrigacao[],
  tipos: ObligationType[],
  reference: Date = REFERENCE_DATE,
): AlertItem[] {
  const filhoMap = new Map(filhos.map((f) => [f.id, f]))
  const tipoMap = new Map(tipos.map((t) => [t.id, t]))

  return obrigacoes
    .map((o) => {
      const filho = filhoMap.get(o.filhoId)
      const tipo = tipoMap.get(o.tipoId)
      if (!filho || !tipo) return null
      return {
        obrigacao: o,
        filho,
        tipo,
        status: getStatus(o.data, reference),
      }
    })
    .filter((x): x is AlertItem => x !== null)
    .sort((a, b) => {
      const so = statusOrder(a.status) - statusOrder(b.status)
      if (so !== 0) return so
      return parseDate(a.obrigacao.data).getTime() - parseDate(b.obrigacao.data).getTime()
    })
}

/** Próxima obrigação relevante por filho (a mais urgente). */
export function nextObligationForFilho(
  filhoId: string,
  obrigacoes: Obrigacao[],
  reference: Date = REFERENCE_DATE,
): Obrigacao | undefined {
  const list = obrigacoes
    .filter((o) => o.filhoId === filhoId)
    .sort(
      (a, b) =>
        parseDate(a.data).getTime() - parseDate(b.data).getTime(),
    )
  if (list.length === 0) return undefined

  const upcoming = list.find((o) => getStatus(o.data, reference) !== 'vencida')
  return upcoming ?? list[list.length - 1]
}

export function countDueThisMonth(
  obrigacoes: Obrigacao[],
  reference: Date = REFERENCE_DATE,
): number {
  return obrigacoes.filter((o) => isSameMonth(parseDate(o.data), reference)).length
}

export function countNext15Days(
  obrigacoes: Obrigacao[],
  reference: Date = REFERENCE_DATE,
): number {
  const today = startOfDay(reference)
  return obrigacoes.filter((o) => {
    const due = parseDate(o.data)
    const diff = differenceInCalendarDays(due, today)
    return diff >= 0 && diff <= 15
  }).length
}

export function nextHouseEvent(
  eventos: HouseEvent[],
  reference: Date = REFERENCE_DATE,
): HouseEvent | undefined {
  const today = startOfDay(reference)
  return [...eventos]
    .filter((e) => parseDate(e.data) >= today)
    .sort((a, b) => parseDate(a.data).getTime() - parseDate(b.data).getTime())[0]
}

export function calculateNextDate(
  lastDateIso: string,
  tipo: ObligationType,
): string | null {
  if (tipo.yearsOffset == null) return null
  const next = addYears(parseDate(lastDateIso), tipo.yearsOffset)
  return format(next, 'yyyy-MM-dd')
}
