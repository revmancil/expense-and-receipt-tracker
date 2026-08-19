// Contract for calendar/date-window math backing the Bills & Income
// calendar view and cash-flow projections. Implementation lands in a later
// step (Green stage).

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
export function isLeapYear(_year: number): boolean {
  throw new Error('isLeapYear is not implemented yet')
}

/**
 * Returns the last valid calendar day for `year`/`month` (0-indexed month),
 * e.g. clampDayToMonth(2026, 1, 31) -> 28 (Feb 2026), and
 * clampDayToMonth(2028, 1, 31) -> 29 (Feb 2028, leap year).
 */
export function clampDayToMonth(_year: number, _month: number, _day: number): number {
  throw new Error('clampDayToMonth is not implemented yet')
}

/**
 * Converts a Date (or ISO string) to a strict `YYYY-MM-DD` calendar date,
 * anchored to UTC so calendar day never drifts +/-1 day due to local
 * timezone conversion.
 */
export function toISODateUTC(_date: Date | string): string {
  throw new Error('toISODateUTC is not implemented yet')
}

/** Filters items whose date falls within [windowStart, windowEnd], inclusive. */
export function getItemsDueInWindow<T extends { dueDate: Date } | { expectedDate: Date }>(
  _items: T[],
  _windowStart: Date,
  _windowEnd: Date
): T[] {
  throw new Error('getItemsDueInWindow is not implemented yet')
}

/**
 * Net cash flow for a window: sum(income expected in window) - sum(bills
 * due in window).
 */
export function calculateNetCashFlow(_params: CashFlowWindow): number {
  throw new Error('calculateNetCashFlow is not implemented yet')
}
