export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getFileUrl } from '@/lib/s3'
import { requireUser } from '@/lib/auth-guard'

// Returns a short-lived signed URL to view/download a private receipt.
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireUser()
    if (error) return error
    const path = request.nextUrl.searchParams.get('path')
    if (!path) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 })
    }
    const contentType = path.toLowerCase().endsWith('.pdf')
      ? 'application/pdf'
      : 'image/jpeg'
    const url = await getFileUrl(path, contentType, false)
    return NextResponse.json({ url })
  } catch (err: any) {
    console.error('GET /api/upload/view error:', err)
    return NextResponse.json({ error: 'Failed to get file URL' }, { status: 500 })
  }
}
