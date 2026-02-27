import { DeleteCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { dynamoDocClient } from '@/lib/server/aws/clients'
import { serverConfig } from '@/lib/server/config'
import type { DailyLogRepository } from '@/lib/server/repositories/types'
import { buildDailyLogTimeLabel } from '@/lib/server/utils/time-label'
import type {
  AppliedProfileUpdates,
  CreateDailyLogInput,
  DailyLogEntry,
  PlanReference,
} from '@/lib/types/domain'

function parsePlanReference(value: unknown): PlanReference | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const reference = value as Record<string, unknown>

  if (
    typeof reference.sectionId !== 'string' ||
    typeof reference.sectionTitle !== 'string' ||
    typeof reference.referenceLabel !== 'string'
  ) {
    return undefined
  }

  const parsedPlanReference: PlanReference = {
    sectionId: reference.sectionId,
    sectionTitle: reference.sectionTitle,
    referenceLabel: reference.referenceLabel,
  }

  if (typeof reference.planObjectKey === 'string' || reference.planObjectKey === null) {
    parsedPlanReference.planObjectKey = reference.planObjectKey
  }

  if (typeof reference.subsectionId === 'string') {
    parsedPlanReference.subsectionId = reference.subsectionId
  }

  if (typeof reference.subsectionTitle === 'string') {
    parsedPlanReference.subsectionTitle = reference.subsectionTitle
  }

  if (typeof reference.activityIndex === 'number') {
    parsedPlanReference.activityIndex = reference.activityIndex
  }

  if (typeof reference.activityTitle === 'string') {
    parsedPlanReference.activityTitle = reference.activityTitle
  }

  if (typeof reference.referenceSnippet === 'string') {
    parsedPlanReference.referenceSnippet = reference.referenceSnippet
  }

  if (typeof reference.referenceContentMarkdown === 'string') {
    parsedPlanReference.referenceContentMarkdown = reference.referenceContentMarkdown
  }

  return parsedPlanReference
}

function parseAppliedProfileUpdates(value: unknown): AppliedProfileUpdates | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const updates = value as Record<string, unknown>

  const milestones = Array.isArray(updates.milestones)
    ? updates.milestones.filter((item): item is string => typeof item === 'string')
    : []

  const activeSchemas = Array.isArray(updates.activeSchemas)
    ? updates.activeSchemas.filter((item): item is string => typeof item === 'string')
    : []

  const interests = Array.isArray(updates.interests)
    ? updates.interests.filter((item): item is string => typeof item === 'string')
    : []

  return {
    milestones,
    activeSchemas,
    interests,
  }
}

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
      timeLabel: buildDailyLogTimeLabel({
        createdAt: item.createdAt ? String(item.createdAt) : undefined,
        storageKey: item.SK ? String(item.SK) : undefined,
        fallbackLabel: item.timeLabel ? String(item.timeLabel) : '',
      }),
      entry: String(item.raw_text ?? item.entry ?? ''),
      createdAt: item.createdAt ? String(item.createdAt) : undefined,
      storageKey: item.SK ? String(item.SK) : undefined,
      planReference: parsePlanReference(item.plan_reference ?? item.planReference),
      appliedProfileUpdates: parseAppliedProfileUpdates(
        item.applied_profile_updates ?? item.appliedProfileUpdates,
      ),
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
      plan_reference: input.planReference,
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
      planReference: input.planReference,
    }
  }

  async updateDailyLogNote(input: {
    childId: string
    storageKey: string
    rawText: string
  }): Promise<void> {
    const trimmedRawText = input.rawText.trim()

    await dynamoDocClient.send(
      new UpdateCommand({
        TableName: serverConfig.dynamoTable,
        Key: {
          PK: `LOG#${input.childId}`,
          SK: input.storageKey,
        },
        UpdateExpression: 'SET raw_text = :rawText, entry = :entry, updated_at = :updatedAt',
        ExpressionAttributeValues: {
          ':rawText': trimmedRawText,
          ':entry': trimmedRawText,
          ':updatedAt': new Date().toISOString(),
        },
      }),
    )
  }

  async saveAppliedProfileUpdates(input: {
    childId: string
    storageKey: string
    appliedProfileUpdates: AppliedProfileUpdates
  }): Promise<void> {
    await dynamoDocClient.send(
      new UpdateCommand({
        TableName: serverConfig.dynamoTable,
        Key: {
          PK: `LOG#${input.childId}`,
          SK: input.storageKey,
        },
        UpdateExpression:
          'SET applied_profile_updates = :appliedProfileUpdates, applied_profile_updates_at = :appliedAt',
        ExpressionAttributeValues: {
          ':appliedProfileUpdates': input.appliedProfileUpdates,
          ':appliedAt': new Date().toISOString(),
        },
      }),
    )
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
