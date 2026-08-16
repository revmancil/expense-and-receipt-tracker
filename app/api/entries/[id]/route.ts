export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteFile } from '@/lib/s3'
import { requireUser } from '@/lib/auth-guard'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireUser()
    if (error) return error
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const body = await request?.json?.()
    const { type, date, amount, partyName, checkNumber, category, notes, receiptUrl } =
      body ?? {}

    if (!type || !date || amount == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (type !== 'RECEIPT' && type !== 'EXPENSE') {
      return NextResponse.json({ error: 'Invalid entry type' }, { status: 400 })
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const cleanName = typeof partyName === 'string' ? partyName.trim() : ''
    const cleanCheck = typeof checkNumber === 'string' ? checkNumber.trim() : ''
    const cleanCategory = typeof category === 'string' ? category.trim() : ''
    const cleanNotes = typeof notes === 'string' ? notes.trim() : ''
    const cleanReceipt = typeof receiptUrl === 'string' ? receiptUrl.trim() : ''

    const entry = await prisma.entry.update({
      where: { id },
      data: {
        type,
        date: new Date(date),
        amount: parsedAmount,
        partyName: cleanName || null,
        checkNumber: type === 'EXPENSE' && cleanCheck ? cleanCheck : null,
        category: cleanCategory || null,
        notes: cleanNotes || null,
        receiptUrl: cleanReceipt || null,
      },
    })

    return NextResponse.json(entry)
  } catch (err: any) {
    console.error('PATCH /api/entries/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireUser()
    if (error) return error
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const existing = await prisma.entry.findUnique({ where: { id } })
    await prisma.entry.delete({ where: { id } })

    // Best-effort cleanup of the attached receipt file.
    if (existing?.receiptUrl) {
      await deleteFile(existing.receiptUrl).catch((e) =>
        console.error('receipt cleanup error:', e)
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE /api/entries/[id] error:', err)
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}
