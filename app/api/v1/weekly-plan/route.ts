import { z } from 'zod'
import { getRequestMode } from '@/lib/server/auth-mode'
import { fail, ok } from '@/lib/server/http'
import { getWeeklyPlanService } from '@/lib/server/services/weekly-plan.service'

const querySchema = z.object({
  childId: z.string().min(1).default('Yumi'),
  objectKey: z.string().min(1).optional(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse({
      childId: searchParams.get('childId') ?? 'Yumi',
      objectKey: searchParams.get('objectKey') ?? undefined,
    })

    if (!parsed.success) {
      return fail(400, 'VALIDATION_ERROR', 'Invalid request query')
    }

    const mode = await getRequestMode()
    if (mode.mode === 'unauthenticated') {
      return fail(401, 'UNAUTHORIZED', 'Please login or continue in demo mode')
    }

    const weeklyPlan = await getWeeklyPlanService({
      childId: parsed.data.childId,
      objectKey: parsed.data.objectKey,
      useDemoMode: mode.isDemo,
    })

    return ok(weeklyPlan)
  } catch (error) {
    console.error('GET /api/v1/weekly-plan failed', error)
    return fail(500, 'INTERNAL_ERROR', 'Unable to fetch weekly plan')
  }
}
