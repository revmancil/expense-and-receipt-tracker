export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-guard'
import { getFileBuffer } from '@/lib/s3'
import { runBillExtraction } from '@/lib/bills/extraction-service'
import { listActiveVendors } from '@/lib/bills/vendor-service'

// Runs a previously-uploaded document through the extraction pipeline and
// returns a draft Bill/Vendor record for the user to confirm — this never
// writes to the database; POST /api/bills persists the confirmed draft.
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireUser()
    if (error) return error

    const body = await request?.json?.()
    const { cloud_storage_path, fileName } = body ?? {}
    if (typeof cloud_storage_path !== 'string' || !cloud_storage_path) {
      return NextResponse.json({ error: 'Missing cloud_storage_path' }, { status: 400 })
    }

    const { buffer, contentType } = await getFileBuffer(cloud_storage_path)
    const vendors = await listActiveVendors()

    const draft = await runBillExtraction(
      { buffer, mimeType: contentType, fileName: typeof fileName === 'string' ? fileName : '' },
      vendors
    )

    return NextResponse.json({ ...draft, fileUrl: cloud_storage_path })
  } catch (err: any) {
    console.error('POST /api/bills/extract error:', err)
    return NextResponse.json({ error: 'Failed to extract bill' }, { status: 500 })
  }
}
