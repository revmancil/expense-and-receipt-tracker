export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-guard'

const TYPES = ['income', 'expense', 'both']

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
      const clash = await prisma.category.findFirst({
        where: { name: { equals: newName, mode: 'insensitive' }, NOT: { id } },
      })
      if (clash) {
        return NextResponse.json({ error: 'A category with that name already exists' }, { status: 409 })
      }
      data.name = newName
    }
    if (TYPES.includes(body?.categoryType)) data.categoryType = body.categoryType
    if (typeof body?.isActive === 'boolean') data.isActive = body.isActive

    const existing = await prisma.category.findUnique({ where: { id } })
    const category = await prisma.category.update({ where: { id }, data })

    // If the category was renamed, propagate to historical transactions so reporting stays consistent.
    if (data.name && existing && existing.name !== data.name) {
      await prisma.entry.updateMany({
        where: { category: existing.name },
        data: { category: data.name },
      })
    }

    return NextResponse.json(category)
  } catch (err: any) {
    console.error('PATCH /api/categories/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}
