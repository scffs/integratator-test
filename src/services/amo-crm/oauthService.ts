import fetch from 'node-fetch'
import fs from 'node:fs'
import path from 'node:path'
import env from '../../config/env'

interface TokenData {
  access_token: string
  refresh_token: string
  expires_in: number
  obtained_at: number
}

interface AuthResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type?: string
}

const TOKEN_FILE = path.join(__dirname, 'token.json')

console.log('TOKEN_FILE', TOKEN_FILE)

class OAuthService {
  private tokenData: TokenData | null = null

  constructor() {
    this.loadToken()
  }

  private loadToken() {
    try {
      if (fs.existsSync(TOKEN_FILE)) {
        const data = fs.readFileSync(TOKEN_FILE, 'utf-8')
        this.tokenData = JSON.parse(data) as TokenData
        console.log('Token loaded from file')
      }
    } catch (error) {
      console.error('Failed to load token:', error)
    }
  }

  private saveToken() {
    try {
      if (this.tokenData) {
        fs.writeFileSync(TOKEN_FILE, JSON.stringify(this.tokenData), 'utf-8')
      }
    } catch (error) {
      console.error('Failed to save token:', error)
    }
  }

  getAccessToken(): string | null {
    if (!this.tokenData) {
      console.error('No token data available')
      return null
    }

    const expiresAt = this.tokenData.obtained_at + this.tokenData.expires_in * 1000
    if (Date.now() > expiresAt - 60000) {
      console.log('Access token expired or about to expire')
      return null
    }
    return this.tokenData.access_token
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.tokenData?.refresh_token) {
      throw new Error('No refresh token available. Please re-authenticate.')
    }

    try {
      const response = await fetch('https://www.amocrm.ru/oauth2/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: env.AMOCRM_CLIENT_ID,
          client_secret: env.AMOCRM_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: this.tokenData.refresh_token,
          redirect_uri: env.AMOCRM_REDIRECT_URI,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.statusText}`)
      }

      const data = (await response.json()) as AuthResponse
      this.tokenData = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        obtained_at: Date.now(),
      }

      this.saveToken()
      console.log('Token successfully refreshed')
      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      throw error
    }
  }

  async setTokenWithCode(code: string): Promise<boolean> {
    try {
      const response = await fetch('https://www.amocrm.ru/oauth2/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: env.AMOCRM_CLIENT_ID,
          client_secret: env.AMOCRM_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: env.AMOCRM_REDIRECT_URI,
        }),
      })

      console.log('response', response.status)
      console.log('response', response.statusText)
      console.log('response', response.body)

      if (!response.ok) {
        throw new Error(`Failed to get token: ${response.statusText}`)
      }

      const data = (await response.json()) as AuthResponse
      this.tokenData = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        obtained_at: Date.now(),
      }

      this.saveToken()
      console.log('Token successfully obtained')
      return true
    } catch (error) {
      console.error('Failed to obtain token:', error)
      throw error
    }
  }

  async ensureValidToken(): Promise<string> {
    const token = this.getAccessToken()
    if (!token) {
      await this.refreshAccessToken()
      if (!this.tokenData?.access_token) {
        throw new Error('Failed to obtain valid access token')
      }
      return this.tokenData.access_token
    }
    return token
  }
}

export const oauthService = new OAuthService()