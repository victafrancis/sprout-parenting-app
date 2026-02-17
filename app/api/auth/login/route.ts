import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { SESSION_COOKIE_NAME, DEMO_COOKIE_NAME, ONE_HOUR_IN_SECONDS, ONE_DAY_IN_SECONDS } from '@/lib/server/auth/constants'
import { createSessionToken } from '@/lib/server/auth/session'
import { serverConfig } from '@/lib/server/config'
import { fail, ok } from '@/lib/server/http'

const loginSchema = z.object({
  passcode: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
})

function isPasscodeValid(inputPasscode: string) {
  const expectedPasscode = serverConfig.adminPasscode
  if (!expectedPasscode) {
    return false
  }

  const expectedBuffer = Buffer.from(expectedPasscode)
  const inputBuffer = Buffer.from(inputPasscode)

  if (expectedBuffer.length !== inputBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, inputBuffer)
}

export async function POST(request: Request) {
  try {
    if (!serverConfig.isAuthEnabled) {
      return fail(
        503,
        'AUTH_DISABLED',
        'Authentication is disabled because SESSION_SECRET is not configured. Demo mode is still available.',
      )
    }

    if (!serverConfig.adminPasscode) {
      return fail(500, 'AUTH_MISCONFIGURED', 'ADMIN_PASSCODE is not configured')
    }

    const body = await request.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      return fail(400, 'VALIDATION_ERROR', 'Invalid login request')
    }

    const passcodeIsValid = isPasscodeValid(parsed.data.passcode)
    if (!passcodeIsValid) {
      return fail(401, 'INVALID_CREDENTIALS', 'Incorrect passcode')
    }

    const now = Math.floor(Date.now() / 1000)
    const sessionTtlSeconds = parsed.data.rememberMe
      ? serverConfig.sessionRememberTtlDays * ONE_DAY_IN_SECONDS
      : serverConfig.sessionTtlHours * ONE_HOUR_IN_SECONDS

    const token = createSessionToken(now + sessionTtlSeconds)
    if (!token) {
      return fail(
        503,
        'AUTH_DISABLED',
        'Authentication is disabled because SESSION_SECRET is not configured. Demo mode is still available.',
      )
    }

    const response = ok({
      authenticated: true,
      mode: 'authenticated' as const,
    })

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: sessionTtlSeconds,
    })

    response.cookies.delete(DEMO_COOKIE_NAME)
    return response
  } catch (error) {
    console.error('POST /api/auth/login failed', error)
    return fail(500, 'INTERNAL_ERROR', 'Unable to process login request')
  }
}
