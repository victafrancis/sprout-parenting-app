import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { DEMO_COOKIE_NAME, ONE_DAY_IN_SECONDS, SESSION_COOKIE_NAME } from '@/lib/server/auth/constants'

const DEMO_COOKIE_MAX_AGE = 365 * ONE_DAY_IN_SECONDS

export function middleware(request: NextRequest) {
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value)
  const hasDemoCookie = request.cookies.get(DEMO_COOKIE_NAME)?.value === 'true'

  if (hasSessionCookie || hasDemoCookie) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  response.cookies.set(DEMO_COOKIE_NAME, 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DEMO_COOKIE_MAX_AGE,
  })

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
