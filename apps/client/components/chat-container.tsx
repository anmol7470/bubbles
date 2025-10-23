'use client'

import { useImageUpload } from '@/hooks/use-image-upload'
import { useTypingIndicator } from '@/hooks/use-typing-indicators'
import type { User } from '@/lib/get-user'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import { ImagePlusIcon, SmilePlusIcon, XIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-hot-toast'
import { UserAvatar } from './chats-list'
import { Messages } from './messages'
import { Button } from './ui/button'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Textarea } from './ui/textarea'
import { useWsClient } from './ws-provider'

export function ChatContainer({ chatId, user }: { chatId: string; user: User }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { socket, typingUsers } = useWsClient()
  const { theme } = useTheme()
  const [message, setMessage] = useState('')
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)

  const { data: chat, isLoading } = useQuery(orpc.chat.getChatById.queryOptions({ input: { chatId } }))

  const { isTyping, handleTyping, stopTyping } = useTypingIndicator(socket, chat, chatId, user.id, user.username!)

  const { mutate: markChatAsRead } = useMutation(
    orpc.chat.markChatAsRead.mutationOptions({
      onSuccess: () => {
        queryClient.refetchQueries({ queryKey: orpc.chat.getUnreadCounts.key({ type: 'query' }) })
      },
    })
  )

  // If chat is not found, route away
  if (!isLoading && !chat) {
    toast.error(`Chat ${chatId} not found`)
    router.push('/chats')
  }

  const { imageInputRef, selectedImages, isUploading, handleFileSelect, uploadImages, clearSelected, removeImage } =
    useImageUpload({ maxCount: 5 })

  const otherParticipant = chat?.members.filter((member) => member.user?.id !== user.id)[0].user

  const { mutateAsync: sendMessage, isPending: isSendingMessage } = useMutation(
    orpc.message.sendMessage.mutationOptions({
      onSettled: () => {
        // Use requestAnimationFrame to ensure input is enabled before focusing
        requestAnimationFrame(() => {
          messageInputRef.current?.focus()
        })
      },
    })
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      // Simulate a file input change event
      const dataTransfer = new DataTransfer()
      acceptedFiles.forEach((file) => dataTransfer.items.add(file))
      const event = {
        target: { files: dataTransfer.files, value: '' },
      } as React.ChangeEvent<HTMLInputElement>
      handleFileSelect(event)
    },
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    noClick: true,
    noKeyboard: true,
    disabled: selectedImages.length >= 5 || isSendingMessage || isUploading,
  })

  const handleSendMessage = async () => {
    if (message.trim() === '' && selectedImages.length === 0) return

    const messageContent = message.trim() || ''
    const imagesToSend = [...selectedImages]

    setMessage('')
    clearSelected()
    stopTyping()

    try {
      let imageUrls: string[] = []

      // Upload images if any
      if (imagesToSend.length > 0) {
        const uploadedImages = await toast
          .promise(uploadImages(), {
            loading: 'Uploading images...',
            success: 'Images uploaded successfully',
            error: 'Failed to upload images',
          })
          .catch(() => {
            setMessage(messageContent)
            return []
          })

        imageUrls = uploadedImages.map((img) => img.uploadedUrl).filter(Boolean)
      }

      await sendMessage({
        content: messageContent,
        chatId,
        chatMemberIds: chat?.members.map((m) => m.user?.id).filter((id): id is string => !!id) ?? [],
        images: imageUrls,
      })
    } catch (error) {
      // On error, message is already cleared, just show error
      toast.error(error instanceof Error ? error.message : 'Failed to send message')
    }
  }

  useEffect(() => {
    if (!chat) return

    if (chat?.type === 'groupchat') {
      document.title = `${chat.name} - Bubbles`
    } else {
      document.title = `${otherParticipant?.username} - Bubbles`
    }
  }, [chat, otherParticipant])

  // Mark chat as read when entering the chat - always update lastReadAt
  useEffect(() => {
    markChatAsRead({ chatId })
  }, [chatId, markChatAsRead])

  return (
    <div
      {...getRootProps()}
      className={cn(
        'bg-background relative flex flex-1 flex-col overflow-hidden',
        isDragActive && 'ring-primary ring-2 ring-inset'
      )}
    >
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="bg-background/80 absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="text-primary flex flex-col items-center gap-2">
            <ImagePlusIcon className="size-12" />
            <p className="text-lg font-medium">Drop images here</p>
          </div>
        </div>
      )}
      {isLoading
        ? null
        : chat && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="bg-background/80 flex h-14 items-center gap-3 border-b border-neutral-300 px-4 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  {chat.type === 'groupchat' ? (
                    <UserAvatar className="size-8" image={undefined} username={chat.name} />
                  ) : (
                    <UserAvatar
                      className="size-8"
                      image={otherParticipant?.image}
                      username={otherParticipant?.username}
                    />
                  )}
                  <div className="font-medium">
                    {chat.type === 'groupchat' ? chat.name : otherParticipant?.username}
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

              <Messages
                isGroupChat={chat.type === 'groupchat'}
                currentUserId={user.id}
                chatId={chatId}
                typingUsers={typingUsers[chatId] || []}
                chatMemberIds={chat.members.map((m) => m.user?.id).filter((id): id is string => !!id)}
              />

              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  await handleSendMessage()
                }}
                className="flex flex-col gap-2 border-t border-neutral-300 px-3 py-2 dark:border-zinc-800"
              >
                {/* Image Preview */}
                {selectedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-1">
                    {selectedImages.map((image, index) => (
                      <div
                        key={index}
                        className="bg-muted relative h-20 w-20 overflow-hidden rounded-lg border border-neutral-300 dark:border-zinc-700"
                      >
                        <Image
                          src={image.previewUrl}
                          alt={`Selected image ${index + 1}`}
                          className="h-full w-full object-cover"
                          width={80}
                          height={80}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 h-5 w-5 rounded-full shadow-md"
                          onClick={() => removeImage(index)}
                        >
                          <XIcon className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Select image"
                      className="absolute top-1/2 left-2 z-10 h-8 w-8 -translate-y-1/2 transform"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={selectedImages.length >= 5 || isSendingMessage || isUploading}
                    >
                      <ImagePlusIcon className="size-5" />
                    </Button>
                    <input
                      type="file"
                      className="hidden"
                      ref={imageInputRef}
                      onChange={handleFileSelect}
                      accept="image/*"
                      multiple
                    />
                    <Textarea
                      ref={messageInputRef}
                      autoFocus
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value)
                        if (e.target.value.length > 0) {
                          handleTyping()
                        } else if (isTyping) {
                          stopTyping()
                        }
                      }}
                      rows={1}
                      placeholder={isUploading ? 'Uploading images...' : 'Type a message...'}
                      className="bg-background dark:bg-input/30 max-h-40 min-h-10 resize-none pr-4 pl-12 focus-visible:ring-0"
                      disabled={isSendingMessage || isUploading}
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
                      <Button type="button" size="icon" variant="outline" aria-label="Open emoji picker">
                        <SmilePlusIcon className="size-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-fit overflow-hidden p-0">
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
                </div>
              </form>
            </div>
          )}
    </div>
  )
}
