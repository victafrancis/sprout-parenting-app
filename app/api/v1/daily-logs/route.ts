import { z } from 'zod'
import { getRequestMode } from '@/lib/server/auth-mode'
import { created, fail, ok } from '@/lib/server/http'
import { getProfileService } from '@/lib/server/services/profile.service'
import { extractDailyLogInsights } from '@/lib/server/services/daily-log-extraction.service'
import {
  acceptDailyLogCandidatesService,
  createDailyLogService,
  deleteDailyLogService,
  listDailyLogsService,
} from '@/lib/server/services/daily-log.service'

const getSchema = z.object({
  childId: z.string().min(1).default('Yumi'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
})

const postSchema = z.object({
  childId: z.string().min(1).default('Yumi'),
  rawText: z.string().min(1).max(5000),
})

const deleteSchema = z.object({
  childId: z.string().min(1).default('Yumi'),
  storageKey: z.string().min(1),
})

const patchSchema = z.object({
  childId: z.string().min(1).default('Yumi'),
  storageKey: z.string().min(1),
  milestones: z.array(z.string()).default([]),
  activeSchemas: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = getSchema.safeParse({
      childId: searchParams.get('childId') ?? 'Yumi',
      limit: searchParams.get('limit') ?? 20,
      cursor: searchParams.get('cursor') ?? undefined,
    })

    if (!parsed.success) {
      return fail(400, 'VALIDATION_ERROR', 'Invalid request query')
    }

    const mode = await getRequestMode()
    if (mode.mode === 'unauthenticated') {
      return fail(401, 'UNAUTHORIZED', 'Please login or continue in demo mode')
    }

    const result = await listDailyLogsService({
      childId: parsed.data.childId,
      limit: parsed.data.limit,
      cursor: parsed.data.cursor,
      useDemoMode: mode.isDemo,
    })

    return ok(result.items, { nextCursor: result.nextCursor })
  } catch (error) {
    console.error('GET /api/v1/daily-logs failed', error)
    return fail(500, 'INTERNAL_ERROR', 'Unable to fetch daily logs')
  }
}

export async function POST(request: Request) {
  try {
    const mode = await getRequestMode()
    if (mode.mode === 'unauthenticated') {
      return fail(401, 'UNAUTHORIZED', 'Please login or continue in demo mode')
    }

    const useDemoModeForWrite = !mode.isAuthenticated

    const body = await request.json()
    const parsed = postSchema.safeParse(body)

    if (!parsed.success) {
      return fail(400, 'VALIDATION_ERROR', 'Invalid request body')
    }

    const profile = await getProfileService({
      childId: parsed.data.childId,
      useDemoMode: useDemoModeForWrite,
    })

    const extractionResult = await extractDailyLogInsights({
      childId: parsed.data.childId,
      rawText: parsed.data.rawText,
      childProfile: profile,
    })

    const createdLog = await createDailyLogService({
      childId: parsed.data.childId,
      rawText: parsed.data.rawText,
      extractionResult,
      useDemoMode: useDemoModeForWrite,
    })

    return created({
      log: createdLog,
      profileCandidates: extractionResult.profileCandidates,
      extractionSource: extractionResult.source,
    })
  } catch (error) {
    console.error('POST /api/v1/daily-logs failed', error)
    return fail(500, 'INTERNAL_ERROR', 'Unable to create daily log')
  }
}

export async function DELETE(request: Request) {
  try {
    const mode = await getRequestMode()
    if (mode.mode === 'unauthenticated') {
      return fail(401, 'UNAUTHORIZED', 'Please login or continue in demo mode')
    }

    const useDemoModeForWrite = !mode.isAuthenticated

    const body = await request.json()
    const parsed = deleteSchema.safeParse(body)

    if (!parsed.success) {
      return fail(400, 'VALIDATION_ERROR', 'Invalid request body')
    }

    await deleteDailyLogService({
      childId: parsed.data.childId,
      storageKey: parsed.data.storageKey,
      useDemoMode: useDemoModeForWrite,
    })

    return ok({ success: true })
  } catch (error) {
    console.error('DELETE /api/v1/daily-logs failed', error)
    return fail(500, 'INTERNAL_ERROR', 'Unable to delete daily log')
  }
}

export async function PATCH(request: Request) {
  try {
    const mode = await getRequestMode()
    if (mode.mode === 'unauthenticated') {
      return fail(401, 'UNAUTHORIZED', 'Please login or continue in demo mode')
    }

    const useDemoModeForWrite = !mode.isAuthenticated

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)

    if (!parsed.success) {
      return fail(400, 'VALIDATION_ERROR', 'Invalid request body')
    }

    const result = await acceptDailyLogCandidatesService({
      childId: parsed.data.childId,
      storageKey: parsed.data.storageKey,
      milestones: parsed.data.milestones,
      activeSchemas: parsed.data.activeSchemas,
      interests: parsed.data.interests,
      useDemoMode: useDemoModeForWrite,
    })

    return ok(result)
  } catch (error) {
    console.error('PATCH /api/v1/daily-logs failed', error)
    return fail(500, 'INTERNAL_ERROR', 'Unable to apply profile updates for daily log')
  }
}
