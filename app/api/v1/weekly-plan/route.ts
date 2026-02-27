import { z } from 'zod'
import { getRequestMode } from '@/lib/server/auth-mode'
import { fail, ok } from '@/lib/server/http'
import {
  deleteWeeklyPlanService,
  getWeeklyPlanService,
  startWeeklyPlanGenerationService,
  syncWeeklyPlanJobStatusService,
} from '@/lib/server/services/weekly-plan.service'

const querySchema = z.object({
  childId: z.string().min(1).default('Yumi'),
  objectKey: z.string().min(1).optional(),
})

const postSchema = z.object({
  action: z.literal('generate'),
  childId: z.string().min(1).default('Yumi'),
})

const patchSchema = z.object({
  action: z.literal('sync-job-status'),
  childId: z.string().min(1).default('Yumi'),
})

const deleteSchema = z.object({
  childId: z.string().min(1).default('Yumi'),
  objectKey: z.string().min(1),
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

    await syncWeeklyPlanJobStatusService({
      childId: parsed.data.childId,
      useDemoMode: mode.isDemo,
    })

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

export async function POST(request: Request) {
  try {
    const mode = await getRequestMode()
    if (!mode.isAuthenticated) {
      return fail(403, 'FORBIDDEN', 'Only authenticated admin can generate plans')
    }

    const body = await request.json()
    const parsed = postSchema.safeParse(body)

    if (!parsed.success) {
      return fail(400, 'VALIDATION_ERROR', 'Invalid request body')
    }

    const planJob = await startWeeklyPlanGenerationService({
      childId: parsed.data.childId,
      useDemoMode: false,
    })

    return ok(planJob)
  } catch (error) {
    if (error instanceof Error && error.message.includes('already being generated')) {
      return fail(409, 'PLAN_ALREADY_IN_PROGRESS', error.message)
    }

    console.error('POST /api/v1/weekly-plan failed', error)
    return fail(500, 'INTERNAL_ERROR', 'Unable to start weekly plan generation')
  }
}

export async function PATCH(request: Request) {
  try {
    const mode = await getRequestMode()
    if (mode.mode === 'unauthenticated') {
      return fail(401, 'UNAUTHORIZED', 'Please login or continue in demo mode')
    }

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)

    if (!parsed.success) {
      return fail(400, 'VALIDATION_ERROR', 'Invalid request body')
    }

    const planJob = await syncWeeklyPlanJobStatusService({
      childId: parsed.data.childId,
      useDemoMode: mode.isDemo,
    })

    return ok(planJob)
  } catch (error) {
    console.error('PATCH /api/v1/weekly-plan failed', error)
    return fail(500, 'INTERNAL_ERROR', 'Unable to sync weekly plan generation status')
  }
}

export async function DELETE(request: Request) {
  try {
    const mode = await getRequestMode()
    if (!mode.isAuthenticated) {
      return fail(403, 'FORBIDDEN', 'Only authenticated admin can delete plans')
    }

    const body = await request.json()
    const parsed = deleteSchema.safeParse(body)

    if (!parsed.success) {
      return fail(400, 'VALIDATION_ERROR', 'Invalid request body')
    }

    await deleteWeeklyPlanService({
      childId: parsed.data.childId,
      objectKey: parsed.data.objectKey,
      useDemoMode: false,
    })

    return ok({ success: true })
  } catch (error) {
    console.error('DELETE /api/v1/weekly-plan failed', error)
    return fail(500, 'INTERNAL_ERROR', 'Unable to delete weekly plan')
  }
}
