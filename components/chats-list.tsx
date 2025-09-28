'use client'

import { Search } from 'lucide-react'
import { Input } from './ui/input'
import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { cn, formatDate } from '@/lib/utils'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Skeleton } from './ui/skeleton'
import { usePathname } from 'next/navigation'
import { getAllChatsForUser } from '@/lib/db/queries'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Settings } from './settings'
import { NewChatDialog } from './new-chat-dialog'
import { UserAvatar } from './user-avatar'
import type {
  User,
  SupabaseChannel,
  NewChatPayload,
  ChatWithMembers,
} from '@/lib/types'

export function ChatsList({ user }: { user: User }) {
  const [search, setSearch] = useState('')
  const pathname = usePathname()
  const chatId = pathname.split('/chats/')[1]
  const isChatOpen = pathname?.startsWith('/chats/') && pathname !== '/chats'
  const queryClient = useQueryClient()
  const supabase = createSupabaseClient()
  const [newChatChannel, setNewChatChannel] = useState<SupabaseChannel | null>(
    null
  )

  const { data: chats, isLoading } = useQuery({
    queryKey: ['chats', user.id],
    queryFn: () => getAllChatsForUser(user.id),
  })

  useEffect(() => {
    const channel = supabase.channel('new-chat', {
      config: {
        broadcast: {
          self: true,
        },
      },
    })
    setNewChatChannel(channel)

    channel
      .on(
        'broadcast' as const,
        { event: 'chatCreated' },
        (payload: { payload: NewChatPayload }) => {
          const { chat } = payload.payload

          // Check if the current user is a member of this new chat
          const isUserMember = chat.members.some(
            (member) => member.user.id === user.id
          )

          if (isUserMember) {
            // Add the new chat to the existing chats list
            queryClient.setQueryData(
              ['chats', user.id],
              (oldChats: ChatWithMembers[]) => {
                if (!oldChats) return [chat]

                // Check if chat already exists to avoid duplicates
                const chatExists = oldChats.some(
                  (existingChat) => existingChat.id === chat.id
                )

                if (!chatExists) {
                  return [chat, ...oldChats]
                }

                return oldChats
              }
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, user.id, queryClient])

  const filteredChats = useMemo(() => {
    return chats?.filter((chat) =>
      chat.isGroupChat
        ? chat.groupChatName?.toLowerCase().includes(search.toLowerCase())
        : chat.members.some((member) =>
            member.user.username?.toLowerCase().includes(search.toLowerCase())
          )
    )
  }, [chats, search])

  return (
    <div
      className={
        (isChatOpen ? 'hidden md:block' : 'block') +
        ' w-full flex-shrink-0 md:w-1/4'
      }
    >
      <div className="flex h-full w-full flex-col space-y-4 border-r border-neutral-300 p-3 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <Link className="cursor-pointer text-lg font-medium" href="/chats">
            Chats
          </Link>
          <div className="flex items-center">
            <Settings />
            <NewChatDialog user={user} newChatChannel={newChatChannel} />
          </div>
        </div>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search your chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 focus-visible:ring-0"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-13 w-full" />
              ))}
            </div>
          ) : filteredChats && filteredChats.length === 0 ? (
            <div className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
              No chats found. Create one to start chatting.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredChats &&
                filteredChats.map((chat, i) => {
                  const otherParticipant = chat.members.filter(
                    (member) => member.user.id !== user.id
                  )[0].user

                  return (
                    <Link
                      key={i}
                      href={`/chats/${chat.id}`}
                      className={cn(
                        'hover:bg-primary/5 block rounded-lg',
                        chat.id === chatId &&
                          'bg-primary/10 hover:bg-primary/10'
                      )}
                    >
                      <div className="flex items-center gap-2 px-3 py-2">
                        {chat.isGroupChat ? (
                          <UserAvatar
                            image={null}
                            username={chat.groupChatName ?? null}
                          />
                        ) : (
                          <UserAvatar
                            image={otherParticipant.imageUrl ?? null}
                            username={otherParticipant.username ?? null}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="line-clamp-1 truncate font-medium">
                              {chat.isGroupChat
                                ? chat.groupChatName
                                : otherParticipant.username}
                            </div>
                            <div className="text-muted-foreground ml-2 shrink-0 text-xs">
                              {chat.lastMessageSentAt &&
                                formatDate(chat.lastMessageSentAt)}
                            </div>
                          </div>
                          <div className="text-muted-foreground line-clamp-2 truncate text-sm">
                            {chat.lastMessageContent || 'Say hello 👋'}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
