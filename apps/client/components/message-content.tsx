'use client'

import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { orpc, type Outputs } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { useMutation } from '@tanstack/react-query'
import Linkify from 'linkify-react'
import { BanIcon, CopyIcon, PencilIcon, TrashIcon, XIcon } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'

type Message = Outputs['chat']['getChatMessages']['items'][number]

export function MessageContent({
  message,
  isOwn,
  isEditing,
  onEditStart,
  onEditEnd,
  chatMemberIds,
}: {
  message: Message
  isOwn: boolean
  isEditing: boolean
  onEditStart: () => void
  onEditEnd: () => void
  chatMemberIds: string[]
}) {
  const imageCount = message.images?.length ?? 0
  const [editContent, setEditContent] = useState(message.content)
  const [editImages, setEditImages] = useState<typeof message.images>(message.images)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length)
    }
  }, [isEditing])

  // Check if message can be edited (within 10 minutes)
  const canEdit = () => {
    const sentAt = new Date(message.sentAt).getTime()
    const now = Date.now()
    const tenMinutes = 10 * 60 * 1000
    return now - sentAt < tenMinutes
  }

  const { mutateAsync: deleteMessage } = useMutation(
    orpc.message.deleteMessage.mutationOptions({
      onSuccess: () => {
        toast.success('Message deleted')
      },
    })
  )

  const { mutateAsync: editMessage } = useMutation(
    orpc.message.editMessage.mutationOptions({
      onSuccess: () => {
        onEditEnd()
        toast.success('Message edited')
      },
    })
  )

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content)
      toast.success('Message copied to clipboard')
    }
  }

  const handleEdit = () => {
    if (!canEdit()) {
      toast.error('Messages can only be edited within 10 minutes')
      return
    }
    onEditStart()
  }

  const handleSaveEdit = async () => {
    if (!editContent.trim() && editImages.length === 0) {
      toast.error('Message cannot be empty')
      return
    }

    const removedImages = editImages.filter((img) => !editImages.includes(img))

    await editMessage({
      messageMeta: {
        id: message.id,
        chatId: message.chatId,
        sentAt: message.sentAt,
      },
      chatMemberIds,
      content: editContent,
      images: editImages.length > 0 ? editImages.map((img) => ({ id: img.id, imageUrl: img.imageUrl })) : undefined,
      removedImageUrls: removedImages.length > 0 ? removedImages.map((img) => img.imageUrl) : undefined,
    })
  }

  const handleCancelEdit = () => {
    setEditContent(message.content)
    setEditImages(message.images)
    onEditEnd()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleDeleteImage = (imgToDelete: (typeof message.images)[number]) => {
    setEditImages((prev) => prev.filter((img) => img.id !== imgToDelete.id))
  }

  // Show deleted message UI
  if (message.isDeleted) {
    return (
      <div
        className={cn(
          'flex items-center gap-1 rounded-xl px-3 py-2 text-sm italic',
          isOwn ? 'bg-primary/20 text-muted-foreground self-end' : 'bg-primary/5 text-muted-foreground self-start'
        )}
      >
        <BanIcon className="size-4 shrink-0" />
        <span>{isOwn ? 'You deleted this message' : 'This message was deleted'}</span>
      </div>
    )
  }

  // Show editing UI
  if (isEditing) {
    return (
      <div className="flex w-full flex-col gap-2">
        {editImages.length > 0 && (
          <div className={cn('flex flex-wrap gap-2', isOwn ? 'justify-end' : 'justify-start')}>
            {editImages.map((img, index) => (
              <div
                key={index}
                className="group relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-neutral-300 sm:h-36 sm:w-36 dark:border-zinc-700"
              >
                <Image
                  src={img.imageUrl}
                  alt={`Message image ${index + 1}`}
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  onClick={() => handleDeleteImage(img)}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full shadow-md"
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <Textarea
          ref={textareaRef}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            'min-h-[60px] resize-none rounded-xl border-none px-3 py-2 text-sm wrap-break-word whitespace-pre-wrap outline-none focus-visible:ring-0',
            isOwn
              ? 'bg-primary text-primary-foreground dark:text-foreground placeholder:text-primary-foreground/50 dark:placeholder:text-foreground/50 self-end'
              : 'bg-primary/10 self-start'
          )}
          placeholder="Edit message..."
        />
        <div className="text-muted-foreground flex justify-end gap-2 text-xs">
          <span>Press Enter to save, Shift+Enter for new line, Esc to cancel</span>
        </div>
      </div>
    )
  }

  const messageContent = (
    <div className="flex flex-col gap-2">
      {imageCount > 0 && (
        <div className={cn('flex flex-wrap gap-2', isOwn ? 'justify-end' : 'justify-start')}>
          {message.images?.map((img, index) => (
            <div
              key={index}
              className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-neutral-300 sm:h-36 sm:w-36 dark:border-zinc-700"
            >
              <Image
                src={img.imageUrl}
                alt={`Message image ${index + 1}`}
                fill
                sizes="100vw"
                className="cursor-pointer object-cover transition-opacity hover:opacity-90"
                onClick={() => window.open(img.imageUrl, '_blank')}
              />
            </div>
          ))}
        </div>
      )}
      {message.content && (
        <div
          className={cn(
            'rounded-xl px-3 py-2 text-sm wrap-break-word whitespace-pre-wrap',
            isOwn ? 'self-end bg-blue-400 text-white' : 'bg-primary/10 self-start'
          )}
        >
          <Linkify
            options={{
              className: 'underline hover:opacity-80 transition-opacity',
              target: '_blank',
              rel: 'noopener noreferrer',
            }}
          >
            {message.content}
          </Linkify>
        </div>
      )}
    </div>
  )

  return (
    <ContextMenu>
      <ContextMenuTrigger>{messageContent}</ContextMenuTrigger>
      <ContextMenuContent>
        {isOwn ? (
          <>
            <ContextMenuItem onClick={handleCopy}>
              <CopyIcon />
              Copy message
            </ContextMenuItem>
            {canEdit() && (
              <ContextMenuItem onClick={handleEdit}>
                <PencilIcon />
                Edit message
              </ContextMenuItem>
            )}
            <ContextMenuItem
              onClick={async () =>
                await deleteMessage({ chatId: message.chatId, messageId: message.id, chatMemberIds })
              }
              variant="destructive"
            >
              <TrashIcon />
              Delete message
            </ContextMenuItem>
          </>
        ) : (
          <ContextMenuItem onClick={handleCopy}>
            <CopyIcon />
            Copy message
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
