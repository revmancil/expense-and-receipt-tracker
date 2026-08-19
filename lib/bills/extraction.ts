// Normalizes raw OCR/Vision extraction payloads into a clean Bill-shaped
// record.

import { normalizeVendorName } from './vendor-match'

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

/** Best-effort extraction that never throws — every field is nullable and
 * `flaggedFields` lists which ones could not be confidently determined. */
export interface ExtractionAttempt {
  vendorName: string
  amount: number | null
  dueDate: string | null
  invoiceNumber: string | null
  rawExtractedData: RawExtractionPayload
  flaggedFields: ExtractionField[]
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

/** Below this, a provider's own confidence score for a field is untrusted. */
const CONFIDENCE_THRESHOLD = 0.5

function getConfidence(raw: RawExtractionPayload, field: string): number | undefined {
  const confidence = raw['confidence']
  if (confidence && typeof confidence === 'object') {
    const value = (confidence as Record<string, unknown>)[field]
    return typeof value === 'number' ? value : undefined
  }
  return undefined
}

function isLowConfidence(confidence: number | undefined): boolean {
  return confidence !== undefined && confidence < CONFIDENCE_THRESHOLD
}

/** Parses a currency-ish value ("$1,284.00", 84.2, ...) into a clean float. */
function parseAmount(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : null
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.\-]/g, '')
    if (!cleaned || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null
    const parsed = Number.parseFloat(cleaned)
    return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : null
  }
  return null
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

/** Parses "YYYY-MM-DD" or "MM/DD/YYYY" into strict ISO `YYYY-MM-DD`, or null. */
function parseDueDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()

  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (match) {
    const [, y, mo, d] = match
    return isValidCalendarDate(+y, +mo, +d) ? `${y}-${mo}-${d}` : null
  }

  match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
  if (match) {
    const [, mo, d, y] = match
    if (!isValidCalendarDate(+y, +mo, +d)) return null
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  return null
}

/**
 * Best-effort normalization that never throws. Use this to build a draft
 * record (e.g. for a "confirm before saving" UI) — `flaggedFields` marks
 * which fields need the user's confirmation.
 */
export function tryNormalizeExtractedBill(raw: RawExtractionPayload): ExtractionAttempt {
  const flaggedFields: ExtractionField[] = []

  const amount = parseAmount(raw['amount_due'])
  if (amount === null || isLowConfidence(getConfidence(raw, 'amount_due'))) {
    flaggedFields.push('amount')
  }

  const dueDate = parseDueDate(raw['due_date'])
  if (dueDate === null || isLowConfidence(getConfidence(raw, 'due_date'))) {
    flaggedFields.push('dueDate')
  }

  const vendorNameRaw = typeof raw['vendor_name'] === 'string' ? (raw['vendor_name'] as string) : ''
  const vendorName = normalizeVendorName(vendorNameRaw)
  if (!vendorNameRaw.trim() || isLowConfidence(getConfidence(raw, 'vendor_name'))) {
    flaggedFields.push('vendorName')
  }

  const invoiceNumberRaw = raw['invoice_number']
  const invoiceNumber =
    typeof invoiceNumberRaw === 'string' && invoiceNumberRaw.trim() ? invoiceNumberRaw.trim() : null

  return { vendorName, amount, dueDate, invoiceNumber, rawExtractedData: raw, flaggedFields }
}

/**
 * Normalizes a raw OCR/vision extraction payload into a NormalizedExtraction.
 * Throws ExtractionError('amount' | 'dueDate') when that field cannot be
 * confidently determined (missing, unparseable, or low-confidence OCR).
 */
export function normalizeExtractedBill(raw: RawExtractionPayload): NormalizedExtraction {
  const attempt = tryNormalizeExtractedBill(raw)

  if (attempt.flaggedFields.includes('amount')) {
    throw new ExtractionError(
      'amount',
      'Amount could not be confidently determined from the extraction payload'
    )
  }
  if (attempt.flaggedFields.includes('dueDate')) {
    throw new ExtractionError(
      'dueDate',
      'Due date could not be confidently determined from the extraction payload'
    )
  }

  return {
    vendorName: attempt.vendorName,
    amount: attempt.amount as number,
    dueDate: attempt.dueDate as string,
    invoiceNumber: attempt.invoiceNumber,
    rawExtractedData: attempt.rawExtractedData,
  }
}
