import { cn, formatDate } from '@/lib/utils'
import { logoutFn } from '@/server/auth'
import { getUserChatsFn } from '@/server/chat'
import type { ChatInfo } from '@/types/chat'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useRouteContext } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { BanIcon, HomeIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { NewChatDialog } from './new-chat-dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Skeleton } from './ui/skeleton'
import { UserAvatar } from './user-avatar'

export function ChatsList() {
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const navigate = useNavigate()
  const params = useParams({ strict: false })
  const chatId = 'chatId' in params ? params.chatId : null
  const { user } = useRouteContext({ from: '__root__' })

  const logoutMutation = useServerFn(logoutFn)
  const getUserChatsQuery = useServerFn(getUserChatsFn)

  const {
    data: chatsData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const result = await getUserChatsQuery()
      return result
    },
  })

  useEffect(() => {
    if (isError) {
      toast.error(error instanceof Error ? error.message : 'Failed to load chats')
    }
  }, [isError, error])

  useEffect(() => {
    if (chatsData && !chatsData.success && chatsData.error) {
      toast.error(chatsData.error)
    }
  }, [chatsData])

  const chats = chatsData?.success ? chatsData.chats : []

  const filteredChats = useMemo(() => {
    if (!search) return chats
    const searchLower = search.toLowerCase()

    return chats.filter((chat) => {
      const memberMatch = chat.members.some((member) => member.username.toLowerCase().includes(searchLower))

      if (chat.is_group && chat.name) {
        const nameMatch = chat.name.toLowerCase().includes(searchLower)
        return nameMatch || memberMatch
      }

      return memberMatch
    })
  }, [chats, search])

  const getOtherParticipant = (chat: (typeof chats)[0]) => {
    if (!user) return null
    return chat.members.find((member) => member.id !== user.id)
  }

  const getChatDisplayName = (chat: (typeof chats)[0]) => {
    if (chat.is_group) {
      return chat.name || 'Group Chat'
    }
    const otherParticipant = getOtherParticipant(chat)
    return otherParticipant?.username || 'Unknown'
  }

  const displayLastMessage = (chat: ChatInfo, currentUserId: string) => {
    const lastMessage = chat.last_message

    if (!lastMessage) {
      return 'Say hello 👋'
    }

    const isOwnMessage = lastMessage.sender?.id === currentUserId
    const senderName = isOwnMessage ? 'You' : lastMessage.sender?.username
    const isGroupChat = chat.is_group
    const senderPrefix = isGroupChat ? `${senderName}: ` : ''

    if (lastMessage.is_deleted) {
      return (
        <span className="flex items-center gap-1">
          <BanIcon className="size-3.5 shrink-0" />
          <span>{isGroupChat ? `${senderName} deleted this message` : 'This message was deleted'}</span>
        </span>
      )
    }

    const imageCount = lastMessage.images?.length ?? 0

    if (!lastMessage.content || lastMessage.content.trim() === '') {
      const imageText = imageCount > 1 ? 'images' : 'an image'
      return `${senderPrefix}${isGroupChat ? 'Sent' : ''} ${imageText}`.trim()
    }

    if (!isGroupChat && isOwnMessage) {
      return `You: ${lastMessage.content}`
    }

    return `${senderPrefix}${lastMessage.content}`
  }

  return (
    <>
      <div className="border-r border-border w-1/4 px-2 py-4 justify-between flex flex-col">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <SearchIcon className="h-5 w-5 text-gray-400 absolute top-2 left-2" />
              <Input
                placeholder="Search"
                className="rounded-full pl-9 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {chatId ? (
              <Button size="icon" variant="outline" className="rounded-full" onClick={() => navigate({ to: '/chats' })}>
                <HomeIcon />
              </Button>
            ) : (
              <Button size="icon" variant="outline" className="rounded-full" onClick={() => setIsDialogOpen(true)}>
                <PlusIcon />
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto">
            {isLoading ? (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              filteredChats.map((chat) => {
                const otherParticipant = getOtherParticipant(chat)
                const displayName = getChatDisplayName(chat)

                return (
                  <Link
                    key={chat.id}
                    to="/chats/$chatId"
                    params={{ chatId: chat.id }}
                    className={cn(
                      'hover:bg-primary/5 block rounded-lg',
                      chat.id === chatId && 'bg-primary/10 hover:bg-primary/10'
                    )}
                  >
                    <div className="flex items-center gap-2 px-3 py-2">
                      {chat.is_group ? (
                        <UserAvatar username={displayName} className="size-10" />
                      ) : (
                        <UserAvatar username={otherParticipant?.username || 'Unknown'} className="size-10" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="line-clamp-1 truncate font-medium">{displayName}</div>
                          <div className="text-muted-foreground ml-2 shrink-0 text-xs">
                            {formatDate(new Date(chat.last_message?.created_at ?? chat.updated_at))}
                          </div>
                        </div>
                        <div className="text-muted-foreground truncate text-sm">
                          {user && displayLastMessage(chat, user.id)}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>

        <Button
          variant="outline"
          size="lg"
          onClick={async () => {
            await logoutMutation()
          }}
        >
          Sign Out
        </Button>
      </div>

      <NewChatDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  )
}
