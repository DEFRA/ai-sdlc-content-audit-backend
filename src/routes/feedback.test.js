describe('#feedback routes', () => {
  let server

  const validPayload = {
    propositionMatchId: 7,
    categoryId: 1,
    pageId: 42,
    currentStatus: 'CONFLICTS',
    choice: 'INTERESTED',
    comment: 'looks worth following up'
  }

  beforeAll(async () => {
    const { createServer } = await import('#/server.js')
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 1000 })
  })

  beforeEach(async () => {
    await server.db.collection('feedback').deleteMany({})
  })

  describe('POST /feedback', () => {
    test('stores a new entry with server-set submittedAt and updatedAt', async () => {
      const before = Math.floor(Date.now() / 1000)

      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: validPayload
      })

      expect(statusCode).toBe(201)
      expect(result).toMatchObject({
        propositionMatchId: 7,
        categoryId: 1,
        pageId: 42,
        currentStatus: 'CONFLICTS',
        choice: 'INTERESTED',
        comment: 'looks worth following up'
      })
      expect(result.submittedAt).toBeGreaterThanOrEqual(before)
      expect(result.updatedAt).toBeGreaterThanOrEqual(result.submittedAt)
    })

    test('upserts an existing entry, preserving submittedAt and refreshing updatedAt', async () => {
      const first = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: validPayload
      })
      const originalSubmittedAt = first.result.submittedAt

      // Advance the clock past whole-second resolution so updatedAt can move.
      await new Promise((resolve) => setTimeout(resolve, 1100))

      const second = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: {
          ...validPayload,
          choice: 'AI_MISTAKE',
          comment: 'changed my mind'
        }
      })

      expect(second.statusCode).toBe(201)
      expect(second.result.submittedAt).toBe(originalSubmittedAt)
      expect(second.result.updatedAt).toBeGreaterThan(originalSubmittedAt)
      expect(second.result.choice).toBe('AI_MISTAKE')
      expect(second.result.comment).toBe('changed my mind')

      const count = await server.db.collection('feedback').countDocuments()
      expect(count).toBe(1)
    })

    test('rejects an unknown choice', async () => {
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: { ...validPayload, choice: 'NOPE' }
      })
      expect(statusCode).toBe(400)
    })

    test('rejects a missing required field', async () => {
      const { propositionMatchId: _drop, ...rest } = validPayload
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: rest
      })
      expect(statusCode).toBe(400)
    })

    test('stores an empty comment as null', async () => {
      const { result } = await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: { ...validPayload, comment: '' }
      })
      expect(result.comment).toBeNull()
    })
  })

  describe('GET /feedback', () => {
    test('returns all stored entries newest-first', async () => {
      await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: { ...validPayload, propositionMatchId: 1 }
      })
      await new Promise((resolve) => setTimeout(resolve, 1100))
      await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: { ...validPayload, propositionMatchId: 2 }
      })

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/feedback'
      })

      expect(statusCode).toBe(200)
      expect(result).toHaveLength(2)
      expect(result[0].propositionMatchId).toBe(2)
      expect(result[1].propositionMatchId).toBe(1)
      expect(result[0]).not.toHaveProperty('_id')
    })

    test('returns an empty array when nothing has been stored', async () => {
      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/feedback'
      })

      expect(statusCode).toBe(200)
      expect(result).toEqual([])
    })
  })

  describe('DELETE /feedback', () => {
    test('removes all entries and returns 204', async () => {
      await server.inject({
        method: 'POST',
        url: '/feedback',
        payload: validPayload
      })

      const { statusCode } = await server.inject({
        method: 'DELETE',
        url: '/feedback'
      })

      expect(statusCode).toBe(204)
      const count = await server.db.collection('feedback').countDocuments()
      expect(count).toBe(0)
    })
  })
})
