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
  typingUsers = [],
}: {
  isGroupChat: boolean
  messages: ChatWithMessages['messages']
  currentUserId: string
  typingUsers?: { userId: string; username: string }[]
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
        {typingUsers.length > 0 && (
          <TypingIndicator
            typingUsers={typingUsers}
            isGroupChat={isGroupChat}
          />
        )}
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

function TypingIndicator({
  typingUsers,
  isGroupChat,
}: {
  typingUsers: { userId: string; username: string }[]
  isGroupChat: boolean
}) {
  const typingText = () => {
    if (typingUsers.length === 1) {
      return isGroupChat
        ? `${typingUsers[0].username} is typing...`
        : 'typing...'
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`
    } else {
      return 'Multiple people are typing...'
    }
  }

  return (
    <div className="flex w-full justify-start">
      <div className="flex items-end gap-2.5 max-w-[75%]">
        <div className="flex flex-col gap-1">
          <div className="rounded-xl px-3 py-2 bg-primary/10 flex items-center gap-1">
            <span className="text-muted-foreground text-xs">
              {typingText()}
            </span>
            <div className="flex gap-1 ml-1">
              <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      </div>
    </div>
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
                sizes="100vw"
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
