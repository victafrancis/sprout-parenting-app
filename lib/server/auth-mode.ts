import { cookies } from 'next/headers'

export async function getRequestMode() {
  const cookieStore = await cookies()
  const isDemo = cookieStore.get('demo')?.value === 'true'

  return {
    isDemo,
    isAdmin: !isDemo,
  }
}
