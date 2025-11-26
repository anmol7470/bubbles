import { Button } from '@/components/ui/button'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatMessageTime } from '@/lib/utils'
import { deleteMessageFn, editMessageFn } from '@/server/chat'
import type { Message } from '@/types/chat'
import { useMutation } from '@tanstack/react-query'
import Linkify from 'linkify-react'
import { CheckIcon, CopyIcon, CornerUpLeftIcon, PencilIcon, TrashIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useCopyToClipboard } from 'usehooks-ts'

export function MessageContent({
  message,
  isOwn,
  onReply,
  onReplyJump,
  isHighlighted,
}: {
  message: Message
  isOwn: boolean
  onReply: (message: Message) => void
  onReplyJump?: (messageId: string) => void
  isHighlighted?: boolean
}) {
  const imageCount = message.images?.length ?? 0
  const [_, copy] = useCopyToClipboard()
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content ?? '')
  const [remainingImages, setRemainingImages] = useState<string[]>(message.images ?? [])
  const timestampLabel = formatMessageTime(new Date(message.created_at))

  const canEdit = () => {
    if (!isOwn || message.is_deleted) return false
    const messageTime = new Date(message.created_at).getTime()
    const now = Date.now()
    const fifteenMinutes = 15 * 60 * 1000
    return now - messageTime < fifteenMinutes
  }

  const editMutation = useMutation({
    mutationFn: async () => {
      const removedImages = message.images?.filter((img) => !remainingImages.includes(img)) ?? []
      return await editMessageFn({
        data: { message_id: message.id, content: editContent, removed_images: removedImages },
      })
    },
    onSuccess: (result) => {
      if (result.success) {
        setIsEditing(false)
      } else {
        toast.error(result.error || 'Failed to edit message')
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to edit message')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await deleteMessageFn({ data: { message_id: message.id } })
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error || 'Failed to delete message')
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete message')
    },
  })

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent(message.content ?? '')
    setRemainingImages(message.images ?? [])
  }

  const handleSaveEdit = () => {
    editMutation.mutate()
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this message?')) {
      deleteMutation.mutate()
    }
  }

  const handleRemoveImage = (imageUrl: string) => {
    setRemainingImages((prev) => prev.filter((img) => img !== imageUrl))
  }

  const metadataClasses = cn(
    'flex items-center justify-end gap-1 text-[11px] leading-none text-right',
    isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground'
  )

  const renderMetadata = ({
    inline = false,
    showEdited = true,
    tone = 'default',
  }: { inline?: boolean; showEdited?: boolean; tone?: 'default' | 'muted' } = {}) => (
    <div className={cn(metadataClasses, inline && 'ml-2 shrink-0', tone === 'muted' && 'text-muted-foreground')}>
      {showEdited && message.is_edited && <span className="font-semibold">Edited</span>}
      <time dateTime={message.created_at}>{timestampLabel}</time>
    </div>
  )

  const renderReplyPreview = () => {
    if (!message.reply_to) return null
    const reply = message.reply_to
    const replyText = reply.is_deleted
      ? 'This message was deleted'
      : reply.content?.trim() ||
        (reply.images.length > 0 ? `${reply.images.length} photo${reply.images.length > 1 ? 's' : ''}` : 'No content')

    const containerClasses = isOwn
      ? 'border-white/40 bg-white/10 text-primary-foreground/90'
      : 'border-primary/40 bg-muted/80 text-muted-foreground'
    const nameClasses = isOwn ? 'text-primary-foreground font-semibold' : 'text-foreground font-semibold'
    const moreLabelClasses = isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground'
    const thumbnailBorder = isOwn ? 'border border-white/40' : 'border border-neutral-300 dark:border-zinc-700'

    return (
      <button
        type="button"
        onClick={() => onReplyJump?.(reply.id)}
        className={cn(
          'group mb-2 rounded-2xl border-l-2 px-3 py-2 text-left text-xs transition-colors cursor-pointer',
          containerClasses
        )}
      >
        <div className={cn('text-[11px]', nameClasses)}>{reply.sender_username}</div>
        <p className="line-clamp-2">{replyText}</p>
        {!reply.is_deleted && reply.images.length > 0 && (
          <div className="mt-2 flex gap-1">
            {reply.images.slice(0, 2).map((imageUrl, index) => (
              <img
                key={imageUrl + index}
                src={imageUrl}
                alt="Replied message attachment"
                className={cn('h-10 w-10 rounded-md object-cover', thumbnailBorder)}
              />
            ))}
            {reply.images.length > 2 && (
              <span className={cn('text-[10px] font-medium', moreLabelClasses)}>+{reply.images.length - 2} more</span>
            )}
          </div>
        )}
      </button>
    )
  }

  if (message.is_deleted) {
    return (
      <div
        className={cn(
          'flex w-fit max-w-full flex-col gap-1 rounded-2xl px-3 py-2 text-sm transition-colors',
          isOwn ? 'self-end bg-primary/20 text-muted-foreground' : 'self-start bg-secondary/50 text-muted-foreground',
          isHighlighted ? (isOwn ? 'ring-2 ring-accent-foreground' : 'ring-2 ring-primary/60') : undefined
        )}
      >
        <div className="flex items-center gap-1 italic">
          <TrashIcon className="size-4 shrink-0" />
          <span>{isOwn ? 'You deleted this message' : 'This message was deleted'}</span>
        </div>
        {renderMetadata({ showEdited: false, tone: 'muted' })}
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        {message.reply_to && renderReplyPreview()}
        {remainingImages.length > 0 && (
          <div className={cn('flex flex-wrap gap-2', isOwn ? 'justify-end' : 'justify-start')}>
            {remainingImages.map((imageUrl, index) => (
              <div
                key={index}
                className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-neutral-300 sm:h-36 sm:w-36 dark:border-zinc-700"
              >
                <img src={imageUrl} alt={`Message image ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  onClick={() => handleRemoveImage(imageUrl)}
                  className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className={cn('min-h-20 resize-none', isOwn ? 'self-end' : 'self-start')}
          placeholder="Edit message..."
        />
        <div className={cn('flex gap-2', isOwn ? 'justify-end' : 'justify-start')}>
          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
            <XIcon className="size-4" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSaveEdit} disabled={editMutation.isPending}>
            <CheckIcon className="size-4" />
            Save
          </Button>
        </div>
      </div>
    )
  }

  const hasBodyContent = Boolean(message.content) || imageCount > 0
  const canInlineMetadata = Boolean(message.content && !message.content.includes('\n'))

  const messageContent = (
    <div
      className={cn(
        'flex w-fit max-w-full flex-col gap-1 rounded-2xl px-3 py-2 text-sm transition-colors',
        isOwn ? 'self-end bg-primary/80 text-primary-foreground' : 'self-start bg-secondary text-secondary-foreground',
        isHighlighted ? (isOwn ? 'ring-2 ring-accent-foreground' : 'ring-2 ring-primary/60') : undefined
      )}
    >
      {renderReplyPreview()}
      {hasBodyContent && (
        <div className="flex flex-col gap-2">
          {imageCount > 0 && (
            <div className={cn('flex flex-wrap gap-2', isOwn ? 'justify-end' : 'justify-start')}>
              {message.images?.map((imageUrl, index) => (
                <div
                  key={index}
                  className={cn(
                    'relative h-32 w-32 shrink-0 overflow-hidden rounded-lg sm:h-36 sm:w-36',
                    isOwn ? 'border border-white/30' : 'border border-neutral-300 dark:border-zinc-700'
                  )}
                >
                  <img
                    src={imageUrl}
                    alt={`Message image ${index + 1}`}
                    className="h-full w-full cursor-pointer object-cover transition-opacity hover:opacity-90"
                    onClick={() => window.open(imageUrl, '_blank')}
                  />
                </div>
              ))}
            </div>
          )}
          {message.content && (
            <div className={cn(canInlineMetadata ? 'flex items-end gap-2' : undefined)}>
              <div className={cn('whitespace-pre-wrap wrap-break-word', canInlineMetadata ? 'flex-1' : undefined)}>
                <Linkify
                  tagName="span"
                  options={{
                    className: 'underline hover:opacity-80 transition-opacity',
                    target: '_blank',
                    rel: 'noopener noreferrer',
                  }}
                >
                  {message.content}
                </Linkify>
              </div>
              {canInlineMetadata && renderMetadata({ inline: true })}
            </div>
          )}
        </div>
      )}
      {!canInlineMetadata && renderMetadata()}
    </div>
  )

  return (
    <ContextMenu>
      <ContextMenuTrigger>{messageContent}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => {
            onReply(message)
          }}
        >
          <CornerUpLeftIcon className="size-4" />
          Reply
        </ContextMenuItem>
        {isOwn ? (
          <>
            <ContextMenuItem
              onClick={async () => {
                await copy(message.content ?? '')
                toast.success('Message copied to clipboard')
              }}
            >
              <CopyIcon className="size-4" />
              Copy message
            </ContextMenuItem>
            <ContextMenuItem onClick={handleEdit} disabled={!canEdit()}>
              <PencilIcon className="size-4" />
              Edit message
            </ContextMenuItem>
            <ContextMenuItem onClick={handleDelete}>
              <TrashIcon className="size-4" />
              Delete message
            </ContextMenuItem>
          </>
        ) : (
          <ContextMenuItem
            onClick={async () => {
              await copy(message.content ?? '')
              toast.success('Message copied to clipboard')
            }}
          >
            <CopyIcon className="size-4" />
            Copy message
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
