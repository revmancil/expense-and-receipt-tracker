export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth-guard'
import { roundToCents } from '@/lib/money'
import { validateIncomeInput, computeNextExpectedDate, type IncomeFrequency } from '@/lib/bills/income'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireUser()
    if (error) return error
    const userId = (session!.user as any).id as string
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const existing = await prisma.income.findFirst({ where: { id, userId } })
    if (!existing) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 })
    }

    const body = await request?.json?.()
    const { source, amount, date, frequency, notes } = body ?? {}

    const merged = {
      source: source ?? existing.source,
      amount: amount !== undefined ? Number(amount) : existing.amount,
      date: date ?? existing.date.toISOString(),
      frequency: frequency ?? existing.frequency,
    }
    const validation = validateIncomeInput(merged)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join('; ') }, { status: 400 })
    }

    const parsedDate = new Date(merged.date)
    const income = await prisma.income.update({
      where: { id },
      data: {
        source: merged.source.trim(),
        amount: roundToCents(merged.amount),
        frequency: merged.frequency,
        date: parsedDate,
        nextExpectedDate: computeNextExpectedDate(parsedDate, merged.frequency as IncomeFrequency),
        notes: notes !== undefined ? (typeof notes === 'string' && notes.trim() ? notes.trim() : null) : existing.notes,
      },
    })

    return NextResponse.json(income)
  } catch (err: any) {
    console.error('PATCH /api/income/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update income' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireUser()
    if (error) return error
    const userId = (session!.user as any).id as string
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const existing = await prisma.income.findFirst({ where: { id, userId } })
    if (!existing) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 })
    }

    await prisma.income.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE /api/income/[id] error:', err)
    return NextResponse.json({ error: 'Failed to delete income' }, { status: 500 })
  }
}
