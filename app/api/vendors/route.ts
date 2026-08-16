export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser, requireAdmin } from '@/lib/auth-guard'

const TYPES = ['vendor', 'customer', 'both']

export async function GET() {
  try {
    const { error } = await requireUser()
    if (error) return error
    const vendors = await prisma.vendor.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(vendors ?? [])
  } catch (err: any) {
    console.error('GET /api/vendors error:', err)
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAdmin()
    if (error) return error
    const body = await request?.json?.()
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const partyType = TYPES.includes(body?.partyType) ? body.partyType : 'both'
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    const existing = await prisma.vendor.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    })
    if (existing) {
      return NextResponse.json({ error: 'That vendor/customer already exists' }, { status: 409 })
    }
    const vendor = await prisma.vendor.create({
      data: { name, partyType, isActive: true },
    })
    return NextResponse.json(vendor, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/vendors error:', err)
    return NextResponse.json({ error: 'Failed to create vendor/customer' }, { status: 500 })
  }
}
