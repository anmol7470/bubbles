import { useChatWebSocket } from '@/hooks/use-chat-websocket'
import { useScroll } from '@/hooks/use-scroll'
import { cn, formatDate } from '@/lib/utils'
import { getChatMessagesFn } from '@/server/chat'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { ArrowDownIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { MessageContent } from './message-content'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { UserAvatar } from './user-avatar'

type MessagesProps = {
  chatId: string
  isGroupChat: boolean
  currentUserId: string
}

export function Messages({ chatId, isGroupChat, currentUserId }: MessagesProps) {
  const getChatMessagesQuery = useServerFn(getChatMessagesFn)
  const observerTarget = useRef<HTMLDivElement>(null)

  useChatWebSocket(chatId)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['messages', chatId],
    queryFn: async ({ pageParam }) => {
      const result = await getChatMessagesQuery({
        data: {
          chat_id: chatId,
          limit: 50,
          cursor: pageParam,
        },
      })
      return result
    },
    initialPageParam: undefined as { sent_at: string; id: string } | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.success && lastPage.next_cursor) {
        return lastPage.next_cursor
      }
      return undefined
    },
  })

  const messages = useMemo(() => {
    if (!data?.pages) return []
    return data.pages.flatMap((page) => (page.success ? page.items : [])).reverse()
  }, [data?.pages])

  const groupedMessages = useMemo(() => {
    const groups: {
      key: string
      label: string
      items: { message: (typeof messages)[number]; index: number }[]
    }[] = []

    messages.forEach((message, index) => {
      const createdAt = new Date(message.created_at)
      const dayKey = createdAt.toDateString()

      if (!groups.length || groups[groups.length - 1].key !== dayKey) {
        groups.push({
          key: dayKey,
          label: formatDate(createdAt, { mode: 'day-label' }),
          items: [],
        })
      }

      groups[groups.length - 1].items.push({ message, index })
    })

    return groups
  }, [messages])

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 1.0 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const { scrollToBottom, scrollAreaRef, isAtBottom } = useScroll(messages)

  const isSameDay = (dateA: Date, dateB: Date) => dateA.toDateString() === dateB.toDateString()

  const getTimeDiffMinutes = (dateA: Date, dateB: Date) => {
    return Math.abs(dateA.getTime() - dateB.getTime()) / 1000 / 60
  }

  // Helper function to determine if a message should show header info
  const shouldShowHeader = (currentIndex: number) => {
    if (currentIndex === 0) return true

    const currentMsg = messages[currentIndex]
    const previousMsg = messages[currentIndex - 1]
    if (!previousMsg) return true

    const currentDate = new Date(currentMsg.created_at)
    const previousDate = new Date(previousMsg.created_at)

    if (!isSameDay(currentDate, previousDate)) return true

    // Different sender = new group
    if (currentMsg.sender_id !== previousMsg.sender_id) return true

    // Time gap > 2 minutes = new group
    const timeDiffMinutes = getTimeDiffMinutes(currentDate, previousDate)

    return timeDiffMinutes > 2
  }

  const isChainedWithPrevious = (currentIndex: number) => {
    if (currentIndex === 0) return false

    const currentMsg = messages[currentIndex]
    const previousMsg = messages[currentIndex - 1]
    if (!previousMsg) return false

    const currentDate = new Date(currentMsg.created_at)
    const previousDate = new Date(previousMsg.created_at)

    if (!isSameDay(currentDate, previousDate)) return false
    if (currentMsg.sender_id !== previousMsg.sender_id) return false

    return getTimeDiffMinutes(currentDate, previousDate) <= 2
  }

  return (
    <ScrollArea ref={scrollAreaRef} className="relative min-h-0 flex-1">
      <div className="mb-4 flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {hasNextPage && (
          <div ref={observerTarget} className="flex justify-center py-2">
            {isFetchingNextPage && <Loader2Icon className="text-muted-foreground size-5 animate-spin" />}
          </div>
        )}

        {groupedMessages.map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            <div className="flex justify-center">
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {group.label}
              </span>
            </div>
            <div className="flex flex-col">
              {group.items.map(({ message: m, index }, itemIndex) => {
                const isOwn = m.sender_id === currentUserId
                const showHeader = shouldShowHeader(index)
                const isChained = isChainedWithPrevious(index)
                const marginTopClass = itemIndex === 0 ? 'mt-2' : isChained ? 'mt-1' : 'mt-3'

                return (
                  <div key={m.id} className={marginTopClass}>
                    <div className={cn('flex w-full', isOwn ? 'justify-end' : 'justify-start')}>
                      {isOwn ? (
                        <div className="flex max-w-[75%] flex-col gap-1">
                          <MessageContent message={m} isOwn={true} />
                        </div>
                      ) : (
                        <div className="flex max-w-[75%] items-end gap-2.5">
                          {isGroupChat && (
                            <div className="h-10 w-10 shrink-0">
                              {showHeader && <UserAvatar username={m.sender_username} />}
                            </div>
                          )}
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            {showHeader && isGroupChat && (
                              <div className="flex items-center gap-2 px-1">
                                <span className="text-sm font-medium">{m.sender_username}</span>
                              </div>
                            )}
                            <MessageContent message={m} isOwn={false} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {!isAtBottom && (
        <Button
          size="icon"
          variant="outline"
          className="absolute bottom-3 left-[50%] translate-x-[-50%] rounded-full"
          onClick={scrollToBottom}
        >
          <ArrowDownIcon className="size-5" />
        </Button>
      )}
    </ScrollArea>
  )
}
