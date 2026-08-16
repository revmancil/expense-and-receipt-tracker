export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { generatePresignedUploadUrl } from '@/lib/s3'
import { requireUser } from '@/lib/auth-guard'

const ALLOWED = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/pdf',
]

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireUser()
    if (error) return error
    const body = await request?.json?.()
    const { fileName, contentType } = body ?? {}
    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'Missing fileName or contentType' }, { status: 400 })
    }
    if (!ALLOWED.includes(contentType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Upload an image or PDF receipt.' },
        { status: 400 }
      )
    }
    // Receipts are private financial documents -> signed access only.
    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      fileName,
      contentType,
      false
    )
    return NextResponse.json({ uploadUrl, cloud_storage_path })
  } catch (err: any) {
    console.error('POST /api/upload/presigned error:', err)
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
  }
}
