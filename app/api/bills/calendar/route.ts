export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth-guard'
import { sumAmounts } from '@/lib/money'
import { computeDisplayStatus } from '@/lib/bills/status'
import {
  calculateNetCashFlow,
  clampDayToMonth,
  getItemsDueInWindow,
  toISODateUTC,
} from '@/lib/bills/calendar'

const MONTH_RE = /^(\d{4})-(\d{2})$/

// GET /api/bills/calendar?month=YYYY-MM
// Returns bills due in the month (tagged by status), income expected in the
// month, and a day-by-day net cash flow (income - bills) for the calendar view.
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireUser()
    if (error) return error
    const userId = (session!.user as any).id as string

    const monthParam = request.nextUrl.searchParams.get('month')
    const match = monthParam ? MONTH_RE.exec(monthParam) : null
    const now = new Date()
    const year = match ? Number(match[1]) : now.getUTCFullYear()
    const month = match ? Number(match[2]) - 1 : now.getUTCMonth() // 0-indexed

    if (monthParam && !match) {
      return NextResponse.json({ error: 'month must be formatted as YYYY-MM' }, { status: 400 })
    }

    const windowStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))
    const lastDay = clampDayToMonth(year, month, 31)
    const windowEnd = new Date(Date.UTC(year, month, lastDay, 23, 59, 59, 999))

    const [bills, incomeEntries] = await Promise.all([
      prisma.bill.findMany({
        where: { userId, dueDate: { gte: windowStart, lte: windowEnd } },
        orderBy: { dueDate: 'asc' },
        include: { vendor: { select: { id: true, name: true } } },
      }),
      prisma.income.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
      }),
    ])

    const taggedBills = bills.map((bill) => ({ ...bill, displayStatus: computeDisplayStatus(bill, now) }))

    // Income "expected" this window uses nextExpectedDate when the entry
    // recurs, falling back to its own date for one-time/first occurrences.
    const incomeWithExpectedDate = incomeEntries.map((income) => ({
      ...income,
      expectedDate: income.nextExpectedDate ?? income.date,
    }))
    const incomeInWindow = getItemsDueInWindow(incomeWithExpectedDate, windowStart, windowEnd)

    const dailyCashFlow: { date: string; income: number; bills: number; net: number }[] = []
    for (let day = 1; day <= lastDay; day++) {
      const dayStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0))
      const dayEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999))
      const dayIncome = getItemsDueInWindow(incomeWithExpectedDate, dayStart, dayEnd)
      const dayBills = getItemsDueInWindow(taggedBills, dayStart, dayEnd)
      const incomeTotal = sumAmounts(dayIncome.map((i) => i.amount))
      const billsTotal = sumAmounts(dayBills.map((b) => b.amount))
      dailyCashFlow.push({
        date: toISODateUTC(dayStart),
        income: incomeTotal,
        bills: billsTotal,
        net: calculateNetCashFlow({
          windowStart: dayStart,
          windowEnd: dayEnd,
          income: dayIncome,
          bills: dayBills,
        }),
      })
    }

    const totals = {
      income: sumAmounts(incomeInWindow.map((i) => i.amount)),
      bills: sumAmounts(taggedBills.map((b) => b.amount)),
      net: calculateNetCashFlow({
        windowStart,
        windowEnd,
        income: incomeWithExpectedDate,
        bills: taggedBills,
      }),
    }

    return NextResponse.json({
      month: `${year}-${String(month + 1).padStart(2, '0')}`,
      bills: taggedBills,
      income: incomeInWindow,
      dailyCashFlow,
      totals,
    })
  } catch (err: any) {
    console.error('GET /api/bills/calendar error:', err)
    return NextResponse.json({ error: 'Failed to load calendar' }, { status: 500 })
  }
}
