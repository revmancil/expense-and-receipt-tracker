// Adapts the OpenAI GPT-4o-mini extraction service (services/extractor.ts)
// to the ExtractionProvider seam defined in extraction-provider.ts, so real
// Vision LLM output flows through the same tested normalization pipeline
// (lib/bills/extraction.ts) as every other provider.

import { extractBillFromDocument, type BillExtraction } from '@/services/extractor'
import type { RawExtractionPayload } from './extraction'
import type { ExtractionInput, ExtractionProvider } from './extraction-provider'

const CONFIDENCE_SCORE: Record<BillExtraction['confidence'], number> = {
  HIGH: 0.95,
  MEDIUM: 0.65,
  LOW: 0.2,
}

export const openaiExtractionProvider: ExtractionProvider = {
  async extract(input: ExtractionInput): Promise<RawExtractionPayload> {
    const result = await extractBillFromDocument({
      base64: input.buffer.toString('base64'),
      mimeType: input.mimeType,
      fileName: input.fileName,
    })

    const fieldConfidence = CONFIDENCE_SCORE[result.confidence]

    return {
      vendor_name: result.vendorName,
      amount_due: result.amountDue,
      due_date: result.dueDate,
      invoice_number: result.invoiceNumber,
      category: result.category,
      confidence: {
        vendor_name: fieldConfidence,
        amount_due: fieldConfidence,
        // A null due date already means "the model wasn't confident enough
        // to state one" per the extraction prompt — reflect that directly
        // rather than letting a HIGH overall score mask it.
        due_date: result.dueDate === null ? 0 : fieldConfidence,
      },
    }
  },
}
