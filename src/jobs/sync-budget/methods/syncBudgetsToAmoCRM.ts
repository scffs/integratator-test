import env from '../../../config/env'
import { amoCRMService } from '../../../services/amo-crm/service'

import type { SyncBudgetService } from '../sync-budget'

export async function syncBudgetsToAmoCRM(this: SyncBudgetService) {
  try {
    const range = `Лист1!A${this.lastProcessedRow + 1}:H`

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: env.GOOGLE_SHEET_ID,
      range,
    })

    const rows = response.data.values
    if (!rows || rows.length === 0) return

    for (const row of rows) {
      const [leadId, , , , , , budget] = row

      if (budget && budget !== '' && !Number.isNaN(Number(budget))) {
        try {
          await amoCRMService.updateLeadBudget(Number(leadId), Number(budget))
          console.log(`Updated lead ${leadId} with budget ${budget}`)
        } catch (error) {
          console.error(`Failed to update lead ${leadId}:`, error)
        }
      }

      this.lastProcessedRow++
    }
  } catch (error) {
    console.error('Sync error:', error)
  }
}
