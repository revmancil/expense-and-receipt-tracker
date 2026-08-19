// Document extraction service: sends a bill/invoice image or PDF to a
// multimodal Vision LLM (OpenAI GPT-4o-mini) and gets back strictly
// schema-validated structured data via OpenAI Structured Outputs.

import OpenAI from 'openai'
import { z } from 'zod'
import { zodTextFormat } from 'openai/helpers/zod'
import { BILL_CATEGORIES } from '@/lib/bills/category'

export const BillExtractionSchema = z.object({
  /** Clean, normalized company name (trimmed, title-cased). */
  vendorName: z.string(),
  /** Final amount due, as a plain decimal number (no currency symbols). */
  amountDue: z.number(),
  /** Strict ISO 8601 `YYYY-MM-DD`, or null if the due date is ambiguous/absent. */
  dueDate: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  category: z.enum(BILL_CATEGORIES),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
})

export type BillExtraction = z.infer<typeof BillExtractionSchema>

export interface ExtractDocumentInput {
  /** Raw base64 payload — no `data:...;base64,` prefix. */
  base64: string
  /** e.g. "image/png", "image/jpeg", or "application/pdf". */
  mimeType: string
  fileName?: string
}

const SYSTEM_PROMPT = `You are a bill and invoice data-extraction assistant. You are shown one page \
of a bill, invoice, or receipt (as an image or PDF) and must extract structured data from it.

Rules:
- vendorName: the company/organization that issued the bill, cleaned up (trim whitespace, \
title case). Use the billing entity, not a payment processor mentioned in passing.
- amountDue: extract the FINAL balance/amount the recipient must pay now — usually labeled \
"Amount Due", "Total Due", "Balance Due", or "New Charges Total". Ignore historical or \
previous-cycle balances (e.g. "Previous Balance", "Last Statement Balance") unless that is the \
only figure present.
- dueDate: the actual "Due Date" / "Payment Due By" date — this is NOT the same as the \
"Statement Date", "Invoice Date", or "Billing Date", which are when the document was issued, \
not when payment is owed. Carefully distinguish these. Return it as strict ISO 8601 \
YYYY-MM-DD. If the due date is missing, unclear, or ambiguous (e.g. no year, conflicting \
dates, or you are not confident which date is the due date), return null rather than guessing.
- invoiceNumber: the invoice/account/reference number if present, else null.
- category: classify the bill as one of UTILITIES, SUBSCRIPTION, RENT_MORTGAGE, INSURANCE, or \
OTHER, based on the vendor and line items.
- confidence: your overall confidence in this extraction — HIGH if every field above was \
clearly and unambiguously stated on the document, MEDIUM if you had to infer something minor, \
LOW if the document is unclear, low quality, or you are guessing at any required field.`

let cachedClient: OpenAI | null = null

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey })
  }
  return cachedClient
}

function toDataUrl(mimeType: string, base64: string): string {
  return `data:${mimeType};base64,${base64}`
}

/**
 * Extracts structured bill data from a single document page (image or PDF)
 * using GPT-4o-mini with OpenAI Structured Outputs, which guarantees the
 * response validates against BillExtractionSchema.
 */
export async function extractBillFromDocument(input: ExtractDocumentInput): Promise<BillExtraction> {
  const client = getClient()
  const dataUrl = toDataUrl(input.mimeType, input.base64)

  const fileContent =
    input.mimeType === 'application/pdf'
      ? ({ type: 'input_file', filename: input.fileName || 'document.pdf', file_data: dataUrl } as const)
      : ({ type: 'input_image', image_url: dataUrl, detail: 'high' } as const)

  const response = await client.responses.parse({
    model: 'gpt-4o-mini',
    instructions: SYSTEM_PROMPT,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: 'Extract the bill data from this document.' },
          fileContent,
        ],
      },
    ],
    text: { format: zodTextFormat(BillExtractionSchema, 'bill_extraction') },
  })

  if (!response.output_parsed) {
    throw new Error('Model did not return a parsed structured extraction')
  }
  return response.output_parsed
}
