export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth-guard'
import { roundToCents } from '@/lib/money'
import { computeDisplayStatus } from '@/lib/bills/status'

const STATUSES = ['PENDING', 'PAID', 'OVERDUE']

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireUser()
    if (error) return error
    const userId = (session!.user as any).id as string
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Scope the lookup to this user so one user can never read or mutate
    // another user's bill (tenant isolation), and never leak existence.
    const existing = await prisma.bill.findFirst({ where: { id, userId } })
    if (!existing) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    const body = await request?.json?.()
    const { amount, dueDate, status, invoiceNumber } = body ?? {}
    const data: Record<string, unknown> = {}

    if (amount !== undefined) {
      const parsedAmount = Number(amount)
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
      }
      data.amount = roundToCents(parsedAmount)
    }

    if (dueDate !== undefined) {
      const parsedDueDate = new Date(dueDate)
      if (Number.isNaN(parsedDueDate.getTime())) {
        return NextResponse.json({ error: 'Invalid dueDate' }, { status: 400 })
      }
      data.dueDate = parsedDueDate
    }

    if (status !== undefined) {
      if (!STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      data.status = status
    }

    if (invoiceNumber !== undefined) {
      data.invoiceNumber =
        typeof invoiceNumber === 'string' && invoiceNumber.trim() ? invoiceNumber.trim() : null
    }

    const bill = await prisma.bill.update({
      where: { id },
      data,
      include: { vendor: { select: { id: true, name: true, category: true } } },
    })

    return NextResponse.json({ ...bill, displayStatus: computeDisplayStatus(bill) })
  } catch (err: any) {
    console.error('PATCH /api/bills/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireUser()
    if (error) return error
    const userId = (session!.user as any).id as string
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const existing = await prisma.bill.findFirst({ where: { id, userId } })
    if (!existing) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    await prisma.bill.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE /api/bills/[id] error:', err)
    return NextResponse.json({ error: 'Failed to delete bill' }, { status: 500 })
  }
}
