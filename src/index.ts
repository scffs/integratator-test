import fastifyFormbody from '@fastify/formbody'
import Fastify from 'fastify'
import qs from 'qs'

import dotenv from 'dotenv'

import env from './config/env'
import { syncBudgetService } from './jobs/sync-budget/sync-budget'
import oauthRoutes from './routes/oauth'
import webhookRoutes from './routes/webhook'

dotenv.config()

const app = Fastify({ logger: true })

app.register(fastifyFormbody, { parser: (str) => qs.parse(str) })

app.register(oauthRoutes, { prefix: '/oauth' })
app.register(webhookRoutes, { prefix: '/webhook' })

app.listen({ port: env.PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  app.log.info(`🚀 Server running at ${address}`)
})

syncBudgetService.setup()

//https://127.0.0.1:3002/oauth/login
