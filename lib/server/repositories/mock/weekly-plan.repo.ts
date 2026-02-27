import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { WeeklyPlanRepository } from '@/lib/server/repositories/types'
import type { WeeklyPlanJob, WeeklyPlanListItem } from '@/lib/types/domain'

function createMockPlanJob(childId: string): WeeklyPlanJob {
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

export class MockWeeklyPlanRepository implements WeeklyPlanRepository {
  async listWeeklyPlans(input: { childId: string }): Promise<WeeklyPlanListItem[]> {
    return this.getAvailablePlans(input.childId)
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
        planJob: createMockPlanJob(input.childId),
        source: 'mock' as const,
      }
    }

    const selectedPlan = availablePlans.find((plan) => {
      return plan.objectKey === selectedObjectKey
    })

    if (!selectedPlan) {
      return {
        childId: input.childId,
        selectedObjectKey: null,
        availablePlans,
        markdown: '',
        planJob: createMockPlanJob(input.childId),
        source: 'mock' as const,
      }
    }

    const filePath = path.join(process.cwd(), 'lib', 'data', selectedPlan.displayName)
    const markdown = await readFile(filePath, 'utf8')

    return {
      childId: input.childId,
      selectedObjectKey,
      availablePlans,
      markdown,
      planJob: createMockPlanJob(input.childId),
      source: 'mock' as const,
    }
  }

  async getPlanJob(input: { childId: string }): Promise<WeeklyPlanJob> {
    return createMockPlanJob(input.childId)
  }

  async putPlanJobInProgress(input: {
    childId: string
    startedAt: string
  }): Promise<WeeklyPlanJob> {
    return {
      childId: input.childId,
      status: 'in_progress',
      startedAt: input.startedAt,
      completedAt: null,
      failedAt: null,
      outputObjectKey: null,
      errorMessage: null,
    }
  }

  async putPlanJobCompleted(input: {
    childId: string
    completedAt: string
    outputObjectKey: string | null
  }): Promise<WeeklyPlanJob> {
    return {
      childId: input.childId,
      status: 'completed',
      startedAt: null,
      completedAt: input.completedAt,
      failedAt: null,
      outputObjectKey: input.outputObjectKey,
      errorMessage: null,
    }
  }

  async putPlanJobFailed(input: {
    childId: string
    failedAt: string
    errorMessage: string
  }): Promise<WeeklyPlanJob> {
    return {
      childId: input.childId,
      status: 'failed',
      startedAt: null,
      completedAt: null,
      failedAt: input.failedAt,
      outputObjectKey: null,
      errorMessage: input.errorMessage,
    }
  }

  async deleteWeeklyPlanObject(_input: {
    childId: string
    objectKey: string
  }): Promise<void> {
    return
  }

  private getAvailablePlans(childId: string): WeeklyPlanListItem[] {
    const childPrefix = `plans/${childId}/`

    return [
      {
        objectKey: `${childPrefix}test-weekly-plan-2.md`,
        displayName: 'test-weekly-plan-2.md',
        lastModified: '2026-02-17T16:00:00.000Z',
      },
      {
        objectKey: `${childPrefix}weekly-plan.md`,
        displayName: 'weekly-plan.md',
        lastModified: '2026-02-10T16:00:00.000Z',
      },
    ]
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
