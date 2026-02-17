import { z } from 'zod'
import { getRequestMode } from '@/lib/server/auth-mode'
import { fail, ok } from '@/lib/server/http'
import {
  getProfileService,
  updateProfileWithCandidatesService,
} from '@/lib/server/services/profile.service'

const querySchema = z.object({
  childId: z.string().min(1).default('Yumi'),
})

const patchSchema = z.object({
  childId: z.string().min(1).default('Yumi'),
  milestones: z.array(z.string()).default([]),
  activeSchemas: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse({
      childId: searchParams.get('childId') ?? 'Yumi',
    })

    if (!parsed.success) {
      return fail(400, 'VALIDATION_ERROR', 'Invalid request query')
    }

    const mode = await getRequestMode()
    if (mode.mode === 'unauthenticated') {
      return fail(401, 'UNAUTHORIZED', 'Please login or continue in demo mode')
    }

    const profile = await getProfileService({
      childId: parsed.data.childId,
      useDemoMode: mode.isDemo,
    })

    if (!profile) {
      return fail(404, 'NOT_FOUND', 'Profile not found')
    }

    return ok(profile)
  } catch (error) {
    console.error('GET /api/v1/profile failed', error)
    return fail(500, 'INTERNAL_ERROR', 'Unable to fetch profile')
  }
}

export async function PATCH(request: Request) {
  try {
    const mode = await getRequestMode()
    if (mode.mode === 'unauthenticated') {
      return fail(401, 'UNAUTHORIZED', 'Please login or continue in demo mode')
    }

    if (mode.isDemo) {
      return fail(403, 'FORBIDDEN', 'Writes are disabled in demo mode')
    }

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)

    if (!parsed.success) {
      return fail(400, 'VALIDATION_ERROR', 'Invalid request body')
    }

    const updatedProfile = await updateProfileWithCandidatesService({
      childId: parsed.data.childId,
      milestones: parsed.data.milestones,
      activeSchemas: parsed.data.activeSchemas,
      interests: parsed.data.interests,
      useDemoMode: false,
    })

    return ok(updatedProfile)
  } catch (error) {
    console.error('PATCH /api/v1/profile failed', error)
    return fail(500, 'INTERNAL_ERROR', 'Unable to update profile')
  }
}
