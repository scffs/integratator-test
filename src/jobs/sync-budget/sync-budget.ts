import cron from 'node-cron'

import { GoogleSheetsService } from '../../services/google-sheet/service'

import { syncBudgetsToAmoCRM } from './methods/syncBudgetsToAmoCRM'

export class SyncBudgetService extends GoogleSheetsService {
  protected lastProcessedRow = 0

  syncBudgetsToAmoCRM = syncBudgetsToAmoCRM

  async setup() {
    cron.schedule('*/5 * * * * *', async () => {
      console.log(new Date().toISOString(), 'Running budget sync...')
      try {
        await this.syncBudgetsToAmoCRM()
        console.log(new Date().toISOString(), 'Budget sync completed')
      } catch (error) {
        console.error(new Date().toISOString(), 'Budget sync error:', error)
      }
    })
  }
}

export const syncBudgetService = new SyncBudgetService()
