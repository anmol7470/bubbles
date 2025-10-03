'use client'

import { useState, useMemo, useRef } from 'react'
import { ArrowLeftIcon, Search, X, ImageIcon, XIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { UserAvatar } from './user-avatar'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { Skeleton } from './ui/skeleton'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from './ui/context-menu'
import { getChatById } from '@/lib/db/queries'
import type { User } from '@/lib/types'
import Image from 'next/image'

type ChatSettingsProps = {
  chatId: string
  user: User
}

export function ChatSettings({ chatId, user }: ChatSettingsProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { data: chat, isLoading } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => getChatById(chatId, user.id),
  })

  const isCreator = chat?.creatorId === user.id

  const otherParticipant = !chat?.isGroupChat
    ? chat?.members.find((member) => member.user.id !== user.id)?.user
    : null

  const chatDisplayName = chat?.isGroupChat
    ? chat.groupChatName
    : otherParticipant?.username

  const chatDisplayImage = chat?.isGroupChat
    ? previewUrl || chat.groupChatImageUrl || null
    : (otherParticipant?.imageUrl ?? null)

  const filteredMembers = useMemo(() => {
    if (!chat?.isGroupChat) return []

    return chat.members
      .map((member) => member.user)
      .filter((member) =>
        member.username.toLowerCase().includes(memberSearch.toLowerCase())
      )
  }, [chat?.members, chat?.isGroupChat, memberSearch])

  const handleNameClick = () => {
    if (isCreator && chat?.isGroupChat) {
      setEditedName(chat.groupChatName || '')
      setIsEditingName(true)
    }
  }

  const handleNameSave = () => {
    // TODO: Implement save name mutation
    setIsEditingName(false)
  }

  const handleNameCancel = () => {
    setEditedName('')
    setIsEditingName(false)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]

    // Clean up previous preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    // Create preview URL and set selected file
    const preview = URL.createObjectURL(file)
    setPreviewUrl(preview)
    setSelectedFile(file)
  }

  const handleSaveImage = () => {
    // TODO: Implement save image mutation
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCancelImageSelect = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="flex items-center h-14 px-4">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => router.back()}
          >
            <ArrowLeftIcon className="size-4" />
            <span>Back</span>
          </Button>
        </div>

        <div className="flex flex-col items-center gap-3 p-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-7 w-32" />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <Separator className="mb-2" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!chat) {
    router.push('/chats')
    return null
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center h-14 px-4">
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={() => router.back()}
        >
          <ArrowLeftIcon className="size-4" />
          <span>Back</span>
        </Button>
      </div>

      <div className="flex flex-col items-center gap-3 p-4">
        {chat.isGroupChat && isCreator ? (
          <div className="flex flex-col items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <div className="relative group">
              <div
                className="relative cursor-pointer"
                onClick={() => !selectedFile && fileInputRef.current?.click()}
              >
                <div className="h-20 w-20 rounded-full overflow-hidden bg-secondary/50 flex items-center justify-center border-2 border-transparent group-hover:border-primary/50 transition-colors">
                  {chatDisplayImage ? (
                    <Image
                      src={chatDisplayImage}
                      alt="Group chat"
                      className="h-full w-full object-cover"
                      width={80}
                      height={80}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Add image
                      </span>
                    </div>
                  )}
                </div>
                {chatDisplayImage && !selectedFile && (
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
            </div>
            {selectedFile && (
              <div className="flex gap-1">
                <Button size="sm" className="text-xs" onClick={handleSaveImage}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={handleCancelImageSelect}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <UserAvatar
            image={chatDisplayImage}
            username={chatDisplayName ?? null}
            className="h-20 w-20 text-2xl"
          />
        )}

        {isEditingName ? (
          <div className="flex items-center gap-2 w-full max-w-xs">
            <div className="relative flex-1">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                maxLength={50}
                autoFocus
                className="text-center text-xl pr-12"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave()
                  if (e.key === 'Escape') handleNameCancel()
                }}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {editedName.length}/50
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" className="text-xs" onClick={handleNameSave}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={handleNameCancel}
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <h2
            className={`text-xl font-semibold ${
              isCreator &&
              chat?.isGroupChat &&
              'cursor-pointer hover:text-primary/80 transition-colors'
            }`}
            onClick={handleNameClick}
          >
            {chatDisplayName}
          </h2>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <Separator className="mb-4" />

        {/* Group chat specific sections */}
        {chat.isGroupChat && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Members ({chat.members.length})
              </h3>

              <div className="relative">
                <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-8 pr-8 focus-visible:ring-0 h-10"
                />
                {memberSearch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 h-9 w-9 -translate-y-1/2"
                    onClick={() => setMemberSearch('')}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>

              <ScrollArea className="h-[300px] rounded-md border border-neutral-300 dark:border-zinc-800">
                <div className="p-2 space-y-1">
                  {filteredMembers.map((member) => {
                    const memberContent = (
                      <div className="flex items-center gap-3 rounded-md p-2 hover:bg-primary/5">
                        <UserAvatar
                          image={member.imageUrl}
                          username={member.username}
                        />
                        <span className="flex-1 text-sm font-medium">
                          {member.username}
                          {member.id === user.id && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (You)
                            </span>
                          )}
                          {member.id === chat.creatorId && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (Admin)
                            </span>
                          )}
                        </span>
                      </div>
                    )

                    // Only show context menu if current user is creator and it's not themselves
                    if (isCreator && member.id !== user.id) {
                      return (
                        <ContextMenu key={member.id}>
                          <ContextMenuTrigger asChild>
                            {memberContent}
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem>Make Admin</ContextMenuItem>
                            <ContextMenuItem variant="destructive">
                              Remove
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      )
                    }

                    return <div key={member.id}>{memberContent}</div>
                  })}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
              >
                Exit Chat
              </Button>
              {isCreator && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                >
                  Delete Chat
                </Button>
              )}
            </div>
          </div>
        )}

        {/* DM specific sections */}
        {!chat.isGroupChat && (
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive"
            >
              Clear Chat
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive"
            >
              Delete Chat
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
