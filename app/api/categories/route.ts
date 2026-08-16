export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, requireAdmin } from '@/lib/auth-guard'

const TYPES = ['income', 'expense', 'both']

export async function GET() {
  try {
    const { error } = await requireUser()
    if (error) return error
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(categories ?? [])
  } catch (err: any) {
    console.error('GET /api/categories error:', err)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin()
    if (error) return error
    const body = await request?.json?.()
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const categoryType = TYPES.includes(body?.categoryType) ? body.categoryType : 'expense'
    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }
    const existing = await prisma.category.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    })
    if (existing) {
      return NextResponse.json({ error: 'A category with that name already exists' }, { status: 409 })
    }
    const category = await prisma.category.create({
      data: { name, categoryType, isActive: true },
    })
    return NextResponse.json(category, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/categories error:', err)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
