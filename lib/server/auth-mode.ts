import { cookies } from 'next/headers'
import { DEMO_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/lib/server/auth/constants'
import { verifySessionToken } from '@/lib/server/auth/session'

export type RequestAccessMode = 'authenticated' | 'demo' | 'unauthenticated'

export async function getRequestMode() {
  const cookieStore = await cookies()
  const demoCookieEnabled =
    cookieStore.get(DEMO_COOKIE_NAME)?.value === 'true'
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const validSession = verifySessionToken(sessionCookie)

  let mode: RequestAccessMode = 'demo'

  if (validSession) {
    mode = 'authenticated'
  } else if (demoCookieEnabled) {
    mode = 'demo'
  } else {
    // Treat first-time visitors as demo users immediately, even before
    // middleware-set cookies are present on follow-up requests.
    mode = 'demo'
  }

  const isDemo = mode !== 'authenticated'
  const isAuthenticated = mode === 'authenticated'

  return {
    mode,
    isDemo,
    isAuthenticated,
    isAdmin: isAuthenticated,
  }
}
