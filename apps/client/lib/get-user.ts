'use server'
import { headers } from 'next/headers'
import { authClient } from './auth-client'

export const getUser = async () => {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  })

  return session?.data?.user
}

export type User = Awaited<ReturnType<typeof getUser>>
