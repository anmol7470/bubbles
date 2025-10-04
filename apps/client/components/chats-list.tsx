'use client'

import { Search, BanIcon } from 'lucide-react'
import { Input } from './ui/input'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { cn, formatDate, getDisplayName } from '@/lib/utils'
import { Skeleton } from './ui/skeleton'
import { usePathname } from 'next/navigation'
import { getAllChatsForUser } from '@/lib/db/queries'
import { useQuery } from '@tanstack/react-query'
import { Settings } from './settings'
import { NewChatDialog } from './new-chat-dialog'
import { UserAvatar } from './user-avatar'
import type { ChatWithMembers, User } from '@/lib/types'

export function ChatsList({ user }: { user: User }) {
  const pathname = usePathname()
  const [search, setSearch] = useState('')
  const chatId = pathname.split('/chats/')[1]?.split('/')[0]
  const isChatOpen = pathname?.startsWith('/chats/') && pathname !== '/chats'

  const { data: chats, isLoading } = useQuery({
    queryKey: ['chats', user.id],
    queryFn: () => getAllChatsForUser(user.id),
  })

  const filteredChats = useMemo(() => {
    return chats?.filter((chat) =>
      chat.isGroupChat
        ? chat.groupChatName?.toLowerCase().includes(search.toLowerCase())
        : chat.members.some((member) =>
            member.user?.username?.toLowerCase().includes(search.toLowerCase())
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
            <Settings user={user} />
            <NewChatDialog user={user} />
          </div>
        </div>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search your chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 focus-visible:ring-0 h-10"
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
              {search
                ? `No chats found for "${search}"`
                : 'No chats found. Create one to start chatting.'}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredChats &&
                filteredChats.map((chat) => {
                  const otherParticipant = chat.members.filter(
                    (member) => member.user?.id !== user.id
                  )[0]?.user

                  return (
                    <Link
                      key={chat.id}
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
                            image={otherParticipant?.imageUrl ?? null}
                            username={getDisplayName(otherParticipant) ?? null}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="line-clamp-1 truncate font-medium">
                              {chat.isGroupChat
                                ? chat.groupChatName
                                : getDisplayName(otherParticipant)}
                            </div>
                            <div className="text-muted-foreground ml-2 shrink-0 text-xs">
                              {formatDate(
                                chat.messages[0]?.sentAt ?? chat.createdAt
                              )}
                            </div>
                          </div>
                          <div className="text-muted-foreground truncate text-sm">
                            {displayLastMessage(chat, user.id)}
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

function displayLastMessage(chat: ChatWithMembers, currentUserId: string) {
  const lastMessage = chat.messages?.[0]

  // If there's no last message at all (newly created chat)
  if (!lastMessage) {
    return 'Say hello 👋'
  }

  const isOwnMessage = lastMessage.senderId === currentUserId
  const senderName = isOwnMessage
    ? 'You'
    : lastMessage.sender?.username && lastMessage.sender?.isActive !== false
      ? lastMessage.sender.username
      : 'Anonymous User'
  const senderPrefix = `${senderName}: `

  // If message is deleted
  if (lastMessage.isDeleted) {
    return (
      <span className="flex items-center gap-1">
        <BanIcon className="size-3.5 flex-shrink-0" />
        <span>{senderName} deleted this message</span>
      </span>
    )
  }

  const imageCount = lastMessage.images?.length ?? 0

  // If content is empty but there was a message sent (image-only message)
  if (!lastMessage.content || lastMessage.content.trim() === '') {
    const imageText = imageCount > 1 ? 'images' : 'an image'
    return `${senderPrefix}Sent ${imageText}`
  }

  // Regular text message (with or without images)
  return `${senderPrefix}${lastMessage.content}`
}
