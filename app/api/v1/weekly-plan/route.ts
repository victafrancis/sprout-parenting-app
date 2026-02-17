import { z } from 'zod'
import { getRequestMode } from '@/lib/server/auth-mode'
import { fail, ok } from '@/lib/server/http'
import { getWeeklyPlanService } from '@/lib/server/services/weekly-plan.service'

const querySchema = z.object({
  childId: z.string().min(1).default('Yumi'),
  week: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse({
      childId: searchParams.get('childId') ?? 'Yumi',
      week: searchParams.get('week') ?? undefined,
    })

    if (!parsed.success) {
      return fail(400, 'VALIDATION_ERROR', 'Invalid request query')
    }

    const mode = await getRequestMode()
    const weeklyPlan = await getWeeklyPlanService({
      childId: parsed.data.childId,
      week: parsed.data.week,
      useDemoMode: mode.isDemo,
    })

    return ok(weeklyPlan)
  } catch (error) {
    console.error('GET /api/v1/weekly-plan failed', error)
    return fail(500, 'INTERNAL_ERROR', 'Unable to fetch weekly plan')
  }
}
