// Calendar/date-window math backing the Bills & Income calendar view and
// cash-flow projections. Every date boundary is computed in UTC so a
// calendar day never drifts +/-1 day due to the server's local timezone.

import { sumAmounts } from '@/lib/money'

export interface DueItem {
  amount: number
  dueDate: Date
}

export interface ExpectedIncome {
  amount: number
  expectedDate: Date
}

export interface CashFlowWindow {
  windowStart: Date
  windowEnd: Date
  income: ExpectedIncome[]
  bills: DueItem[]
}

/** True if `year` is a Gregorian leap year. */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * Returns the last valid calendar day for `year`/`month` (0-indexed month),
 * e.g. clampDayToMonth(2026, 1, 31) -> 28 (Feb 2026), and
 * clampDayToMonth(2028, 1, 31) -> 29 (Feb 2028, leap year).
 */
export function clampDayToMonth(year: number, month: number, day: number): number {
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return Math.min(day, lastDayOfMonth)
}

/**
 * Converts a Date (or ISO string) to a strict `YYYY-MM-DD` calendar date,
 * anchored to UTC so calendar day never drifts +/-1 day due to local
 * timezone conversion.
 */
export function toISODateUTC(date: Date | string): string {
  if (typeof date === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date.trim())
    if (match) return `${match[1]}-${match[2]}-${match[3]}`
    date = new Date(date)
  }
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function itemDate(item: DueItem | ExpectedIncome): Date {
  return 'dueDate' in item ? item.dueDate : item.expectedDate
}

/** Filters items whose date falls within [windowStart, windowEnd], inclusive. */
export function getItemsDueInWindow<T extends DueItem | ExpectedIncome>(
  items: T[],
  windowStart: Date,
  windowEnd: Date
): T[] {
  const start = windowStart.getTime()
  const end = windowEnd.getTime()
  return items.filter((item) => {
    const t = itemDate(item).getTime()
    return t >= start && t <= end
  })
}

/**
 * Net cash flow for a window: sum(income expected in window) - sum(bills
 * due in window).
 */
export function calculateNetCashFlow(params: CashFlowWindow): number {
  const incomeInWindow = getItemsDueInWindow(params.income, params.windowStart, params.windowEnd)
  const billsInWindow = getItemsDueInWindow(params.bills, params.windowStart, params.windowEnd)
  const totalIncome = sumAmounts(incomeInWindow.map((item) => item.amount))
  const totalBills = sumAmounts(billsInWindow.map((item) => item.amount))
  return sumAmounts([totalIncome, -totalBills])
}
