// Derives the calendar-facing status of a bill. The stored `status` column
// is the source of truth for PAID; PENDING vs OVERDUE is computed relative
// to "now" so bills don't need a background job to flip state as they age.

export type BillDisplayStatus = 'PENDING' | 'PAID' | 'OVERDUE'

export function computeDisplayStatus(
  bill: { status: string; dueDate: Date },
  now: Date = new Date()
): BillDisplayStatus {
  if (bill.status === 'PAID') return 'PAID'
  return bill.dueDate.getTime() < now.getTime() ? 'OVERDUE' : 'PENDING'
}
