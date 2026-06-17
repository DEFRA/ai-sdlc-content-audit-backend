import Joi from 'joi'

import {
  clearAllFeedback,
  findAllFeedback,
  saveFeedback
} from '#/services/feedback.js'

const CHOICES = ['INTERESTED', 'NOT_INTERESTED', 'AI_MISTAKE']

const payloadSchema = Joi.object({
  propositionMatchId: Joi.number().integer().required(),
  categoryId: Joi.number().integer().required(),
  pageId: Joi.number().integer().required(),
  currentStatus: Joi.string().required(),
  choice: Joi.string()
    .valid(...CHOICES)
    .required(),
  comment: Joi.string().allow('', null).max(1000).default(null)
})

export const feedback = [
  {
    method: 'POST',
    path: '/feedback',
    options: { validate: { payload: payloadSchema } },
    handler: async (request, h) => {
      const entry = await saveFeedback(request.db, request.payload)
      return h.response(entry).code(201)
    }
  },
  {
    method: 'GET',
    path: '/feedback',
    handler: async (request, h) => {
      const entries = await findAllFeedback(request.db)
      return h.response(entries)
    }
  },
  {
    method: 'DELETE',
    path: '/feedback',
    handler: async (request, h) => {
      await clearAllFeedback(request.db)
      return h.response().code(204)
    }
  }
]
