// Pluggable OCR/Vision backend for the bill-extraction pipeline.
//
// No OCR/vision API key is configured in this environment, so the default
// provider below returns every field at zero confidence, which routes the
// upload through the "needs review" path (see lib/bills/extraction-service.ts)
// instead of fabricating numbers. Swap in a real backend (AWS Textract,
// a vision-capable LLM, etc.) by implementing ExtractionProvider and passing
// it into runBillExtraction().

import type { RawExtractionPayload } from './extraction'

export interface ExtractionInput {
  buffer: Buffer
  mimeType: string
  fileName: string
}

export interface ExtractionProvider {
  extract(input: ExtractionInput): Promise<RawExtractionPayload>
}

export const manualReviewExtractionProvider: ExtractionProvider = {
  async extract({ fileName }) {
    return {
      vendor_name: null,
      amount_due: null,
      due_date: null,
      invoice_number: null,
      source_file_name: fileName,
      confidence: { amount_due: 0, due_date: 0, vendor_name: 0 },
    }
  },
}
