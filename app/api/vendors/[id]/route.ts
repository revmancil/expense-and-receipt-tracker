export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'

const TYPES = ['vendor', 'customer', 'both']

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireAdmin()
    if (error) return error
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const body = await request?.json?.()

    const data: any = {}
    if (typeof body?.name === 'string' && body.name.trim()) {
      const newName = body.name.trim()
      const clash = await prisma.vendor.findFirst({
        where: { name: { equals: newName, mode: 'insensitive' }, NOT: { id } },
      })
      if (clash) {
        return NextResponse.json({ error: 'That vendor/customer already exists' }, { status: 409 })
      }
      data.name = newName
    }
    if (TYPES.includes(body?.partyType)) data.partyType = body.partyType
    if (typeof body?.isActive === 'boolean') data.isActive = body.isActive

    const existing = await prisma.vendor.findUnique({ where: { id } })
    const vendor = await prisma.vendor.update({ where: { id }, data })

    // Propagate a rename to historical transactions so reporting stays consistent.
    if (data.name && existing && existing.name !== data.name) {
      await prisma.entry.updateMany({
        where: { partyName: existing.name },
        data: { partyName: data.name },
      })
    }

    return NextResponse.json(vendor)
  } catch (err: any) {
    console.error('PATCH /api/vendors/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update vendor/customer' }, { status: 500 })
  }
}
