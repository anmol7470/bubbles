'use client'

import type { User } from '@/lib/get-user'
import { orpc } from '@/lib/orpc'
import { useQuery } from '@tanstack/react-query'

export function ChatsList({ user }: { user: User }) {
  const { data } = useQuery(orpc.chat.getChats.queryOptions({ input: { limit: 10, offset: 0 } }))
  return <div>{JSON.stringify(data)}</div>
}
