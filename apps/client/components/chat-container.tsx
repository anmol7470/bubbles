'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
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
import { sendMessage } from '@/lib/db/mutations'
import { useWsClient } from './ws-client'
import { createSupabaseClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'

export function ChatContainer({
  chatId,
  user,
}: {
  chatId: string
  user: User
}) {
  const wsClient = useWsClient()
  const router = useRouter()
  const { theme } = useTheme()
  const [message, setMessage] = useState('')
  const messageInputRef = useRef<HTMLInputElement | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)

  const { data: chat, isLoading } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => getChatById(chatId, user.id),
  })

  const otherParticipant = useMemo(() => {
    if (!chat || chat.isGroupChat || !chat.members) return null
    return chat.members.filter((member) => member.user.id !== user.id)[0].user
  }, [chat, user.id])

  const { mutateAsync: sendMessageMutation, isPending: isSendingMessage } =
    useMutation({
      mutationFn: ({
        content,
        sentAt,
        messageId,
        imageUrls,
      }: {
        content: string
        sentAt: Date
        messageId: string
        imageUrls?: string[]
      }) => sendMessage(messageId, sentAt, chatId, user.id, content, imageUrls),
      // Emit socket message instantly before server responds
      onMutate: ({ content, sentAt, messageId, imageUrls }) => {
        if (chat && wsClient) {
          const optimisticMessage = {
            id: messageId,
            chatId,
            senderId: user.id,
            content,
            sentAt,
            imageUrls: imageUrls ?? null,
            sender: {
              id: user.id,
              username: user.user_metadata.username!,
              imageUrl: user.user_metadata.imageUrl ?? null,
            },
          }

          wsClient.emit('newMessage', {
            message: optimisticMessage,
            chatId,
            participants: chat.members.map((m) => m.user.id),
          })
        }
      },
      onSettled: () => {
        // Use requestAnimationFrame to ensure input is enabled before focusing
        requestAnimationFrame(() => {
          messageInputRef.current?.focus()
        })
      },
    })

  // If chat is not found, route away
  if (!isLoading && !chat) {
    toast.error(`Chat ${chatId} not found`)
    router.push('/chats')
  }

  const processFiles = (files: File[]) => {
    if (files.length === 0) return

    // Filter out duplicates based on name and size
    const uniqueNewFiles = files.filter((newFile) => {
      return !selectedImages.some(
        (existingFile) =>
          existingFile.name === newFile.name &&
          existingFile.size === newFile.size
      )
    })

    if (uniqueNewFiles.length < files.length) {
      const duplicateCount = files.length - uniqueNewFiles.length
      toast.error(
        `${duplicateCount} duplicate image${duplicateCount > 1 ? 's' : ''} skipped`
      )
    }

    // Limit to 5 images total
    const remainingSlots = 5 - selectedImages.length
    const newImages = uniqueNewFiles.slice(0, remainingSlots)

    if (uniqueNewFiles.length > remainingSlots) {
      toast.error(`You can only upload up to 5 images at a time`)
    }

    if (newImages.length > 0) {
      setSelectedImages((prev) => [...prev, ...newImages])
    }
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    processFiles(files)
    // Reset input value so the same file can be selected again
    event.target.value = ''
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      processFiles(acceptedFiles)
    },
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    noClick: true,
    noKeyboard: true,
    disabled:
      selectedImages.length >= 5 || isSendingMessage || isUploadingImages,
  })

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadImagesToSupabase = async (images: File[]): Promise<string[]> => {
    const supabase = createSupabaseClient()
    const uploadedUrls: string[] = []

    for (const image of images) {
      const fileExt = image.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(filePath, image)

      if (error) {
        throw new Error(`Failed to upload image: ${error.message}`)
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('attachments').getPublicUrl(data.path)

      uploadedUrls.push(publicUrl)
    }

    return uploadedUrls
  }

  const handleSendMessage = async () => {
    if (message.trim() === '' && selectedImages.length === 0) return

    const messageContent = message.trim() || ''
    const imagesToUpload = [...selectedImages]

    setMessage('')
    setSelectedImages([])

    try {
      let imageUrls: string[] | undefined = undefined

      // Upload images if any
      if (imagesToUpload.length > 0) {
        setIsUploadingImages(true)
        toast.promise(
          uploadImagesToSupabase(imagesToUpload).then((urls: string[]) => {
            imageUrls = urls
            setIsUploadingImages(false)
          }),
          {
            loading: 'Uploading images...',
            success: 'Images uploaded successfully',
            error: 'Failed to upload images',
          }
        )
      }

      await sendMessageMutation({
        content: messageContent,
        sentAt: new Date(),
        messageId: crypto.randomUUID(),
        imageUrls,
      })
    } catch (error) {
      setIsUploadingImages(false)
      // Restore message and images on error
      setMessage(messageContent)
      setSelectedImages(imagesToUpload)
      toast.error(
        error instanceof Error ? error.message : 'Failed to send message'
      )
    }
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'bg-muted dark:bg-background flex flex-1 flex-col overflow-hidden relative',
        isDragActive && 'ring-2 ring-primary ring-inset'
      )}
    >
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-primary">
            <ImagePlusIcon className="size-12" />
            <p className="text-lg font-medium">Drop images here</p>
          </div>
        </div>
      )}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2Icon className="animate-spin" />
        </div>
      ) : (
        chat && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="bg-background/80 flex h-14 items-center gap-3 border-b border-neutral-300 px-4 dark:border-zinc-800">
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

            <Messages
              isGroupChat={chat?.isGroupChat ?? false}
              messages={chat?.messages ?? []}
              currentUserId={user.id}
            />

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (message.trim() === '' && selectedImages.length === 0) return
                await handleSendMessage()
              }}
              className="flex flex-col gap-2 px-3 py-2 border-t border-neutral-300 dark:border-zinc-800"
            >
              {/* Image Preview */}
              {selectedImages.length > 0 && (
                <div className="flex gap-2 flex-wrap px-1">
                  {selectedImages.map((image, index) => (
                    <div
                      key={index}
                      className="relative w-20 h-20 rounded-lg overflow-hidden border border-neutral-300 dark:border-zinc-700 bg-muted"
                    >
                      <Image
                        src={URL.createObjectURL(image)}
                        alt={`Selected image ${index + 1}`}
                        fill
                        className="object-cover"
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
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 h-8 w-8"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={
                      selectedImages.length >= 5 ||
                      isSendingMessage ||
                      isUploadingImages
                    }
                  >
                    <ImagePlusIcon className="size-5" />
                  </Button>
                  <input
                    type="file"
                    className="hidden"
                    ref={imageInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    multiple
                  />
                  <Input
                    ref={messageInputRef}
                    autoFocus
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      isUploadingImages
                        ? 'Uploading images...'
                        : 'Type a message...'
                    }
                    className="bg-background dark:bg-input/30 pl-12 pr-4 focus-visible:ring-0 h-10"
                    disabled={isSendingMessage || isUploadingImages}
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
              </div>
            </form>
          </div>
        )
      )}
    </div>
  )
}
