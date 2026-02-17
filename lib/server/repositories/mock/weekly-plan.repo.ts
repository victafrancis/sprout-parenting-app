import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { WeeklyPlanRepository } from '@/lib/server/repositories/types'
import type { WeeklyPlanListItem } from '@/lib/types/domain'

export class MockWeeklyPlanRepository implements WeeklyPlanRepository {
  async getWeeklyPlanMarkdown(input: { childId: string; objectKey?: string }) {
    const availablePlans = this.getAvailablePlans(input.childId)
    const selectedObjectKey = this.selectObjectKey(availablePlans, input.objectKey)

    if (!selectedObjectKey) {
      return {
        childId: input.childId,
        selectedObjectKey: null,
        availablePlans,
        markdown: '',
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
      source: 'mock' as const,
    }
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
