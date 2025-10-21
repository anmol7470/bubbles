'use server'
import { headers } from 'next/headers'
import { authClient } from './auth-client'

export const getUser = async (request?: Request) => {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: request?.headers ?? (await headers()),
    },
  })

  return session?.data?.user
}

export type User = NonNullable<Awaited<ReturnType<typeof getUser>>>
