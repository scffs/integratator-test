import type { FastifyPluginAsync } from 'fastify'
import env from '../config/env'
import { oauthService } from '../services/amo-crm/oauthService'

const oauth: FastifyPluginAsync = async (fastify) => {
  fastify.get('/login', async (_request, reply) => {
    const url = new URL('https://www.amocrm.ru/oauth')
    url.searchParams.set('client_id', env.AMOCRM_CLIENT_ID)
    url.searchParams.set('redirect_uri', env.AMOCRM_REDIRECT_URI)
    url.searchParams.set('response_type', 'code')
    // url.searchParams.set('state', 'state')

    return reply.redirect(url.toString())
  })

  fastify.get('/callback', async (request, reply) => {
    const query = request.query as {
      code?: string
      state?: string
      error?: string
    }
    if (query.error) {
      return reply.status(400).send({ error: query.error })
    }
    if (!query.code) {
      return reply.status(400).send({ error: 'No code provided' })
    }

    try {
      await oauthService.setTokenWithCode(query.code)
      return reply.send('OAuth успешен! Токены сохранены.')
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message })
    }
  })
}

export default oauth
