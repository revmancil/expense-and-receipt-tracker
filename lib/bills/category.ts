// Shared bill/vendor category enum — kept dependency-free so both the
// server-side extraction service and client components can import it.

export const BILL_CATEGORIES = [
  'UTILITIES',
  'SUBSCRIPTION',
  'RENT_MORTGAGE',
  'INSURANCE',
  'OTHER',
] as const

export type BillCategory = (typeof BILL_CATEGORIES)[number]

export const BILL_CATEGORY_LABELS: Record<BillCategory, string> = {
  UTILITIES: 'Utilities',
  SUBSCRIPTION: 'Subscription',
  RENT_MORTGAGE: 'Rent / Mortgage',
  INSURANCE: 'Insurance',
  OTHER: 'Other',
}
