import { DEMO_COOKIE_NAME, ONE_DAY_IN_SECONDS, SESSION_COOKIE_NAME } from '@/lib/server/auth/constants'
import { fail, ok } from '@/lib/server/http'

const DEMO_COOKIE_MAX_AGE = 365 * ONE_DAY_IN_SECONDS

export async function POST() {
  try {
    const response = ok({
      mode: 'demo' as const,
      authenticated: false,
    })

    response.cookies.delete(SESSION_COOKIE_NAME)
    response.cookies.set(DEMO_COOKIE_NAME, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: DEMO_COOKIE_MAX_AGE,
    })
    return response
  } catch (error) {
    console.error('POST /api/auth/logout failed', error)
    return fail(500, 'INTERNAL_ERROR', 'Unable to logout')
  }
}
