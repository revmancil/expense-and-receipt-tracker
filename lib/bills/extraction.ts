// Contract for normalizing raw OCR/Vision extraction payloads into a clean
// Bill-shaped record. Implementation lands in a later step (Green stage).

/** Unmodified shape of whatever the OCR/vision provider hands back. */
export type RawExtractionPayload = Record<string, unknown>

export type ExtractionField = 'amount' | 'dueDate' | 'vendorName'

/** A single extracted record, normalized for storage on `Bill`. */
export interface NormalizedExtraction {
  vendorName: string
  /** Clean decimal amount, e.g. 84.23 */
  amount: number
  /** ISO 8601 calendar date, e.g. "2026-03-05" */
  dueDate: string
  invoiceNumber: string | null
  /** The untouched input payload, for audit + reprocessing (-> Bill.rawExtractedData). */
  rawExtractedData: RawExtractionPayload
}

/**
 * Raised when a required field (amount or dueDate) cannot be confidently
 * determined from the extraction payload.
 */
export class ExtractionError extends Error {
  constructor(
    public readonly field: ExtractionField,
    message: string
  ) {
    super(message)
    this.name = 'ExtractionError'
  }
}

/**
 * Normalizes a raw OCR/vision extraction payload into a NormalizedExtraction.
 *
 * Must:
 *  - Convert whatever date format is present into strict ISO `YYYY-MM-DD`.
 *  - Parse amount into a clean float/decimal (strip currency symbols, commas).
 *  - Normalize vendor name (trim whitespace, title case).
 *  - Throw ExtractionError('amount' | 'dueDate') when that field cannot be
 *    confidently determined (missing, unparseable, or low-confidence OCR).
 */
export function normalizeExtractedBill(_raw: RawExtractionPayload): NormalizedExtraction {
  throw new Error('normalizeExtractedBill is not implemented yet')
}
