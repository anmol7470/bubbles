'use client'

import { useState, useRef, useEffect } from 'react'
import { useWsClient } from './ws-client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { BanIcon, CopyIcon, PencilIcon, TrashIcon, XIcon } from 'lucide-react'
import Image from 'next/image'
import { useMutation } from '@tanstack/react-query'
import { deleteMessage, editMessage } from '@/lib/db/mutations'
import type { ChatWithMessages } from '@/lib/types'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Textarea } from './ui/textarea'

export function MessageContent({
  message,
  isOwn,
  chatId,
  participants,
  isEditing,
  onEditStart,
  onEditEnd,
}: {
  message: ChatWithMessages['messages'][number]
  isOwn: boolean
  chatId: string
  participants: string[]
  isEditing: boolean
  onEditStart: () => void
  onEditEnd: () => void
}) {
  const { socket } = useWsClient()
  const imageUrls = message.images?.map((img) => img.imageUrl) ?? []
  const imageCount = imageUrls.length
  const [editContent, setEditContent] = useState(message.content)
  const [editImageUrls, setEditImageUrls] = useState<string[]>(imageUrls)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      )
    }
  }, [isEditing])

  // Check if message can be edited (within 10 minutes)
  const canEdit = () => {
    const sentAt = new Date(message.sentAt).getTime()
    const now = Date.now()
    const tenMinutes = 10 * 60 * 1000
    return now - sentAt < tenMinutes
  }

  const { mutateAsync: deleteMessageMutation } = useMutation({
    mutationFn: () => deleteMessage(message.id),
    onMutate: () => {
      if (socket) {
        socket.emit('messageDeleted', {
          messageId: message.id,
          chatId,
          participants,
        })
      }
    },
  })

  const { mutateAsync: editMessageMutation } = useMutation({
    mutationFn: ({
      content,
      imageUrls,
      deletedImageUrls,
    }: {
      content: string
      imageUrls: string[] | null
      deletedImageUrls: string[]
    }) => editMessage(message.id, content, imageUrls, deletedImageUrls),
    onMutate: ({ content, imageUrls, deletedImageUrls }) => {
      if (socket) {
        socket.emit('messageEdited', {
          messageId: message.id,
          chatId,
          content,
          images:
            imageUrls?.map((url) => ({
              id: crypto.randomUUID(),
              imageUrl: url,
            })) ?? [],
          participants,
          deletedImageUrls,
        })
      }
    },
    onSuccess: () => {
      onEditEnd()
    },
  })

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
    if (!editContent.trim() && editImageUrls.length === 0) {
      toast.error('Message cannot be empty')
      return
    }

    const deletedImageUrls = imageUrls.filter(
      (url) => !editImageUrls.includes(url)
    )

    await editMessageMutation({
      content: editContent,
      imageUrls: editImageUrls.length > 0 ? editImageUrls : null,
      deletedImageUrls,
    })
  }

  const handleCancelEdit = () => {
    setEditContent(message.content)
    setEditImageUrls(imageUrls)
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

  const handleDeleteImage = (urlToDelete: string) => {
    setEditImageUrls((prev) => prev.filter((url) => url !== urlToDelete))
  }

  // Show deleted message UI
  if (message.isDeleted) {
    return (
      <div
        className={cn(
          'rounded-xl px-3 py-2 text-sm italic flex items-center gap-1',
          isOwn
            ? 'self-end bg-primary/20 text-muted-foreground'
            : 'self-start bg-primary/5 text-muted-foreground'
        )}
      >
        <BanIcon className="size-4 flex-shrink-0" />
        <span>
          {isOwn ? 'You deleted this message' : 'This message was deleted'}
        </span>
      </div>
    )
  }

  // Show editing UI
  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 w-full">
        {editImageUrls.length > 0 && (
          <div
            className={cn(
              'flex flex-wrap gap-2',
              isOwn ? 'justify-end' : 'justify-start'
            )}
          >
            {editImageUrls.map((url, index) => (
              <div
                key={index}
                className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-lg overflow-hidden border border-neutral-300 dark:border-zinc-700 flex-shrink-0 group"
              >
                <Image
                  src={url}
                  alt={`Message image ${index + 1}`}
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
                <button
                  onClick={() => handleDeleteImage(url)}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XIcon className="size-4" />
                </button>
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
            'rounded-xl px-3 py-2 text-sm whitespace-pre-wrap break-words resize-none min-h-[60px] outline-none focus-visible:ring-0 border-none',
            isOwn
              ? 'self-end bg-primary text-primary-foreground dark:text-foreground placeholder:text-primary-foreground/50 dark:placeholder:text-foreground/50'
              : 'self-start bg-primary/10'
          )}
          placeholder="Edit message..."
        />
        <div className="flex gap-2 justify-end text-xs text-muted-foreground">
          <span>
            Press Enter to save, Shift+Enter for new line, Esc to cancel
          </span>
        </div>
      </div>
    )
  }

  const messageContent = (
    <div className="flex flex-col gap-2">
      {imageCount > 0 && (
        <div
          className={cn(
            'flex flex-wrap gap-2',
            isOwn ? 'justify-end' : 'justify-start'
          )}
        >
          {imageUrls.map((url, index) => (
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
              onClick={async () => await deleteMessageMutation()}
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
