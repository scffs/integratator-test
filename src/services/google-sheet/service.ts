import { google } from 'googleapis'
import env from '../../config/env'

export interface DataRow {
  id: number
  createdAt: string
  phone: string
  contactName: string
  responsibleUser: string
  responsibleUserId: number
  price?: number
  isCompleted: string
}

export class GoogleSheetsService {
  private readonly auth
  protected readonly sheets

  constructor() {
    this.auth = new google.auth.GoogleAuth({
      keyFile: env.GOOGLE_CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    this.sheets = google.sheets({ version: 'v4', auth: this.auth })
  }

  async appendLeadRow(data: DataRow) {
    try {
      const existingRow = await this.findLeadRow(data.id)

      console.log('existingRow', existingRow)

      if (existingRow) {
        await this.updateLeadRow(data, existingRow)
      } else {
        await this.addNewLeadRow(data)
      }
    } catch (err) {
      console.error('Error in appendLeadRow:', err)
      throw err
    }
  }

  private async findLeadRow(leadId: number): Promise<number | null> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: env.GOOGLE_SHEET_ID,
      range: 'Лист1!A:A',
    })

    const rows = response.data.values
    if (!rows) return null

    for (let i = 0; i < rows.length; i++) {
      if (Number(rows[i][0]) === Number(leadId)) {
        return i + 1
      }
    }

    return null
  }

  private async addNewLeadRow(data: DataRow) {
    const {
      id,
      createdAt,
      phone,
      contactName,
      responsibleUser,
      responsibleUserId,
      price,
      isCompleted,
    } = data

    const row = [
      id,
      createdAt,
      phone,
      contactName,
      responsibleUser,
      responsibleUserId,
      price ?? '',
      isCompleted,
    ]

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: env.GOOGLE_SHEET_ID,
      range: 'Лист1!A:H',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row],
      },
    })
  }

  private async updateLeadRow(data: DataRow, rowNumber: number) {
    const {
      id,
      createdAt,
      phone,
      contactName,
      responsibleUser,
      responsibleUserId,
      price,
      isCompleted,
    } = data

    const row = [
      id,
      createdAt,
      phone,
      contactName,
      responsibleUser,
      responsibleUserId,
      price ?? '',
      isCompleted,
    ]

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: env.GOOGLE_SHEET_ID,
      range: `Лист1!A${rowNumber}:H${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    })
  }
}

export const googleSheetsService = new GoogleSheetsService()
