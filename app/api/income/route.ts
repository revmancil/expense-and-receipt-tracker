export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth-guard'
import { roundToCents } from '@/lib/money'
import { validateIncomeInput, computeNextExpectedDate, type IncomeFrequency } from '@/lib/bills/income'

export async function GET() {
  try {
    const { session, error } = await requireUser()
    if (error) return error
    const userId = (session!.user as any).id as string

    const income = await prisma.income.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(income)
  } catch (err: any) {
    console.error('GET /api/income error:', err)
    return NextResponse.json({ error: 'Failed to fetch income' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireUser()
    if (error) return error
    const userId = (session!.user as any).id as string

    const body = await request?.json?.()
    const { source, amount, date, frequency, notes, nextExpectedDate } = body ?? {}

    const parsedAmount = Number(amount)
    const validation = validateIncomeInput({
      source,
      amount: parsedAmount,
      date,
      frequency,
    })
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join('; ') }, { status: 400 })
    }

    const parsedDate = new Date(date)
    const computedNext =
      typeof nextExpectedDate === 'string' && nextExpectedDate
        ? new Date(nextExpectedDate)
        : computeNextExpectedDate(parsedDate, frequency as IncomeFrequency)

    const income = await prisma.income.create({
      data: {
        userId,
        source: source.trim(),
        amount: roundToCents(parsedAmount),
        frequency,
        date: parsedDate,
        nextExpectedDate: computedNext,
        notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
      },
    })

    return NextResponse.json(income, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/income error:', err)
    return NextResponse.json({ error: 'Failed to create income' }, { status: 500 })
  }
}
