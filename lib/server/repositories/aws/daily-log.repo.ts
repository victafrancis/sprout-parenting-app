import { DeleteCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { dynamoDocClient } from '@/lib/server/aws/clients'
import { serverConfig } from '@/lib/server/config'
import type { DailyLogRepository } from '@/lib/server/repositories/types'
import type { CreateDailyLogInput, DailyLogEntry } from '@/lib/types/domain'

export class AwsDailyLogRepository implements DailyLogRepository {
  async listDailyLogs(input: {
    childId: string
    limit: number
    cursor?: string
  }): Promise<{ items: DailyLogEntry[]; nextCursor?: string | null }> {
    const result = await dynamoDocClient.send(
      new QueryCommand({
        TableName: serverConfig.dynamoTable,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `LOG#${input.childId}`,
        },
        ScanIndexForward: false,
        Limit: input.limit,
        ExclusiveStartKey: input.cursor
          ? JSON.parse(Buffer.from(input.cursor, 'base64').toString('utf8'))
          : undefined,
      }),
    )

    const items = (result.Items ?? []).map((item: Record<string, unknown>) => ({
      id: String(item.id ?? item.SK ?? Date.now()),
      timeLabel: String(item.timeLabel ?? item.SK ?? ''),
      entry: String(item.raw_text ?? item.entry ?? ''),
      createdAt: item.createdAt ? String(item.createdAt) : undefined,
      storageKey: item.SK ? String(item.SK) : undefined,
    }))

    const nextCursor = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null

    return {
      items,
      nextCursor,
    }
  }

  async createDailyLog(input: CreateDailyLogInput): Promise<DailyLogEntry> {
    const now = new Date()
    const iso = now.toISOString()
    const id = String(now.getTime())
    const item = {
      PK: `LOG#${input.childId}`,
      SK: `DATE#${iso}`,
      id,
      raw_text: input.rawText,
      entry: input.rawText,
      key_takeaways: input.extractionResult?.structuredLog.keyTakeaways ?? [],
      sentiment: input.extractionResult?.structuredLog.sentiment ?? 'neutral',
      profile_candidates: input.extractionResult?.profileCandidates ?? {
        milestones: [],
        activeSchemas: [],
        interests: [],
      },
      extraction_source: input.extractionResult?.source ?? 'fallback',
      extraction_model: input.extractionResult?.model ?? null,
      timeLabel: 'Just now',
      createdAt: iso,
    }

    await dynamoDocClient.send(
      new PutCommand({
        TableName: serverConfig.dynamoTable,
        Item: item,
      }),
    )

    return {
      id,
      timeLabel: 'Just now',
      entry: input.rawText,
      createdAt: iso,
      storageKey: item.SK,
    }
  }

  async deleteDailyLog(input: { childId: string; storageKey: string }): Promise<void> {
    await dynamoDocClient.send(
      new DeleteCommand({
        TableName: serverConfig.dynamoTable,
        Key: {
          PK: `LOG#${input.childId}`,
          SK: input.storageKey,
        },
      }),
    )
  }
}
