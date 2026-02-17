import { GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import path from 'node:path'
import { s3Client } from '@/lib/server/aws/clients'
import { serverConfig } from '@/lib/server/config'
import type { WeeklyPlanRepository } from '@/lib/server/repositories/types'
import type { WeeklyPlanListItem } from '@/lib/types/domain'

export class AwsWeeklyPlanRepository implements WeeklyPlanRepository {
  async getWeeklyPlanMarkdown(input: { childId: string; objectKey?: string }) {
    const prefix = `${serverConfig.s3WeeklyPlanPrefix}/${input.childId}/`
    const listResponse = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: serverConfig.s3WeeklyPlanBucket,
        Prefix: prefix,
      }),
    )

    const availablePlans = this.createAvailablePlans(listResponse.Contents ?? [])
    const selectedObjectKey = this.selectObjectKey(availablePlans, input.objectKey)

    if (!selectedObjectKey) {
      return {
        childId: input.childId,
        selectedObjectKey: null,
        availablePlans,
        markdown: '',
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
      source: 's3' as const,
    }
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
