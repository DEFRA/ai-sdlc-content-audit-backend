const COLLECTION = 'feedback'

function nowEpochSeconds() {
  return Math.floor(Date.now() / 1000)
}

export async function saveFeedback(db, input) {
  const now = nowEpochSeconds()
  const filter = { propositionMatchId: input.propositionMatchId }

  const { value: updated } = await db.collection(COLLECTION).findOneAndUpdate(
    filter,
    {
      $set: {
        propositionMatchId: input.propositionMatchId,
        categoryId: input.categoryId,
        pageId: input.pageId,
        currentStatus: input.currentStatus,
        choice: input.choice,
        comment: input.comment ? input.comment : null,
        updatedAt: now
      },
      $setOnInsert: { submittedAt: now }
    },
    {
      upsert: true,
      returnDocument: 'after',
      projection: { _id: 0 },
      includeResultMetadata: true
    }
  )
  return updated
}

export function findAllFeedback(db) {
  return db
    .collection(COLLECTION)
    .find({}, { projection: { _id: 0 } })
    .sort({ updatedAt: -1 })
    .toArray()
}

export async function clearAllFeedback(db) {
  await db.collection(COLLECTION).deleteMany({})
}
