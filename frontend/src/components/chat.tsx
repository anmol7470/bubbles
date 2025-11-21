import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '@/components/user-avatar'
import { getChatByIdFn, sendMessageFn } from '@/server/chat'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouteContext } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import EmojiPicker from 'emoji-picker-react'
import { ImagePlusIcon, SmilePlusIcon, XIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Messages } from './messages'

type ImagePreview = {
  file: File
  previewUrl: string
}

type ChatProps = {
  chatId: string
}

export function Chat({ chatId }: ChatProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useRouteContext({ from: '__root__' })
  const [message, setMessage] = useState('')
  const [selectedImages, setSelectedImages] = useState<ImagePreview[]>([])
  const [emojiOpen, setEmojiOpen] = useState(false)
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  const getChatByIdQuery = useServerFn(getChatByIdFn)
  const sendMessageQuery = useServerFn(sendMessageFn)

  const {
    data: chatData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      const result = await getChatByIdQuery({ data: chatId })
      return result
    },
  })

  useEffect(() => {
    if (isError) {
      toast.error(error instanceof Error ? error.message : 'Failed to load chat')
      navigate({ to: '/chats' })
    }
  }, [isError, error, navigate])

  useEffect(() => {
    if (chatData && !chatData.success && chatData.error) {
      toast.error(chatData.error)
      navigate({ to: '/chats' })
    }
  }, [chatData, navigate])

  const chat = chatData?.success ? chatData.chat : null

  const getOtherParticipant = () => {
    if (!chat || !user) return null
    return chat.members.find((member) => member.id !== user.id)
  }

  const otherParticipant = getOtherParticipant()
  const displayName = chat?.is_group ? chat.name || 'Group Chat' : otherParticipant?.username || 'Unknown'

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const validFiles: File[] = []
    const errors: string[] = []

    Array.from(files).forEach((file) => {
      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name} is not an image file`)
        return
      }

      // Check file size (4MB limit)
      if (file.size > 4 * 1024 * 1024) {
        errors.push(`${file.name} exceeds 4MB limit`)
        return
      }

      // Check for duplicates (by name and size)
      const isDuplicate = selectedImages.some((img) => img.file.name === file.name && img.file.size === file.size)

      if (isDuplicate) {
        errors.push(`${file.name} is already selected`)
        return
      }

      validFiles.push(file)
    })

    // Check max count
    const availableSlots = 5 - selectedImages.length
    if (validFiles.length > availableSlots) {
      errors.push(`Can only select ${availableSlots} more image(s)`)
      validFiles.splice(availableSlots)
    }

    // Create preview URLs
    const newPreviews: ImagePreview[] = validFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setSelectedImages((prev) => [...prev, ...newPreviews])

    // Show errors if any
    if (errors.length > 0) {
      toast.error(errors.join('\n'))
    }

    e.target.value = ''
  }

  const removeImage = (index: number) => {
    setSelectedImages((prev) => {
      const newImages = [...prev]
      // Revoke the object URL to free memory
      URL.revokeObjectURL(newImages[index].previewUrl)
      newImages.splice(index, 1)
      return newImages
    })
  }

  const { mutateAsync: sendMessage, isPending: isSending } = useMutation({
    mutationFn: sendMessageQuery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] })
      setMessage('')
      selectedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl))
      setSelectedImages([])
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to send message')
    },
    onSettled: () => {
      // Use requestAnimationFrame to ensure input is enabled before focusing
      requestAnimationFrame(() => {
        messageInputRef.current?.focus()
      })
    },
  })

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (message.trim() === '' && selectedImages.length === 0) return
    if (!chat) return

    const memberIds = chat.members.map((m) => m.id)

    // TODO: Implement image upload to get URLs
    const imageUrls: string[] = []

    await sendMessage({
      data: {
        chat_id: chatId,
        content: message.trim(),
        chat_member_ids: memberIds,
        images: imageUrls.length > 0 ? imageUrls : undefined,
      },
    })
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 flex-col">
        {isLoading ? (
          <div className="flex h-14 items-center gap-3 border-b border-neutral-300 bg-background/80 px-4 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        ) : (
          <div className="flex h-14 items-center gap-3 border-b border-neutral-300 bg-background/80 px-4 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <UserAvatar className="size-8" username={displayName} />
              <div className="font-medium">{displayName}</div>
            </div>
          </div>
        )}

        {chat && user ? (
          <Messages chatId={chatId} isGroupChat={chat.is_group} currentUserId={user.id} />
        ) : (
          <div className="flex-1"></div>
        )}

        <form
          onSubmit={handleSendMessage}
          className="flex flex-col gap-2 border-t border-neutral-300 px-3 py-2 dark:border-zinc-800"
        >
          {selectedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {selectedImages.map((image, index) => (
                <div
                  key={index}
                  className="relative h-20 w-20 overflow-hidden rounded-lg border border-neutral-300 bg-muted dark:border-zinc-700"
                >
                  <img
                    src={image.previewUrl}
                    alt={`Selected image ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute right-1 top-1 h-5 w-5 rounded-full shadow-md"
                    onClick={() => removeImage(index)}
                    disabled={isLoading || isSending}
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
                className="absolute left-2 top-1/2 z-10 h-8 w-8 -translate-y-1/2 transform"
                onClick={() => imageInputRef.current?.click()}
                disabled={selectedImages.length >= 5 || isLoading || isSending}
              >
                <ImagePlusIcon className="size-5" />
              </Button>
              <input
                type="file"
                className="hidden"
                ref={imageInputRef}
                onChange={handleFileChange}
                accept="image/*"
                multiple
                disabled={isLoading || isSending}
              />
              <Textarea
                ref={messageInputRef}
                autoFocus
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={1}
                placeholder={isLoading ? 'Loading...' : 'Type a message...'}
                className="max-h-40 min-h-10 resize-none bg-background pl-12 pr-4 focus-visible:ring-0 dark:bg-input/30"
                disabled={isLoading || isSending}
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
                  variant="ghost"
                  aria-label="Open emoji picker"
                  disabled={isLoading || isSending}
                >
                  <SmilePlusIcon className="size-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-fit overflow-hidden p-0">
                <EmojiPicker
                  lazyLoadEmojis
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
    </div>
  )
}
