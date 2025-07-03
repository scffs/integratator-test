import type { FastifyPluginAsync } from 'fastify'

import env from '../config/env'

import { amoCRMService } from '../services/amo-crm/service'
import { googleSheetsService } from '../services/google-sheet/service'

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/', async (request, reply) => {
    fastify.log.info('📩 Webhook received from amoCRM')
    const body = request.body as any

    fastify.log.info('Parsed webhook data:', body)

    if (!body?.leads) {
      fastify.log.info('Webhook ignored - no leads data')
      return reply.code(200).send({ status: 'ignored' })
    }

    const leadsAdd = body.leads.add ?? []
    const leadsStatus = body.leads.status ?? []
    const leadsUpdate = body.leads.update ?? []

    const uniqueLeads = new Map<number, any>()
    ;[...leadsAdd, ...leadsStatus, ...leadsUpdate].forEach((lead) => {
      if (!uniqueLeads.has(lead.id)) {
        uniqueLeads.set(lead.id, lead)
      }
    })

    for (const [leadId, lead] of uniqueLeads) {
      try {
        const isNewLead = leadsAdd.some((l: any) => l.id === leadId)
        const isStatusChanged = leadsStatus.some((l: any) => l.id === leadId)
        const isLeadUpdated = leadsUpdate.some((l: any) => l.id === leadId)

        const isWon =
          isStatusChanged &&
          Number(lead.status_id) === env.AMOCRM_SUCCESS_STATUS_ID &&
          Number(lead.pipeline_id) === env.AMOCRM_PIPELINE_ID

        console.log(
          ' lead.status_id === env.AMOCRM_SUCCESS_STATUS_ID',
          lead.status_id === env.AMOCRM_SUCCESS_STATUS_ID,
        )
        console.log(
          ' lead.pipeline_id === env.AMOCRM_PIPELINE_ID',
          lead.pipeline_id === env.AMOCRM_PIPELINE_ID,
        )

        if (!isNewLead && !isWon && !isLeadUpdated) {
          continue
        }

        let contactName = ''
        let phone = ''
        let responsibleUser = ''
        const responsibleUserId = lead.responsible_user_id

        if (lead.contacts?.length) {
          const contactId = lead.contacts[0].id
          try {
            const contactData = await amoCRMService.fetchContactById(contactId)
            const contact = contactData._embedded?.contacts?.[0]
            contactName = contact?.name ?? ''

            const phoneField = contact?.custom_fields_values?.find(
              (field: any) => field.field_code === 'PHONE',
            )
            phone = phoneField?.values?.[0]?.value ?? ''
          } catch (err) {
            fastify.log.error(
              `Failed to fetch contact ${contactId}: ${(err as Error).message}`,
            )
          }
        }

        if (responsibleUserId) {
          try {
            const userData =
              await amoCRMService.fetchContactById(responsibleUserId)
            responsibleUser = userData.name || ''
          } catch (err) {
            fastify.log.error(
              `Failed to fetch user ${responsibleUserId}: ${(err as Error).message}`,
            )
          }
        }

        const createdAt = new Date(lead.created_at * 1000).toLocaleString(
          'ru-RU',
        )
        const isCompleted = isWon ? 'Да' : 'Нет'

        console.log('isCompleted', isCompleted)
        console.log('isWon', isWon)

        const rowData = {
          id: lead.id,
          createdAt,
          phone,
          contactName,
          responsibleUser,
          responsibleUserId,
          price: lead.price ?? 0,
          isCompleted,
        }

        await googleSheetsService.appendLeadRow(rowData)
        fastify.log.info(`Lead ${lead.id} processed successfully`)
      } catch (error) {
        fastify.log.error(
          `Error processing lead ${leadId}: ${(error as Error).message}`,
        )
      }
    }

    return reply.code(200).send({ status: 'ok' })
  })
}

export default webhookRoutes
