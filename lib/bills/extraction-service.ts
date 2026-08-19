// Orchestrates one document upload through extraction, normalization, and
// vendor resolution into a draft the user confirms before it becomes a Bill.

import {
  tryNormalizeExtractedBill,
  type ExtractionField,
  type RawExtractionPayload,
} from './extraction'
import { resolveVendor, type VendorRecord, type VendorResolution } from './vendor-match'
import {
  manualReviewExtractionProvider,
  type ExtractionInput,
  type ExtractionProvider,
} from './extraction-provider'

export interface BillDraft {
  vendorName: string
  amount: number | null
  dueDate: string | null
  invoiceNumber: string | null
  rawExtractedData: RawExtractionPayload
  /** Fields the extractor could not confidently determine — user must confirm/fill these. */
  flaggedFields: ExtractionField[]
  /** False when every required field was extracted with high confidence. */
  needsConfirmation: boolean
  vendorResolution: VendorResolution | null
}

export async function runBillExtraction(
  input: ExtractionInput,
  existingVendors: VendorRecord[],
  provider: ExtractionProvider = manualReviewExtractionProvider
): Promise<BillDraft> {
  const raw = await provider.extract(input)
  const attempt = tryNormalizeExtractedBill(raw)

  const vendorResolution =
    attempt.vendorName.trim().length > 0 ? resolveVendor(attempt.vendorName, existingVendors) : null

  return {
    vendorName: attempt.vendorName,
    amount: attempt.amount,
    dueDate: attempt.dueDate,
    invoiceNumber: attempt.invoiceNumber,
    rawExtractedData: attempt.rawExtractedData,
    flaggedFields: attempt.flaggedFields,
    needsConfirmation: attempt.flaggedFields.length > 0,
    vendorResolution,
  }
}
