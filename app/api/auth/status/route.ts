import { getRequestMode } from '@/lib/server/auth-mode'
import { fail, ok } from '@/lib/server/http'

export async function GET() {
  try {
    const mode = await getRequestMode()

    return ok({
      mode: mode.mode,
      isAuthenticated: mode.isAuthenticated,
      isDemo: mode.isDemo,
    })
  } catch (error) {
    console.error('GET /api/auth/status failed', error)
    return fail(500, 'INTERNAL_ERROR', 'Unable to check auth status')
  }
}
