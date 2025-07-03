import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  GOOGLE_SHEET_ID: z.string().min(1),
  GOOGLE_CREDENTIALS_PATH: z.string().min(1),

  AMOCRM_DOMAIN: z.string().min(1),
  AMOCRM_CLIENT_ID: z.string().min(1),
  AMOCRM_CLIENT_SECRET: z.string().min(1),
  AMOCRM_REDIRECT_URI: z.string().url(),

  AMOCRM_SUCCESS_STATUS_ID: z.coerce.number().int().positive(),
  AMOCRM_PIPELINE_ID: z.coerce.number().int().positive(),
})

const envParseResult = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,

  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
  GOOGLE_CREDENTIALS_PATH: process.env.GOOGLE_CREDENTIALS_PATH,

  AMOCRM_DOMAIN: process.env.AMOCRM_DOMAIN?.replace(/^https?:\/\//, ''),
  AMOCRM_CLIENT_ID: process.env.AMOCRM_CLIENT_ID,
  AMOCRM_CLIENT_SECRET: process.env.AMOCRM_CLIENT_SECRET,
  AMOCRM_REDIRECT_URI: process.env.AMOCRM_REDIRECT_URI,

  AMOCRM_SUCCESS_STATUS_ID: process.env.AMOCRM_SUCCESS_STATUS_ID,
  AMOCRM_PIPELINE_ID: process.env.AMOCRM_PIPELINE_ID,
})

if (!envParseResult.success) {
  console.error('.env error:')
  envParseResult.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
  })
  process.exit(1)
}

export default envParseResult.data
