import { useScroll } from '@/hooks/use-scroll'
import { orpc } from '@/lib/orpc'
import { cn, formatDate } from '@/lib/utils'
import { useInfiniteQuery } from '@tanstack/react-query'
import { ArrowDownIcon, Loader2Icon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { UserAvatar } from './chats-list'
import { MessageContent } from './message-content'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'

type MessagesProps = {
  chatId: string
  isGroupChat: boolean
  currentUserId: string
  typingUsers: { userId: string; username: string }[]
  chatMemberIds: string[]
}

export function Messages({ chatId, isGroupChat, currentUserId, typingUsers, chatMemberIds }: MessagesProps) {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery(
    orpc.chat.getChatMessages.infiniteOptions({
      input: (pageParam: { sentAt: Date; id: string } | undefined) => ({
        chatId,
        limit: 50,
        cursor: pageParam,
      }),
      initialPageParam: undefined as { sentAt: Date; id: string } | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    })
  )

  const observerTarget = useRef<HTMLDivElement>(null)
  const messages = useMemo(() => data?.pages.flatMap((page) => page.items).reverse() ?? [], [data?.pages])

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

  // Helper function to determine if a message should show header info
  const shouldShowHeader = (currentIndex: number) => {
    if (currentIndex === 0) return true

    const currentMsg = messages[currentIndex]
    const previousMsg = messages[currentIndex - 1]

    // Different sender = new group
    const currentSenderId = currentMsg.sender?.id ?? currentMsg.senderId
    const previousSenderId = previousMsg.sender?.id ?? previousMsg.senderId
    if (currentSenderId !== previousSenderId) return true

    // Time gap > 2 minutes = new group
    const currentTime = new Date(currentMsg.sentAt).getTime()
    const previousTime = new Date(previousMsg.sentAt).getTime()
    const timeDiffMinutes = (currentTime - previousTime) / 1000 / 60

    return timeDiffMinutes > 2
  }

  const { scrollToBottom, scrollAreaRef, isAtBottom } = useScroll(messages, typingUsers)

  return (
    <ScrollArea ref={scrollAreaRef} className="relative min-h-0 flex-1">
      <div className="mb-4 flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {!isLoading && (
          <>
            {!isFetchingNextPage && hasNextPage && (
              <div ref={observerTarget} className="flex justify-center py-2">
                {isFetchingNextPage && <Loader2Icon className="text-muted-foreground size-5 animate-spin" />}
              </div>
            )}

            {messages.map((m, index) => {
              const sender = m.sender
              const isOwn = (sender?.id ?? m.sender?.id) === currentUserId
              const showHeader = shouldShowHeader(index)

              return (
                <div
                  key={m.id}
                  className={cn('flex w-full', isOwn ? 'justify-end' : 'justify-start', !showHeader && '-mt-3')}
                >
                  {isOwn ? (
                    <div className="flex max-w-[75%] flex-col gap-1">
                      {showHeader && (
                        <p className="text-muted-foreground self-end px-1 text-xs">
                          {formatDate(m.sentAt)}
                          {m.isEdited && !m.isDeleted && <span className="ml-2 text-xs italic">(edited)</span>}
                        </p>
                      )}
                      <MessageContent
                        message={m}
                        isOwn={true}
                        isEditing={editingMessageId === m.id}
                        onEditStart={() => setEditingMessageId(m.id)}
                        onEditEnd={() => setEditingMessageId(null)}
                        chatMemberIds={chatMemberIds}
                      />
                    </div>
                  ) : (
                    <div className="flex max-w-[75%] items-end gap-2.5">
                      {isGroupChat && (
                        <div className="h-10 w-10 shrink-0">
                          {showHeader && (
                            <UserAvatar image={sender?.image ?? null} username={sender?.username ?? null} />
                          )}
                        </div>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        {showHeader && (
                          <div className="flex items-center gap-2 px-1">
                            {isGroupChat && <span className="text-sm font-medium">{sender?.username ?? ''}</span>}
                            <span className="text-muted-foreground text-xs">
                              {formatDate(m.sentAt)}
                              {m.isEdited && !m.isDeleted && <span className="ml-2 text-xs italic">(edited)</span>}
                            </span>
                          </div>
                        )}
                        <MessageContent
                          message={m}
                          isOwn={false}
                          isEditing={false}
                          onEditStart={() => {}}
                          onEditEnd={() => {}}
                          chatMemberIds={chatMemberIds}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {typingUsers.length > 0 && <TypingIndicator typingUsers={typingUsers} isGroupChat={isGroupChat} />}
          </>
        )}
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

function TypingIndicator({
  typingUsers,
  isGroupChat,
}: {
  typingUsers: { userId: string; username: string }[]
  isGroupChat: boolean
}) {
  const typingText = () => {
    if (typingUsers.length === 1) {
      return isGroupChat ? `${typingUsers[0].username} is typing...` : 'typing...'
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`
    } else {
      return 'Multiple people are typing...'
    }
  }

  return (
    <div className="flex w-full justify-start">
      <div className="flex max-w-[75%] items-end gap-2.5">
        <div className="flex flex-col gap-1">
          <div className="bg-primary/10 flex items-center gap-1 rounded-xl px-3 py-2">
            <span className="text-muted-foreground text-xs">{typingText()}</span>
            <div className="ml-1 flex gap-1">
              <div className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]" />
              <div className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]" />
              <div className="bg-muted-foreground/60 h-1.5 w-1.5 animate-bounce rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
