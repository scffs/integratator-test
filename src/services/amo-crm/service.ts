import { oauthService } from './oauthService'

import env from '../../config/env'

export class AmoCRMService {
  private lastRequestTime = 0
  private readonly REQUEST_DELAY = 500

  async getAuthHeader() {
    try {
      const accessToken = await oauthService.ensureValidToken();
      if (!accessToken) {
        throw new Error('Failed to obtain valid access token');
      }
      return `Bearer ${accessToken}`;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  async fetchContactById(contactId: number) {
    const url = `https://${env.AMOCRM_DOMAIN}/api/v4/contacts/${contactId}`
    const authHeader = await this.getAuthHeader()

    const response = await fetch(url, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(
        `Failed to fetch contact ${contactId}: ${response.statusText}`,
      )
    }

    return response.json()
  }

  async updateLeadBudget(leadId: number, budget: number): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < this.REQUEST_DELAY) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.REQUEST_DELAY - timeSinceLastRequest),
      )
    }

    try {
      const url = `https://${env.AMOCRM_DOMAIN}/api/v4/leads/${leadId}`
      const authHeader = await this.getAuthHeader()

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ price: budget }),
      })

      this.lastRequestTime = Date.now()

      if (response.status === 429) {
        const retryAfter = Number.parseInt(
          response.headers.get('Retry-After') || '10',
        )
        console.log(`Rate limited, retrying after ${retryAfter} seconds`)
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
        return this.updateLeadBudget(leadId, budget)
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      console.error(`Failed to update lead ${leadId}:`, error)
      throw error
    }
  }
}

export const amoCRMService = new AmoCRMService()
