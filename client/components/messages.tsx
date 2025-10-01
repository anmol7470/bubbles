'use client'

import { cn, formatDate } from '@/lib/utils'
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom'
import { Button } from './ui/button'
import { ArrowDown } from 'lucide-react'
import { UserAvatar } from './user-avatar'
import type { ChatWithMessages } from '@/lib/types'

export function Messages({
  messages,
  currentUserId,
}: {
  messages: ChatWithMessages['messages']
  currentUserId: string
}) {
  return (
    <StickToBottom
      className="relative min-h-0 flex-1"
      resize="smooth"
      initial="instant"
    >
      <StickToBottom.Content className="mb-4 flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const sender = m.sender
          const isOwn = (sender?.id ?? m.sender?.id) === currentUserId

          return (
            <div
              key={m.id}
              className={cn(
                'flex flex-col gap-2',
                isOwn ? 'justify-end' : 'justify-start'
              )}
            >
              {isOwn ? (
                <>
                  <p className="text-muted-foreground self-end px-1 text-xs">
                    {formatDate(m.sentAt)}
                  </p>
                  <div className="bg-primary text-primary-foreground max-w-[70%] self-end rounded-xl px-3 py-2 text-sm whitespace-pre-wrap">
                    {m.content}
                  </div>
                </>
              ) : (
                <div className="flex max-w-[60%] items-end gap-2.5">
                  <UserAvatar
                    image={sender?.imageUrl}
                    username={sender?.username}
                  />
                  <div className="flex w-full flex-col gap-1">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-sm font-medium">
                        {sender?.username ?? 'Unknown'}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatDate(m.sentAt)}
                      </span>
                    </div>
                    <div className="dark:bg-accent bg-primary/10 text-foreground self-start rounded-xl px-3 py-2 text-sm whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        <ScrollToBottom />
      </StickToBottom.Content>
    </StickToBottom>
  )
}

function ScrollToBottom() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext()

  return (
    !isAtBottom && (
      <Button
        size="icon"
        variant="outline"
        className="absolute bottom-3 left-[50%] translate-x-[-50%] rounded-full shadow-lg"
        onClick={() => scrollToBottom()}
      >
        <ArrowDown className="size-5" />
      </Button>
    )
  )
}
