import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { WeeklyPlanRepository } from '@/lib/server/repositories/types'

export class MockWeeklyPlanRepository implements WeeklyPlanRepository {
  async getWeeklyPlanMarkdown(input: { childId: string; week: string }) {
    const filePath = path.join(process.cwd(), 'lib', 'data', 'weekly-plan.md')
    const markdown = await readFile(filePath, 'utf8')

    return {
      childId: input.childId,
      week: input.week,
      markdown,
      source: 'mock' as const,
    }
  }
}
