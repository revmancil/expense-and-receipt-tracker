// Validates Income mutations (create/update) from the Income modal, and
// projects the next expected occurrence for recurring income.

import { clampDayToMonth } from './calendar'

export const INCOME_FREQUENCIES = ['ONE_TIME', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const
export type IncomeFrequency = (typeof INCOME_FREQUENCIES)[number]

export interface IncomeInput {
  source: string
  amount: number
  date: string
  frequency: string
  nextExpectedDate?: string | null
  notes?: string | null
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validates an Income create/update payload. Rejects:
 *  - negative or zero amounts
 *  - missing/invalid `date`
 *  - `frequency` outside INCOME_FREQUENCIES
 *  - missing/blank `source`
 */
export function validateIncomeInput(input: IncomeInput): ValidationResult {
  const errors: string[] = []

  if (typeof input.source !== 'string' || input.source.trim().length === 0) {
    errors.push('Source is required')
  }

  if (typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount <= 0) {
    errors.push('Amount must be a positive number')
  }

  if (
    typeof input.date !== 'string' ||
    input.date.trim().length === 0 ||
    Number.isNaN(Date.parse(input.date))
  ) {
    errors.push('Date is required and must be a valid date')
  }

  if (!INCOME_FREQUENCIES.includes(input.frequency as IncomeFrequency)) {
    errors.push(`Frequency must be one of: ${INCOME_FREQUENCIES.join(', ')}`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Projects the next occurrence of a recurring income entry from its most
 * recent `date`. Returns null for ONE_TIME income (there is no "next").
 */
export function computeNextExpectedDate(date: Date, frequency: IncomeFrequency): Date | null {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()

  switch (frequency) {
    case 'ONE_TIME':
      return null
    case 'WEEKLY':
      return new Date(Date.UTC(year, month, day + 7))
    case 'BIWEEKLY':
      return new Date(Date.UTC(year, month, day + 14))
    case 'MONTHLY':
      return new Date(Date.UTC(year, month + 1, clampDayToMonth(year, month + 1, day)))
  }
}
