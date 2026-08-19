export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-guard'
import { uploadFileBuffer } from '@/lib/s3'
import { runBillExtraction } from '@/lib/bills/extraction-service'
import { listActiveVendors } from '@/lib/bills/vendor-service'
import { manualReviewExtractionProvider } from '@/lib/bills/extraction-provider'
import { openaiExtractionProvider } from '@/lib/bills/openai-extraction-provider'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

// Accepts a multipart bill upload (PDF, PNG, or JPEG), stores it, and runs
// it through the Vision LLM extraction pipeline in one round trip. Returns
// a draft Bill/Vendor record for the user to confirm — this never writes
// the Bill itself; POST /api/bills persists the confirmed draft.
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireUser()
    if (error) return error

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Upload a PDF, PNG, or JPEG bill.' },
        { status: 400 }
      )
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File is too large (max 10MB).' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const [cloud_storage_path, vendors] = await Promise.all([
      uploadFileBuffer(file.name, file.type, buffer, false),
      listActiveVendors(),
    ])

    const provider = process.env.OPENAI_API_KEY ? openaiExtractionProvider : manualReviewExtractionProvider
    let draft
    try {
      draft = await runBillExtraction({ buffer, mimeType: file.type, fileName: file.name }, vendors, provider)
    } catch (extractionErr) {
      // The document is safely stored either way — if the Vision LLM call
      // itself fails (rate limit, outage, bad response), fall back to an
      // empty "needs confirmation" draft instead of failing the upload.
      console.error('Bill extraction provider error:', extractionErr)
      draft = await runBillExtraction(
        { buffer, mimeType: file.type, fileName: file.name },
        vendors,
        manualReviewExtractionProvider
      )
    }

    return NextResponse.json({ ...draft, fileUrl: cloud_storage_path })
  } catch (err: any) {
    console.error('POST /api/bills/upload error:', err)
    return NextResponse.json({ error: 'Failed to process bill upload' }, { status: 500 })
  }
}
