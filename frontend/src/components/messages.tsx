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

  // Helper function to determine if a message should show header info
  const shouldShowHeader = (currentIndex: number) => {
    if (currentIndex === 0) return true

    const currentMsg = messages[currentIndex]
    const previousMsg = messages[currentIndex - 1]

    // Different sender = new group
    if (currentMsg.sender_id !== previousMsg.sender_id) return true

    // Time gap > 2 minutes = new group
    const currentTime = new Date(currentMsg.created_at).getTime()
    const previousTime = new Date(previousMsg.created_at).getTime()
    const timeDiffMinutes = (currentTime - previousTime) / 1000 / 60

    return timeDiffMinutes > 2
  }

  return (
    <ScrollArea ref={scrollAreaRef} className="relative min-h-0 flex-1">
      <div className="mb-4 flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {hasNextPage && (
          <div ref={observerTarget} className="flex justify-center py-2">
            {isFetchingNextPage && <Loader2Icon className="text-muted-foreground size-5 animate-spin" />}
          </div>
        )}

        {messages.map((m, index) => {
          const isOwn = m.sender_id === currentUserId
          const showHeader = shouldShowHeader(index)

          return (
            <div
              key={m.id}
              className={cn('flex w-full', isOwn ? 'justify-end' : 'justify-start', !showHeader && '-mt-3')}
            >
              {isOwn ? (
                <div className="flex max-w-[75%] flex-col gap-1">
                  {showHeader && (
                    <p className="text-muted-foreground self-end px-1 text-xs">{formatDate(new Date(m.created_at))}</p>
                  )}
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
                    {showHeader && (
                      <div className="flex items-center gap-2 px-1">
                        {isGroupChat && <span className="text-sm font-medium">{m.sender_username}</span>}
                        <span className="text-muted-foreground text-xs">{formatDate(new Date(m.created_at))}</span>
                      </div>
                    )}
                    <MessageContent message={m} isOwn={false} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
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
