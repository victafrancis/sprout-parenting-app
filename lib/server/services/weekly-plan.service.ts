import { getWeeklyPlanRepository } from '@/lib/server/repositories'
import { InvokeCommand } from '@aws-sdk/client-lambda'
import { lambdaClient } from '@/lib/server/aws/clients'
import { serverConfig } from '@/lib/server/config'
import type { WeeklyPlanJob, WeeklyPlanListItem } from '@/lib/types/domain'

export async function getWeeklyPlanService(input: {
  childId: string
  objectKey?: string
  useDemoMode?: boolean
}) {
  const repository = getWeeklyPlanRepository(Boolean(input.useDemoMode))
  return repository.getWeeklyPlanMarkdown({
    childId: input.childId,
    objectKey: input.objectKey,
  })
}

function isPlanJobTimedOut(startedAt: string) {
  const startedAtMs = new Date(startedAt).getTime()
  if (Number.isNaN(startedAtMs)) {
    return false
  }

  const elapsedSeconds = (Date.now() - startedAtMs) / 1000
  return elapsedSeconds > serverConfig.weeklyPlanJobTimeoutSeconds
}

function findLatestPlan(availablePlans: WeeklyPlanListItem[]) {
  if (availablePlans.length === 0) {
    return null
  }

  return availablePlans[0]
}

export async function syncWeeklyPlanJobStatusService(input: {
  childId: string
  useDemoMode?: boolean
}): Promise<WeeklyPlanJob> {
  const repository = getWeeklyPlanRepository(Boolean(input.useDemoMode))
  const currentJob = await repository.getPlanJob({ childId: input.childId })

  if (currentJob.status !== 'in_progress') {
    return currentJob
  }

  if (currentJob.startedAt && isPlanJobTimedOut(currentJob.startedAt)) {
    return repository.putPlanJobFailed({
      childId: input.childId,
      failedAt: new Date().toISOString(),
      errorMessage: 'Weekly plan generation timed out. Please try again.',
    })
  }

  const availablePlans = await repository.listWeeklyPlans({ childId: input.childId })
  const latestPlan = findLatestPlan(availablePlans)

  if (!latestPlan || !latestPlan.lastModified || !currentJob.startedAt) {
    return currentJob
  }

  const latestPlanMs = new Date(latestPlan.lastModified).getTime()
  const startedAtMs = new Date(currentJob.startedAt).getTime()

  if (Number.isNaN(latestPlanMs) || Number.isNaN(startedAtMs)) {
    return currentJob
  }

  if (latestPlanMs >= startedAtMs) {
    return repository.putPlanJobCompleted({
      childId: input.childId,
      completedAt: new Date().toISOString(),
      outputObjectKey: latestPlan.objectKey,
    })
  }

  return currentJob
}

export async function startWeeklyPlanGenerationService(input: {
  childId: string
  useDemoMode?: boolean
}): Promise<WeeklyPlanJob> {
  const repository = getWeeklyPlanRepository(Boolean(input.useDemoMode))
  const startedAt = new Date().toISOString()

  try {
    await repository.putPlanJobInProgress({
      childId: input.childId,
      startedAt,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'ConditionalCheckFailedException'
    ) {
      throw new Error('A weekly plan is already being generated.')
    }

    throw error
  }

  const lambdaFunctionNameFromRuntime =
    process.env.WEEKLY_PLAN_LAMBDA_FUNCTION_NAME?.trim() || ''
  const lambdaFunctionName =
    lambdaFunctionNameFromRuntime || serverConfig.weeklyPlanLambdaFunctionName

  if (!lambdaFunctionName) {
    await repository.putPlanJobFailed({
      childId: input.childId,
      failedAt: new Date().toISOString(),
      errorMessage:
        'Missing WEEKLY_PLAN_LAMBDA_FUNCTION_NAME configuration. Restart Next.js after updating .env.local.',
    })
    throw new Error('Weekly plan generation is not configured.')
  }

  try {
    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: lambdaFunctionName,
        InvocationType: 'Event',
        Payload: Buffer.from(
          JSON.stringify({
            childId: input.childId,
            triggerSource: 'nextjs-api',
          }),
        ),
      }),
    )
  } catch (error) {
    await repository.putPlanJobFailed({
      childId: input.childId,
      failedAt: new Date().toISOString(),
      errorMessage: 'Unable to invoke weekly plan worker.',
    })

    throw error
  }

  return repository.getPlanJob({ childId: input.childId })
}

export async function deleteWeeklyPlanService(input: {
  childId: string
  objectKey: string
  useDemoMode?: boolean
}) {
  const repository = getWeeklyPlanRepository(Boolean(input.useDemoMode))
  await repository.deleteWeeklyPlanObject({
    childId: input.childId,
    objectKey: input.objectKey,
  })
}
