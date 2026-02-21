import { mockLogEntries } from '@/lib/data/daily-log'
import type { DailyLogRepository } from '@/lib/server/repositories/types'
import type {
  AppliedProfileUpdates,
  CreateDailyLogInput,
  DailyLogEntry,
} from '@/lib/types/domain'

const inMemoryLogs: DailyLogEntry[] = [...mockLogEntries]

export class MockDailyLogRepository implements DailyLogRepository {
  async listDailyLogs(input: {
    childId: string
    limit: number
    cursor?: string
  }) {
    void input.childId
    const offset = Number.parseInt(input.cursor || '0', 10) || 0
    const items = inMemoryLogs.slice(offset, offset + input.limit)
    const nextOffset = offset + input.limit

    return {
      items,
      nextCursor: nextOffset < inMemoryLogs.length ? String(nextOffset) : null,
    }
  }

  async createDailyLog(input: CreateDailyLogInput) {
    void input.childId
    const createdAt = new Date().toISOString()
    const newLog: DailyLogEntry = {
      id: String(Date.now()),
      timeLabel: 'Just now',
      entry: input.rawText,
      createdAt,
      storageKey: `MOCK#${Date.now()}`,
    }

    inMemoryLogs.unshift(newLog)
    return newLog
  }

  async saveAppliedProfileUpdates(input: {
    childId: string
    storageKey: string
    appliedProfileUpdates: AppliedProfileUpdates
  }) {
    void input.childId

    const logEntry = inMemoryLogs.find((existingLogEntry) => {
      return existingLogEntry.storageKey === input.storageKey
    })

    if (!logEntry) {
      return
    }

    logEntry.appliedProfileUpdates = input.appliedProfileUpdates
  }

  async deleteDailyLog(input: { childId: string; storageKey: string }) {
    void input.childId

    const logIndex = inMemoryLogs.findIndex((logEntry) => {
      if (logEntry.storageKey) {
        return logEntry.storageKey === input.storageKey
      }

      return `MOCK#${logEntry.id}` === input.storageKey
    })

    if (logIndex === -1) {
      return
    }

    inMemoryLogs.splice(logIndex, 1)
  }
}
