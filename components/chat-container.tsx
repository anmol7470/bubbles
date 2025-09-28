'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ImagePlusIcon, Loader2Icon, SmilePlusIcon, XIcon } from 'lucide-react'
import { Input } from './ui/input'
import { Messages } from './messages'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import { useTheme } from 'next-themes'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Button } from './ui/button'
import type { User } from '@/lib/types'
import { UserAvatar } from './user-avatar'
import { getChatById } from '@/lib/db/queries'

export function ChatContainer({
  chatId,
  user,
}: {
  chatId: string
  user: User
}) {
  const router = useRouter()
  const { theme } = useTheme()
  const [message, setMessage] = useState('')
  const messageInputRef = useRef<HTMLInputElement | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)

  const { data: chat, isLoading } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => getChatById(chatId, user.id),
  })

  // If chat is not found, route away
  useEffect(() => {
    if (!isLoading && !chat) {
      toast.error(`Chat ${chatId} not found`)
      router.push('/chats')
    }
  }, [isLoading, chat, router, chatId])

  const otherParticipant = useMemo(() => {
    if (!chat || chat.isGroupChat) return null
    return chat.members.filter((member) => member.user.id !== user.id)[0].user
  }, [chat, user.id])

  return (
    <div className="bg-muted dark:bg-background flex flex-1 flex-col overflow-hidden">
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2Icon className="animate-spin" />
        </div>
      ) : (
        chat && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="bg-background/80 flex h-14 items-center gap-3 border-b border-gray-200 px-4 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                {chat.isGroupChat ? (
                  <UserAvatar
                    image={null}
                    username={chat.groupChatName ?? null}
                  />
                ) : (
                  <UserAvatar
                    image={otherParticipant?.imageUrl ?? null}
                    username={otherParticipant?.username ?? null}
                  />
                )}
                <div className="font-medium">
                  {chat.isGroupChat
                    ? chat.groupChatName
                    : otherParticipant?.username}
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="ml-auto flex md:hidden"
                onClick={() => router.push('/chats')}
              >
                <XIcon className="size-5" />
              </Button>
            </div>

            <Messages messages={chat?.messages ?? []} currentUserId={user.id} />

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (message.trim() === '') return
                // TODO: Send message
                setMessage('')
              }}
              className="flex items-center gap-2 px-3 pb-3"
            >
              <div className="relative flex-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Select image"
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 h-8 w-8"
                >
                  <ImagePlusIcon className="size-5" />
                </Button>
                <Input
                  ref={messageInputRef}
                  autoFocus
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="bg-background dark:bg-input/30 pl-12 pr-4 focus-visible:ring-0 h-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      e.currentTarget.form?.requestSubmit()
                    }
                  }}
                />
              </div>
              <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label="Open emoji picker"
                  >
                    <SmilePlusIcon className="size-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-fit overflow-hidden p-0"
                >
                  <EmojiPicker
                    lazyLoadEmojis
                    theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                    width={320}
                    onEmojiClick={(emoji) => {
                      setMessage((prev) => prev + emoji.emoji)
                      messageInputRef.current?.focus()
                      setEmojiOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </form>
          </div>
        )
      )}
    </div>
  )
}
