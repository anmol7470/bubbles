import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '@/components/user-avatar'
import { useImageUpload } from '@/hooks/use-image-upload'
import { formatRetryAfter } from '@/lib/utils'
import { getChatByIdFn, sendMessageFn } from '@/server/chat'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouteContext } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import EmojiPicker from 'emoji-picker-react'
import { ImagePlusIcon, SmilePlusIcon, XIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useDocumentTitle } from 'usehooks-ts'
import { Messages } from './messages'

type ChatProps = {
  chatId: string
}

export function Chat({ chatId }: ChatProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useRouteContext({ from: '__root__' })
  const [message, setMessage] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  const getChatByIdQuery = useServerFn(getChatByIdFn)
  const sendMessageQuery = useServerFn(sendMessageFn)
  const { selectedImages, setSelectedImages, handleFileChange, removeImage, clearImages, uploadImages, isUploading } =
    useImageUpload()

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

  useDocumentTitle(chat ? `${displayName} - Bubbles` : 'Bubbles')

  const { mutateAsync: sendMessage, isPending: isSending } = useMutation({
    mutationFn: sendMessageQuery,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['messages', chatId] })
        setMessage('')
        clearImages()
      } else {
        const errorMessage = data.retry_after
          ? `${data.error} Try again in ${formatRetryAfter(data.retry_after)}.`
          : data.error || 'Failed to send message'
        toast.error(errorMessage)
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to send message')
    },
    onSettled: () => {
      // Focus back on input after sending message
      requestAnimationFrame(() => {
        messageInputRef.current?.focus()
      })
    },
  })

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (message.trim() === '' && selectedImages.length === 0) return
    if (!chat) return

    const messageContent = message.trim()
    const imagesToSend = [...selectedImages]

    setMessage('')
    clearImages()

    let imageUrls: string[] = []

    if (imagesToSend.length > 0) {
      const files = imagesToSend.map((img) => img.file)
      const uploadPromise = uploadImages(files)

      try {
        toast.promise(uploadPromise, {
          loading: 'Uploading images...',
          success: 'Images uploaded successfully',
          error: 'Failed to upload images',
        })

        imageUrls = await uploadPromise
      } catch (error) {
        setMessage(messageContent)
        const restoredImages = imagesToSend.map((img) => ({
          file: img.file,
          previewUrl: URL.createObjectURL(img.file),
        }))
        setSelectedImages(restoredImages)
        requestAnimationFrame(() => {
          messageInputRef.current?.focus()
        })
        return
      }
    }

    if (messageContent || imageUrls.length > 0) {
      await sendMessage({
        data: {
          chat_id: chatId,
          content: messageContent,
          images: imageUrls.length > 0 ? imageUrls : undefined,
        },
      })
    }
  }

  // Show loading spinner while fetching chat (after all hooks)
  if (isLoading || !chat || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-14 items-center gap-3 border-b border-neutral-300 bg-background/80 px-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <UserAvatar className="size-8" username={displayName} />
            <div className="font-medium">{displayName}</div>
          </div>
        </div>

        <Messages chatId={chatId} isGroupChat={chat.is_group} currentUserId={user.id} />

        <form onSubmit={handleSendMessage} className="flex flex-col gap-2 px-3 py-2">
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
                    disabled={isSending || isUploading}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Select image"
                className="absolute left-2 top-1/2 z-10 h-8 w-8 -translate-y-1/2 transform"
                onClick={() => imageInputRef.current?.click()}
                disabled={selectedImages.length >= 5 || isSending || isUploading}
              >
                <ImagePlusIcon className="size-5" />
              </Button>
              <input
                type="file"
                className="hidden"
                ref={imageInputRef}
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                multiple
                disabled={isSending || isUploading}
              />
              <Textarea
                autoFocus
                ref={messageInputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={1}
                placeholder={isUploading ? 'Uploading images...' : 'Type a message...'}
                className="max-h-40 min-h-10 resize-none bg-background pl-12 pr-4 focus-visible:ring-0 dark:bg-input/30 wrap-break-word"
                disabled={isSending || isUploading}
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
                  disabled={isSending || isUploading}
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
