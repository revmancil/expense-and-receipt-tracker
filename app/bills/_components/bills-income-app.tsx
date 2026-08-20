'use client'

import { useCallback, useState } from 'react'
import BillUploadZone from './bill-upload-zone'
import IncomeModal from './income-modal'
import BillsCalendar from './bills-calendar'

export default function BillsIncomeApp() {
  // Bumping this re-triggers the calendar's fetch after a bill/income mutation.
  const [refreshToken, setRefreshToken] = useState(0)
  const refresh = useCallback(() => setRefreshToken((t) => t + 1), [])

  return (
    <div className="mt-8 space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <BillUploadZone onBillCreated={refresh} />
        <div className="flex lg:justify-end">
          <IncomeModal onIncomeAdded={refresh} />
        </div>
      </div>
      <BillsCalendar refreshToken={refreshToken} />
    </div>
  )
}
