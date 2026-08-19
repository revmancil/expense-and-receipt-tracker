// Contract for validating Income mutations (create/update) from the Income
// modal. Implementation lands in a later step (Green stage).

export const INCOME_FREQUENCIES = ['ONE_TIME', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const
export type IncomeFrequency = (typeof INCOME_FREQUENCIES)[number]

export interface IncomeInput {
  source: string
  amount: number
  date: string
  frequency: string
  nextExpectedDate?: string | null
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validates an Income create/update payload. Must reject:
 *  - negative or zero amounts
 *  - missing/invalid `date`
 *  - `frequency` outside INCOME_FREQUENCIES
 *  - missing/blank `source`
 */
export function validateIncomeInput(_input: IncomeInput): ValidationResult {
  throw new Error('validateIncomeInput is not implemented yet')
}
