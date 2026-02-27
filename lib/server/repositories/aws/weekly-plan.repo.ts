import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import path from 'node:path'
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { dynamoDocClient, s3Client } from '@/lib/server/aws/clients'
import { serverConfig } from '@/lib/server/config'
import type { WeeklyPlanRepository } from '@/lib/server/repositories/types'
import type { WeeklyPlanJob, WeeklyPlanListItem } from '@/lib/types/domain'

const PLAN_JOB_SORT_KEY = 'STATE'

function getPlanJobPartitionKey(childId: string) {
  return `PLAN_JOB#${childId}`
}

function createIdlePlanJob(childId: string): WeeklyPlanJob {
  return {
    childId,
    status: 'idle',
    startedAt: null,
    completedAt: null,
    failedAt: null,
    outputObjectKey: null,
    errorMessage: null,
  }
}

function parsePlanJobStatus(value: unknown): WeeklyPlanJob['status'] {
  if (
    value === 'idle' ||
    value === 'in_progress' ||
    value === 'completed' ||
    value === 'failed'
  ) {
    return value
  }

  return 'idle'
}

export class AwsWeeklyPlanRepository implements WeeklyPlanRepository {
  async listWeeklyPlans(input: { childId: string }): Promise<WeeklyPlanListItem[]> {
    const prefix = `${serverConfig.s3WeeklyPlanPrefix}/${input.childId}/`
    const listResponse = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: serverConfig.s3WeeklyPlanBucket,
        Prefix: prefix,
      }),
    )

    return this.createAvailablePlans(listResponse.Contents ?? [])
  }

  async getWeeklyPlanMarkdown(input: { childId: string; objectKey?: string }) {
    const availablePlans = await this.listWeeklyPlans({ childId: input.childId })
    const selectedObjectKey = this.selectObjectKey(availablePlans, input.objectKey)

    if (!selectedObjectKey) {
      return {
        childId: input.childId,
        selectedObjectKey: null,
        availablePlans,
        markdown: '',
        planJob: await this.getPlanJob({ childId: input.childId }),
        source: 's3' as const,
      }
    }

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: serverConfig.s3WeeklyPlanBucket,
        Key: selectedObjectKey,
      }),
    )

    const markdown = (await response.Body?.transformToString()) || ''

    return {
      childId: input.childId,
      selectedObjectKey,
      availablePlans,
      markdown,
      planJob: await this.getPlanJob({ childId: input.childId }),
      source: 's3' as const,
    }
  }

  async getPlanJob(input: { childId: string }): Promise<WeeklyPlanJob> {
    const result = await dynamoDocClient.send(
      new GetCommand({
        TableName: serverConfig.dynamoTable,
        Key: {
          PK: getPlanJobPartitionKey(input.childId),
          SK: PLAN_JOB_SORT_KEY,
        },
      }),
    )

    if (!result.Item) {
      return createIdlePlanJob(input.childId)
    }

    return {
      childId: input.childId,
      status: parsePlanJobStatus(result.Item.status),
      startedAt: typeof result.Item.startedAt === 'string' ? result.Item.startedAt : null,
      completedAt:
        typeof result.Item.completedAt === 'string' ? result.Item.completedAt : null,
      failedAt: typeof result.Item.failedAt === 'string' ? result.Item.failedAt : null,
      outputObjectKey:
        typeof result.Item.outputObjectKey === 'string'
          ? result.Item.outputObjectKey
          : null,
      errorMessage:
        typeof result.Item.errorMessage === 'string' ? result.Item.errorMessage : null,
    }
  }

  async putPlanJobInProgress(input: {
    childId: string
    startedAt: string
  }): Promise<WeeklyPlanJob> {
    await dynamoDocClient.send(
      new PutCommand({
        TableName: serverConfig.dynamoTable,
        Item: {
          PK: getPlanJobPartitionKey(input.childId),
          SK: PLAN_JOB_SORT_KEY,
          status: 'in_progress',
          startedAt: input.startedAt,
          completedAt: null,
          failedAt: null,
          outputObjectKey: null,
          errorMessage: null,
          updatedAt: new Date().toISOString(),
        },
        ConditionExpression: 'attribute_not_exists(PK) OR #status <> :inProgress',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':inProgress': 'in_progress',
        },
      }),
    )

    return this.getPlanJob({ childId: input.childId })
  }

  async putPlanJobCompleted(input: {
    childId: string
    completedAt: string
    outputObjectKey: string | null
  }): Promise<WeeklyPlanJob> {
    await dynamoDocClient.send(
      new UpdateCommand({
        TableName: serverConfig.dynamoTable,
        Key: {
          PK: getPlanJobPartitionKey(input.childId),
          SK: PLAN_JOB_SORT_KEY,
        },
        UpdateExpression:
          'SET #status = :status, completedAt = :completedAt, failedAt = :failedAt, outputObjectKey = :outputObjectKey, errorMessage = :errorMessage, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'completed',
          ':completedAt': input.completedAt,
          ':failedAt': null,
          ':outputObjectKey': input.outputObjectKey,
          ':errorMessage': null,
          ':updatedAt': new Date().toISOString(),
        },
      }),
    )

    return this.getPlanJob({ childId: input.childId })
  }

  async putPlanJobFailed(input: {
    childId: string
    failedAt: string
    errorMessage: string
  }): Promise<WeeklyPlanJob> {
    await dynamoDocClient.send(
      new UpdateCommand({
        TableName: serverConfig.dynamoTable,
        Key: {
          PK: getPlanJobPartitionKey(input.childId),
          SK: PLAN_JOB_SORT_KEY,
        },
        UpdateExpression:
          'SET #status = :status, failedAt = :failedAt, errorMessage = :errorMessage, completedAt = :completedAt, outputObjectKey = :outputObjectKey, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'failed',
          ':failedAt': input.failedAt,
          ':errorMessage': input.errorMessage,
          ':completedAt': null,
          ':outputObjectKey': null,
          ':updatedAt': new Date().toISOString(),
        },
      }),
    )

    return this.getPlanJob({ childId: input.childId })
  }

  async deleteWeeklyPlanObject(input: {
    childId: string
    objectKey: string
  }): Promise<void> {
    const expectedPrefix = `${serverConfig.s3WeeklyPlanPrefix}/${input.childId}/`
    if (!input.objectKey.startsWith(expectedPrefix)) {
      throw new Error('Invalid weekly plan key for selected child')
    }

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: serverConfig.s3WeeklyPlanBucket,
        Key: input.objectKey,
      }),
    )
  }

  private createAvailablePlans(
    objects: Array<{ Key?: string; LastModified?: Date }>,
  ): WeeklyPlanListItem[] {
    const markdownObjects = objects.filter((object) => {
      return Boolean(object.Key) && object.Key!.toLowerCase().endsWith('.md')
    })

    const sortedObjects = markdownObjects.sort((left, right) => {
      const leftTime = left.LastModified ? left.LastModified.getTime() : 0
      const rightTime = right.LastModified ? right.LastModified.getTime() : 0
      return rightTime - leftTime
    })

    return sortedObjects.map((object) => {
      const objectKey = object.Key as string
      return {
        objectKey,
        displayName: path.basename(objectKey),
        lastModified: object.LastModified ? object.LastModified.toISOString() : null,
      }
    })
  }

  private selectObjectKey(availablePlans: WeeklyPlanListItem[], requestedObjectKey?: string) {
    if (!requestedObjectKey) {
      return availablePlans[0]?.objectKey ?? null
    }

    const matchingPlan = availablePlans.find((plan) => {
      return plan.objectKey === requestedObjectKey
    })

    if (matchingPlan) {
      return matchingPlan.objectKey
    }

    return availablePlans[0]?.objectKey ?? null
  }
}
