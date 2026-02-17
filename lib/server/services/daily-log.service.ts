import { getDailyLogRepository } from '@/lib/server/repositories'
import type { DailyLogExtractionResult } from '@/lib/types/domain'

export async function listDailyLogsService(input: {
  childId: string
  limit: number
  cursor?: string
  useDemoMode?: boolean
}) {
  const repository = getDailyLogRepository(Boolean(input.useDemoMode))
  return repository.listDailyLogs({
    childId: input.childId,
    limit: input.limit,
    cursor: input.cursor,
  })
}

export async function createDailyLogService(input: {
  childId: string
  rawText: string
  extractionResult?: DailyLogExtractionResult
  useDemoMode?: boolean
}) {
  const repository = getDailyLogRepository(Boolean(input.useDemoMode))
  return repository.createDailyLog({
    childId: input.childId,
    rawText: input.rawText,
    extractionResult: input.extractionResult,
  })
}

export async function deleteDailyLogService(input: {
  childId: string
  storageKey: string
  useDemoMode?: boolean
}) {
  const repository = getDailyLogRepository(Boolean(input.useDemoMode))
  return repository.deleteDailyLog({
    childId: input.childId,
    storageKey: input.storageKey,
  })
}
