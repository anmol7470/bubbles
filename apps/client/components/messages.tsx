'use client'

import { cn, formatDate } from '@/lib/utils'
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom'
import { Button } from './ui/button'
import { ArrowDownIcon } from 'lucide-react'
import { UserAvatar } from './user-avatar'
import type { ChatWithMessages } from '@/lib/types'
import { useState } from 'react'
import { MessageContent } from './message-content'

export function Messages({
  isGroupChat,
  messages,
  currentUserId,
  chatId,
  participants,
  typingUsers = [],
}: {
  isGroupChat: boolean
  messages: ChatWithMessages['messages']
  currentUserId: string
  chatId: string
  participants: string[]
  typingUsers?: { userId: string; username: string }[]
}) {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)

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

  return (
    <StickToBottom
      className="relative min-h-0 flex-1"
      resize="smooth"
      initial="instant"
    >
      <StickToBottom.Content className="mb-4 flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {messages.map((m, index) => {
          const sender = m.sender
          const isOwn = (sender?.id ?? m.sender?.id) === currentUserId
          const showHeader = shouldShowHeader(index)

          return (
            <div
              key={m.id}
              className={cn(
                'flex w-full',
                isOwn ? 'justify-end' : 'justify-start',
                !showHeader && '-mt-3'
              )}
            >
              {isOwn ? (
                <div className="flex flex-col gap-1 max-w-[75%]">
                  {showHeader && (
                    <p className="text-muted-foreground self-end px-1 text-xs">
                      {formatDate(m.sentAt)}
                      {m.isEdited && !m.isDeleted && (
                        <span className="ml-2 text-xs italic">(edited)</span>
                      )}
                    </p>
                  )}
                  <MessageContent
                    message={m}
                    isOwn={true}
                    chatId={chatId}
                    participants={participants}
                    isEditing={editingMessageId === m.id}
                    onEditStart={() => setEditingMessageId(m.id)}
                    onEditEnd={() => setEditingMessageId(null)}
                  />
                </div>
              ) : (
                <div className="flex items-end gap-2.5 max-w-[75%]">
                  {isGroupChat && (
                    <div className="w-10 h-10 flex-shrink-0">
                      {showHeader && (
                        <UserAvatar
                          image={sender?.imageUrl}
                          username={sender?.username}
                        />
                      )}
                    </div>
                  )}
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    {showHeader && (
                      <div className="flex items-center gap-2 px-1">
                        {isGroupChat && (
                          <span className="text-sm font-medium">
                            {sender?.username ?? 'Unknown'}
                          </span>
                        )}
                        <span className="text-muted-foreground text-xs">
                          {formatDate(m.sentAt)}
                          {m.isEdited && !m.isDeleted && (
                            <span className="ml-2 text-xs italic">
                              (edited)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    <MessageContent
                      message={m}
                      isOwn={false}
                      chatId={chatId}
                      participants={participants}
                      isEditing={false}
                      onEditStart={() => {}}
                      onEditEnd={() => {}}
                    />
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
