import { GetObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from '@/lib/server/aws/clients'
import { serverConfig } from '@/lib/server/config'
import type { WeeklyPlanRepository } from '@/lib/server/repositories/types'

export class AwsWeeklyPlanRepository implements WeeklyPlanRepository {
  async getWeeklyPlanMarkdown(input: { childId: string; week: string }) {
    const key = `${serverConfig.s3WeeklyPlanPrefix}/${input.childId}/${input.week}.md`

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: serverConfig.s3WeeklyPlanBucket,
        Key: key,
      }),
    )

    const markdown = (await response.Body?.transformToString()) || ''

    return {
      childId: input.childId,
      week: input.week,
      markdown,
      source: 's3' as const,
    }
  }
}
