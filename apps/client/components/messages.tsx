'use client'

import { cn, formatDate } from '@/lib/utils'
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom'
import { Button } from './ui/button'
import { ArrowDownIcon } from 'lucide-react'
import { UserAvatar } from './user-avatar'
import type { ChatWithMessages } from '@/lib/types'
import Image from 'next/image'

export function Messages({
  isGroupChat,
  messages,
  currentUserId,
}: {
  isGroupChat: boolean
  messages: ChatWithMessages['messages']
  currentUserId: string
}) {
  return (
    <StickToBottom
      className="relative min-h-0 flex-1"
      resize="smooth"
      initial="instant"
    >
      <StickToBottom.Content className="mb-4 flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {messages.map((m) => {
          const sender = m.sender
          const isOwn = (sender?.id ?? m.sender?.id) === currentUserId

          return (
            <div
              key={m.id}
              className={cn(
                'flex w-full',
                isOwn ? 'justify-end' : 'justify-start'
              )}
            >
              {isOwn ? (
                <div className="flex flex-col gap-1 max-w-[75%]">
                  <p className="text-muted-foreground self-end px-1 text-xs">
                    {formatDate(m.sentAt)}
                  </p>
                  <MessageContent message={m} isOwn={true} />
                </div>
              ) : (
                <div className="flex items-end gap-2.5 max-w-[75%]">
                  {isGroupChat && (
                    <UserAvatar
                      image={sender?.imageUrl}
                      username={sender?.username}
                    />
                  )}
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 px-1">
                      {isGroupChat && (
                        <span className="text-sm font-medium">
                          {sender?.username ?? 'Unknown'}
                        </span>
                      )}
                      <span className="text-muted-foreground text-xs">
                        {formatDate(m.sentAt)}
                      </span>
                    </div>
                    <MessageContent message={m} isOwn={false} />
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
        className="absolute bottom-3 left-[50%] translate-x-[-50%] rounded-full"
        onClick={() => scrollToBottom()}
      >
        <ArrowDownIcon className="size-5" />
      </Button>
    )
  )
}

function MessageContent({
  message,
  isOwn,
}: {
  message: ChatWithMessages['messages'][number]
  isOwn: boolean
}) {
  const imageCount = message.imageUrls?.length ?? 0

  return (
    <div className="flex flex-col gap-2">
      {imageCount > 0 && (
        <div
          className={cn(
            'flex flex-wrap gap-2',
            isOwn ? 'justify-end' : 'justify-start'
          )}
        >
          {message.imageUrls!.map((url, index) => (
            <div
              key={index}
              className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-lg overflow-hidden border border-neutral-300 dark:border-zinc-700 flex-shrink-0"
            >
              <Image
                src={url}
                alt={`Message image ${index + 1}`}
                fill
                className="object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(url, '_blank')}
              />
            </div>
          ))}
        </div>
      )}
      {message.content && (
        <div
          className={cn(
            'rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words',
            isOwn
              ? 'self-end bg-primary text-primary-foreground dark:text-foreground'
              : 'self-start bg-primary/10'
          )}
        >
          {message.content}
        </div>
      )}
    </div>
  )
}
