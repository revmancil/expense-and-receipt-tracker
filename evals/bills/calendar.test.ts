import { describe, expect, it } from 'vitest'
import {
  calculateNetCashFlow,
  clampDayToMonth,
  getItemsDueInWindow,
  isLeapYear,
  toISODateUTC,
} from '@/lib/bills/calendar'

describe('isLeapYear', () => {
  it.each([
    [2024, true],
    [2028, true],
    [2000, true], // divisible by 400
    [2026, false],
    [1900, false], // divisible by 100 but not 400
  ])('isLeapYear(%i) === %s', (year, expected) => {
    expect(isLeapYear(year)).toBe(expected)
  })
})

describe('clampDayToMonth', () => {
  it('clamps the 31st to the last day of a 30-day month', () => {
    expect(clampDayToMonth(2026, 3, 31)).toBe(30) // April 2026
  })

  it('clamps the 31st to Feb 28 in a non-leap year', () => {
    expect(clampDayToMonth(2026, 1, 31)).toBe(28)
  })

  it('clamps the 31st to Feb 29 in a leap year', () => {
    expect(clampDayToMonth(2028, 1, 31)).toBe(29)
  })

  it('leaves the 31st unchanged for a 31-day month', () => {
    expect(clampDayToMonth(2026, 0, 31)).toBe(31) // January
  })
})

describe('toISODateUTC', () => {
  it('formats a UTC midnight Date as YYYY-MM-DD', () => {
    expect(toISODateUTC(new Date('2026-03-05T00:00:00.000Z'))).toBe('2026-03-05')
  })

  it('does not drift a day for a late-night UTC timestamp near a negative-offset boundary', () => {
    // 11:30pm UTC on the 5th must stay the 5th, never roll to the 4th or 6th
    // regardless of the host machine's local timezone.
    expect(toISODateUTC(new Date('2026-03-05T23:30:00.000Z'))).toBe('2026-03-05')
  })

  it('does not drift a day for an early-morning UTC timestamp near a positive-offset boundary', () => {
    expect(toISODateUTC(new Date('2026-03-05T00:15:00.000Z'))).toBe('2026-03-05')
  })

  it('parses a bare YYYY-MM-DD string without shifting days', () => {
    expect(toISODateUTC('2026-12-31')).toBe('2026-12-31')
  })
})

describe('getItemsDueInWindow', () => {
  const windowStart = new Date('2026-03-01T00:00:00.000Z')
  const windowEnd = new Date('2026-03-31T23:59:59.999Z')

  it('includes items exactly on the window boundaries', () => {
    const bills = [
      { amount: 10, dueDate: new Date('2026-03-01T00:00:00.000Z') },
      { amount: 20, dueDate: new Date('2026-03-31T00:00:00.000Z') },
    ]
    const due = getItemsDueInWindow(bills, windowStart, windowEnd)
    expect(due).toHaveLength(2)
  })

  it('excludes items outside the window', () => {
    const bills = [
      { amount: 10, dueDate: new Date('2026-02-28T23:00:00.000Z') },
      { amount: 20, dueDate: new Date('2026-04-01T00:00:01.000Z') },
    ]
    const due = getItemsDueInWindow(bills, windowStart, windowEnd)
    expect(due).toHaveLength(0)
  })
})

describe('calculateNetCashFlow', () => {
  const windowStart = new Date('2026-03-01T00:00:00.000Z')
  const windowEnd = new Date('2026-03-31T23:59:59.999Z')

  it('subtracts bills due in the window from income expected in the window', () => {
    const net = calculateNetCashFlow({
      windowStart,
      windowEnd,
      income: [
        { amount: 3000, expectedDate: new Date('2026-03-01T00:00:00.000Z') },
        { amount: 1500, expectedDate: new Date('2026-03-15T00:00:00.000Z') },
      ],
      bills: [
        { amount: 1200, dueDate: new Date('2026-03-05T00:00:00.000Z') },
        { amount: 300, dueDate: new Date('2026-03-31T00:00:00.000Z') },
      ],
    })
    expect(net).toBeCloseTo(3000 + 1500 - 1200 - 300, 2)
  })

  it('ignores income and bills outside the window', () => {
    const net = calculateNetCashFlow({
      windowStart,
      windowEnd,
      income: [
        { amount: 3000, expectedDate: new Date('2026-03-10T00:00:00.000Z') },
        { amount: 9999, expectedDate: new Date('2026-04-10T00:00:00.000Z') }, // outside
      ],
      bills: [
        { amount: 500, dueDate: new Date('2026-03-10T00:00:00.000Z') },
        { amount: 9999, dueDate: new Date('2026-02-01T00:00:00.000Z') }, // outside
      ],
    })
    expect(net).toBeCloseTo(3000 - 500, 2)
  })

  it('returns a negative number when bills exceed income for the window', () => {
    const net = calculateNetCashFlow({
      windowStart,
      windowEnd,
      income: [{ amount: 500, expectedDate: new Date('2026-03-05T00:00:00.000Z') }],
      bills: [{ amount: 2000, dueDate: new Date('2026-03-06T00:00:00.000Z') }],
    })
    expect(net).toBeLessThan(0)
  })
})
