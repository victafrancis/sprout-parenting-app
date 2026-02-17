import { z } from 'zod'
import { getRequestMode } from '@/lib/server/auth-mode'
import { created, fail, ok } from '@/lib/server/http'
import { getProfileService } from '@/lib/server/services/profile.service'
import { extractDailyLogInsights } from '@/lib/server/services/daily-log-extraction.service'
import {
  createDailyLogService,
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
    if (mode.isDemo) {
      return fail(403, 'FORBIDDEN', 'Writes are disabled in demo mode')
    }

    const body = await request.json()
    const parsed = postSchema.safeParse(body)

    if (!parsed.success) {
      return fail(400, 'VALIDATION_ERROR', 'Invalid request body')
    }

    const profile = await getProfileService({
      childId: parsed.data.childId,
      useDemoMode: false,
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
      useDemoMode: false,
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
