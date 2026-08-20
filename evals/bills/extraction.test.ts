import { describe, expect, it } from 'vitest'
import {
  ExtractionError,
  normalizeExtractedBill,
  type RawExtractionPayload,
} from '@/lib/bills/extraction'

// Mock OCR/Vision payloads, standing in for real document-AI output until
// the extraction pipeline is wired up.

/** A clean, well-structured utility bill parsed by a high-confidence OCR pass. */
const STANDARD_UTILITY_BILL: RawExtractionPayload = {
  vendor_name: '  pacific gas & electric  ',
  amount_due: '$142.50',
  due_date: '03/05/2026',
  invoice_number: 'INV-88213',
  confidence: { amount_due: 0.98, due_date: 0.97, vendor_name: 0.95 },
}

/** A handwritten receipt: messy OCR, no year on the date, low confidence. */
const HANDWRITTEN_RECEIPT: RawExtractionPayload = {
  vendor_name: "joe's plumbing",
  amount_due: '84.20',
  due_date: '5 Mar',
  confidence: { amount_due: 0.72, due_date: 0.31, vendor_name: 0.55 },
}

/** A malformed PDF text-extraction: table columns collapsed, amount lost. */
const MALFORMED_PDF_OUTPUT: RawExtractionPayload = {
  vendor_name: 'globex   utilities   corp',
  amount_due: null,
  due_date: '2026-03-05',
  raw_text: 'Qty Desc Amount ---garbled table---',
  confidence: { amount_due: 0.0, due_date: 0.9, vendor_name: 0.4 },
}

describe('normalizeExtractedBill', () => {
  it('normalizes a standard utility bill payload', () => {
    const result = normalizeExtractedBill(STANDARD_UTILITY_BILL)

    expect(result.dueDate).toBe('2026-03-05')
    expect(result.amount).toBeCloseTo(142.5, 2)
    expect(result.vendorName).toBe('Pacific Gas & Electric')
    expect(result.invoiceNumber).toBe('INV-88213')
    expect(result.rawExtractedData).toEqual(STANDARD_UTILITY_BILL)
  })

  it('parses amount as a clean float, stripping currency symbols/commas', () => {
    const payload: RawExtractionPayload = {
      ...STANDARD_UTILITY_BILL,
      amount_due: '$1,284.00',
    }
    const result = normalizeExtractedBill(payload)
    expect(result.amount).toBe(1284)
    expect(typeof result.amount).toBe('number')
  })

  it('title-cases and trims vendor name whitespace', () => {
    const payload: RawExtractionPayload = {
      ...STANDARD_UTILITY_BILL,
      vendor_name: '   ACME   power & light   ',
    }
    const result = normalizeExtractedBill(payload)
    expect(result.vendorName).toBe('Acme Power & Light')
  })

  it('throws ExtractionError on the dueDate field for a low-confidence handwritten receipt', () => {
    expect.assertions(2)
    try {
      normalizeExtractedBill(HANDWRITTEN_RECEIPT)
    } catch (err) {
      expect(err).toBeInstanceOf(ExtractionError)
      expect((err as ExtractionError).field).toBe('dueDate')
    }
  })

  it('throws ExtractionError on the amount field when a malformed PDF drops the amount', () => {
    expect.assertions(2)
    try {
      normalizeExtractedBill(MALFORMED_PDF_OUTPUT)
    } catch (err) {
      expect(err).toBeInstanceOf(ExtractionError)
      expect((err as ExtractionError).field).toBe('amount')
    }
  })

  it('throws ExtractionError rather than returning a guessed due date', () => {
    const payload: RawExtractionPayload = {
      ...STANDARD_UTILITY_BILL,
      due_date: 'sometime next week',
    }
    expect(() => normalizeExtractedBill(payload)).toThrow(ExtractionError)
  })
})
