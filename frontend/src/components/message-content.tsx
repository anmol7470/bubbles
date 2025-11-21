import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/chat'
import Linkify from 'linkify-react'
import { BanIcon, CopyIcon, PencilIcon, TrashIcon } from 'lucide-react'
import { toast } from 'react-hot-toast'

export function MessageContent({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const imageCount = message.images?.length ?? 0

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content)
      toast.success('Message copied to clipboard')
    }
  }

  if (message.is_deleted) {
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

  const messageContent = (
    <div className="flex flex-col gap-2">
      {imageCount > 0 && (
        <div className={cn('flex flex-wrap gap-2', isOwn ? 'justify-end' : 'justify-start')}>
          {message.images?.map((imageUrl, index) => (
            <div
              key={index}
              className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-neutral-300 sm:h-36 sm:w-36 dark:border-zinc-700"
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
        <div
          className={cn(
            'rounded-xl px-3 py-2 text-sm whitespace-pre-wrap wrap-break-word',
            isOwn ? 'self-end bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground self-start'
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
              <CopyIcon className="size-4" />
              Copy message
            </ContextMenuItem>
            <ContextMenuItem disabled>
              <PencilIcon className="size-4" />
              Edit message
            </ContextMenuItem>
            <ContextMenuItem disabled>
              <TrashIcon className="size-4" />
              Delete message
            </ContextMenuItem>
          </>
        ) : (
          <ContextMenuItem onClick={handleCopy}>
            <CopyIcon className="size-4" />
            Copy message
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
