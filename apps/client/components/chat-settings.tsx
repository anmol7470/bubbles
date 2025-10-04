'use client'

import { useState, useMemo } from 'react'
import { ArrowLeftIcon, SearchIcon, ImageIcon, XIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
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
import { useImageUpload } from '@/hooks/use-image-upload'
import { getDisplayName } from '@/lib/utils'
import {
  exitGroupChat,
  makeMemberAdmin,
  clearChat,
  deleteChat,
  deleteGroupChat,
  updateGroupChatName,
  updateGroupChatImage,
} from '@/lib/db/mutations'
import { useQueryClient } from '@tanstack/react-query'
import { ConfirmationDialog } from './confirmation-dialog'
import { toast } from 'sonner'

type ChatSettingsProps = {
  chatId: string
  user: User
}

export function ChatSettings({ chatId, user }: ChatSettingsProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [memberSearch, setMemberSearch] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false)
  const [showExitChatConfirm, setShowExitChatConfirm] = useState(false)
  const [showDeleteChatConfirm, setShowDeleteChatConfirm] = useState(false)
  const [showDeleteGroupChatConfirm, setShowDeleteGroupChatConfirm] =
    useState(false)
  const [showMakeAdminConfirm, setShowMakeAdminConfirm] = useState(false)
  const [showRemoveMemberConfirm, setShowRemoveMemberConfirm] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  const {
    selectedImages,
    previewUrls,
    fileInputRef,
    handleFileSelect,
    triggerFileSelect,
    clearSingleImage,
    uploadWithProgress,
    isUploadingImages,
  } = useImageUpload(user.id, 'avatars', { maxImages: 1 })

  const { data: chat, isLoading } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => getChatById(chatId, user.id),
  })

  const isCreator = chat?.creatorId === user.id

  const otherParticipant = !chat?.isGroupChat
    ? chat?.members.find((member) => member.user && member.user.id !== user.id)
        ?.user
    : null

  const chatDisplayName = chat?.isGroupChat
    ? chat.groupChatName
    : getDisplayName(otherParticipant)

  const chatDisplayImage = chat?.isGroupChat
    ? previewUrls[0] || chat.groupChatImageUrl || null
    : (otherParticipant?.imageUrl ?? null)

  const filteredMembers = useMemo(() => {
    if (!chat?.isGroupChat) return []

    return chat.members
      .map((member) => member.user)
      .filter((member): member is NonNullable<typeof member> => member !== null)
      .filter((member) =>
        getDisplayName(member)
          .toLowerCase()
          .includes(memberSearch.toLowerCase())
      )
  }, [chat?.members, chat?.isGroupChat, memberSearch])

  const makeAdminMutation = useMutation({
    mutationFn: (memberId: string) => makeMemberAdmin(chatId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] })
      toast.success('Member made admin successfully')
      setShowMakeAdminConfirm(false)
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => exitGroupChat(chatId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] })
      toast.success('Member removed successfully')
      setShowRemoveMemberConfirm(false)
    },
  })

  const clearChatMutation = useMutation({
    mutationFn: () => clearChat(chatId, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] })
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      toast.success('Chat cleared successfully')
      setShowClearChatConfirm(false)
    },
  })

  const deleteChatMutation = useMutation({
    mutationFn: () => deleteChat(chatId, user.id),
    onSuccess: () => {
      router.push('/chats')
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      toast.success('Chat deleted successfully')
      setShowDeleteChatConfirm(false)
    },
  })

  const exitGroupChatMutation = useMutation({
    mutationFn: () => exitGroupChat(chatId, user.id),
    onSuccess: () => {
      router.push('/chats')
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      toast.success('Group chat exited successfully')
      setShowExitChatConfirm(false)
    },
  })

  const deleteGroupChatMutation = useMutation({
    mutationFn: () => deleteGroupChat(chatId),
    onSuccess: () => {
      router.push('/chats')
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      toast.success('Group chat deleted successfully')
      setShowDeleteGroupChatConfirm(false)
    },
  })

  const updateGroupChatNameMutation = useMutation({
    mutationFn: (newName: string) => updateGroupChatName(chatId, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] })
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      toast.success('Group chat name updated successfully')
      setIsEditingName(false)
    },
    onError: () => {
      toast.error('Failed to update group chat name')
    },
  })

  const updateGroupChatImageMutation = useMutation({
    mutationFn: (newImageUrl: string) =>
      updateGroupChatImage(chatId, newImageUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] })
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      toast.success('Group chat image updated successfully')
      clearSingleImage()
    },
    onError: () => {
      toast.error('Failed to update group chat image')
    },
  })

  const handleNameClick = () => {
    if (isCreator && chat?.isGroupChat) {
      setEditedName(chat.groupChatName || '')
      setIsEditingName(true)
    }
  }

  const handleNameSave = () => {
    if (editedName.trim() && editedName !== chat?.groupChatName) {
      updateGroupChatNameMutation.mutate(editedName.trim())
    } else {
      setIsEditingName(false)
    }
  }

  const handleNameCancel = () => {
    setEditedName('')
    setIsEditingName(false)
  }

  const handleSaveImage = async () => {
    if (selectedImages.length > 0) {
      try {
        const uploadedUrls = await uploadWithProgress(selectedImages)
        if (uploadedUrls[0]) {
          updateGroupChatImageMutation.mutate(uploadedUrls[0])
        }
      } catch {
        toast.error('Failed to upload image')
      }
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
              onChange={handleFileSelect}
            />
            <div className="relative group">
              <div
                className="relative cursor-pointer"
                onClick={() =>
                  selectedImages.length === 0 && triggerFileSelect()
                }
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
                {chatDisplayImage && selectedImages.length === 0 && (
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-white" />
                  </div>
                )}
              </div>
            </div>
            {selectedImages.length > 0 && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={handleSaveImage}
                  disabled={
                    isUploadingImages || updateGroupChatImageMutation.isPending
                  }
                >
                  {isUploadingImages || updateGroupChatImageMutation.isPending
                    ? 'Saving...'
                    : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={clearSingleImage}
                  disabled={
                    isUploadingImages || updateGroupChatImageMutation.isPending
                  }
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
              <Button
                size="sm"
                className="text-xs"
                onClick={handleNameSave}
                disabled={updateGroupChatNameMutation.isPending}
              >
                {updateGroupChatNameMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={handleNameCancel}
                disabled={updateGroupChatNameMutation.isPending}
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
        {chat.isGroupChat ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Members ({chat.members.length})
              </h3>

              <div className="relative">
                <SearchIcon className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
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
                    <XIcon className="size-4" />
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
                          username={getDisplayName(member)}
                        />
                        <span className="flex-1 text-sm font-medium">
                          {getDisplayName(member)}
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
                            <ContextMenuItem
                              onClick={() => {
                                setSelectedMemberId(member.id)
                                setShowMakeAdminConfirm(true)
                              }}
                              disabled={makeAdminMutation.isPending}
                            >
                              Make Admin
                            </ContextMenuItem>
                            <ContextMenuItem
                              variant="destructive"
                              onClick={() => {
                                setSelectedMemberId(member.id)
                                setShowRemoveMemberConfirm(true)
                              }}
                              disabled={removeMemberMutation.isPending}
                            >
                              Remove Member
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
                onClick={() => setShowClearChatConfirm(true)}
              >
                Clear Chat
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => {
                  if (isCreator) {
                    toast.error('Make someone else admin before exiting')
                    return
                  }
                  setShowExitChatConfirm(true)
                }}
              >
                Exit Chat
              </Button>
              {isCreator && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteGroupChatConfirm(true)}
                >
                  Delete Chat
                </Button>
              )}
            </div>
          </div>
        ) : (
          // DM specific sections
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={() => setShowClearChatConfirm(true)}
            >
              Clear Chat
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={() => setShowDeleteChatConfirm(true)}
            >
              Delete Chat
            </Button>
          </div>
        )}
      </div>

      <ConfirmationDialog
        open={showClearChatConfirm}
        onOpenChange={setShowClearChatConfirm}
        onConfirm={() => clearChatMutation.mutate()}
        title="Clear Chat"
        description="Are you sure you want to clear this chat? This action is irreversible and all current chat messages will be wiped from history."
        confirmText="Clear Chat"
        isLoading={clearChatMutation.isPending}
      />

      <ConfirmationDialog
        open={showDeleteChatConfirm}
        onOpenChange={setShowDeleteChatConfirm}
        onConfirm={() => deleteChatMutation.mutate()}
        title="Delete Chat"
        description="Are you sure you want to delete this chat? This action is irreversible and all chat data will be permanently deleted."
        confirmText="Delete Chat"
        isLoading={deleteChatMutation.isPending}
      />

      <ConfirmationDialog
        open={showMakeAdminConfirm}
        onOpenChange={(open) => {
          setShowMakeAdminConfirm(open)
          if (!open) {
            setSelectedMemberId(null)
          }
        }}
        onConfirm={() => {
          if (selectedMemberId) {
            makeAdminMutation.mutate(selectedMemberId)
          }
        }}
        title="Make Admin"
        description="Are you sure you want to make this user an admin? This action is irreversible and the user will be able to manage the chat."
        confirmText="Make Admin"
        isLoading={makeAdminMutation.isPending}
      />

      <ConfirmationDialog
        open={showRemoveMemberConfirm}
        onOpenChange={(open) => {
          setShowRemoveMemberConfirm(open)
          if (!open) {
            setSelectedMemberId(null)
          }
        }}
        onConfirm={() => {
          if (selectedMemberId) {
            removeMemberMutation.mutate(selectedMemberId)
          }
        }}
        title="Remove Member"
        description="Are you sure you want to remove this user from the chat? This action is irreversible and the user will no longer be able to access the chat."
        confirmText="Remove Member"
        isLoading={removeMemberMutation.isPending}
      />

      <ConfirmationDialog
        open={showExitChatConfirm}
        onOpenChange={setShowExitChatConfirm}
        onConfirm={() => exitGroupChatMutation.mutate()}
        title="Exit Chat"
        description="Are you sure you want to exit this chat? This action is irreversible and you will no longer be a part of this group chat."
        confirmText="Exit Chat"
        isLoading={exitGroupChatMutation.isPending}
      />

      <ConfirmationDialog
        open={showDeleteGroupChatConfirm}
        onOpenChange={setShowDeleteGroupChatConfirm}
        onConfirm={() => deleteGroupChatMutation.mutate()}
        title="Delete Chat"
        description="Are you sure you want to delete this chat? This action is irreversible and all chat data will be permanently deleted."
        confirmText="Delete Chat"
        isLoading={deleteGroupChatMutation.isPending}
      />
    </div>
  )
}
