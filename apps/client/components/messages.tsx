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
                  <div className="flex flex-col gap-2 max-w-[70%] self-end">
                    <MessageContent message={m} isOwn={true} />
                  </div>
                </>
              ) : (
                <div className="flex max-w-[60%] items-end gap-2.5">
                  {isGroupChat && (
                    <UserAvatar
                      image={sender?.imageUrl}
                      username={sender?.username}
                    />
                  )}
                  <div className="flex w-full flex-col gap-1">
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
                    <div className="flex flex-col gap-2">
                      <MessageContent message={m} isOwn={false} />
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
    <>
      {imageCount > 0 &&
        (imageCount === 1 ? (
          <div
            className={cn(
              'w-full flex',
              isOwn ? 'justify-end' : 'justify-start'
            )}
          >
            <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-lg overflow-hidden border border-neutral-300 dark:border-zinc-700">
              <Image
                src={message.imageUrls![0]}
                alt="Image 1"
                fill
                className="object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(message.imageUrls![0], '_blank')}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
            {message.imageUrls!.map((url, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden border border-neutral-300 dark:border-zinc-700"
              >
                <Image
                  src={url}
                  alt={`Image ${index + 1}`}
                  fill
                  className="object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(url, '_blank')}
                />
              </div>
            ))}
          </div>
        ))}
      {message.content && (
        <div
          className={cn(
            'rounded-xl px-3 py-2 text-sm whitespace-pre-wrap',
            isOwn
              ? 'self-end bg-primary text-primary-foreground dark:text-foreground'
              : 'self-start bg-primary/10'
          )}
        >
          {message.content}
        </div>
      )}
    </>
  )
}
