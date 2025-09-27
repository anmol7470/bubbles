import 'server-only'
import { headers } from 'next/headers'
import { auth } from '.'

export async function getUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    return null
  }

  return session.user
}

export type User = NonNullable<Awaited<ReturnType<typeof getUser>>>
