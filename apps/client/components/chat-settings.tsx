'use client'

import type { User } from '@/lib/get-user'
import { orpc } from '@/lib/orpc'
import { cn } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftIcon, SearchIcon, XIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { UserAvatar } from './chats-list'
import { ConfirmationDialog } from './confirmation-dialog'
import { Button } from './ui/button'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from './ui/context-menu'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'

type ChatSettingsProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  chatId: string
  user: User
}

export function ChatSettings({ open, onOpenChange, chatId, user }: ChatSettingsProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [memberSearch, setMemberSearch] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [showExitChatConfirm, setShowExitChatConfirm] = useState(false)
  const [showMakeAdminConfirm, setShowMakeAdminConfirm] = useState(false)
  const [showRemoveMemberConfirm, setShowRemoveMemberConfirm] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  const { data: chat } = useQuery(orpc.chat.getChatById.queryOptions({ input: { chatId } }))

  const isCreator = chat?.creatorId === user.id

  const currentMemberIds = useMemo(() => {
    return (
      chat?.members.map((member) => member.user?.id).filter((id): id is string => id !== null && id !== undefined) ?? []
    )
  }, [chat?.members])

  const { data: searchResults } = useQuery(
    orpc.chat.searchUsers.queryOptions({
      input: {
        query: memberSearch,
        selectedUserIds: currentMemberIds,
      },
      enabled: isCreator && memberSearch.trim().length > 0,
    })
  )

  const getDisplayName = (user: { username: string | null } | null | undefined) => {
    return user?.username || 'Unknown User'
  }

  const filteredMembers = useMemo(() => {
    return (
      chat?.members
        .map((member) => member.user)
        .filter((member): member is NonNullable<typeof member> => member !== null)
        .filter((member) => getDisplayName(member).toLowerCase().includes(memberSearch.toLowerCase())) ?? []
    )
  }, [chat?.members, memberSearch])

  const makeAdminMutation = useMutation(
    orpc.chat.makeMemberAdmin.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.chat.getChatById.key({ input: { chatId } }) })
        queryClient.invalidateQueries({ queryKey: orpc.chat.getAllChats.key({ type: 'query' }) })
        toast.success('Member made admin successfully')
        setShowMakeAdminConfirm(false)
      },
    })
  )

  const removeMemberMutation = useMutation(
    orpc.chat.exitGroupChat.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.chat.getChatById.key({ input: { chatId } }) })
        queryClient.invalidateQueries({ queryKey: orpc.chat.getAllChats.key({ type: 'query' }) })
        toast.success('Member removed successfully')
        setShowRemoveMemberConfirm(false)
      },
    })
  )

  const exitGroupChatMutation = useMutation(
    orpc.chat.exitGroupChat.mutationOptions({
      onSuccess: () => {
        router.push('/chats')
        queryClient.invalidateQueries({ queryKey: orpc.chat.getAllChats.key({ type: 'query' }) })
        toast.success('Group chat exited successfully')
        setShowExitChatConfirm(false)
      },
    })
  )

  const updateGroupChatNameMutation = useMutation(
    orpc.chat.updateGroupChatName.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.chat.getChatById.key({ input: { chatId } }) })
        queryClient.invalidateQueries({ queryKey: orpc.chat.getAllChats.key({ type: 'query' }) })
        toast.success('Group chat name updated successfully')
        setIsEditingName(false)
      },
    })
  )

  const addMemberMutation = useMutation(
    orpc.chat.addMemberToGroupChat.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.chat.getChatById.key({ input: { chatId } }) })
        queryClient.invalidateQueries({ queryKey: orpc.chat.getAllChats.key({ type: 'query' }) })
        toast.success('Member added successfully')
      },
    })
  )

  const handleNameClick = () => {
    if (isCreator) {
      setEditedName(chat?.name || '')
      setIsEditingName(true)
    }
  }

  const handleNameSave = () => {
    if (editedName.trim() && editedName !== chat?.name) {
      updateGroupChatNameMutation.mutate({ chatId, name: editedName.trim() })
    } else {
      setIsEditingName(false)
    }
  }

  const handleNameCancel = () => {
    setEditedName('')
    setIsEditingName(false)
  }

  if (!open || !chat) return null

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Button variant="outline" className="flex items-center gap-2" onClick={() => onOpenChange(false)}>
          <ArrowLeftIcon className="size-4" />
          <span>Back</span>
        </Button>
      </div>
      <div className="flex flex-col items-center gap-3 p-4">
        <UserAvatar image={null} username={chat?.name ?? null} className="h-20 w-20 text-2xl" />

        {isEditingName ? (
          <div className="flex w-full max-w-xs items-center gap-2">
            <div className="relative flex-1">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                maxLength={20}
                autoFocus
                className="pr-12 text-center text-xl"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave()
                  if (e.key === 'Escape') handleNameCancel()
                }}
              />
              <div className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                {editedName.length}/20
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
            className={cn(
              'text-xl font-semibold',
              isCreator && 'hover:text-primary/80 cursor-pointer transition-colors'
            )}
            onClick={handleNameClick}
          >
            {chat?.name}
          </h2>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <Separator className="mb-4" />

        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-muted-foreground text-sm font-medium">Members ({chat.members.length})</h3>

            <div className="relative">
              <SearchIcon className="text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search current members and add more..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="h-10 pr-8 pl-8 focus-visible:ring-0"
              />
              {memberSearch && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 right-0 h-9 w-9 -translate-y-1/2"
                  onClick={() => setMemberSearch('')}
                >
                  <XIcon className="size-4" />
                </Button>
              )}
            </div>

            <ScrollArea className="h-[300px] rounded-md border border-neutral-300 dark:border-zinc-800">
              <div className="space-y-1 p-2">
                {filteredMembers.map((member) => {
                  const memberContent = (
                    <div className="hover:bg-primary/5 flex items-center gap-3 rounded-md p-2">
                      <UserAvatar image={member.image} username={getDisplayName(member)} />
                      <span className="flex-1 text-sm font-medium">
                        {getDisplayName(member)}
                        {member.id === user.id && <span className="text-muted-foreground ml-2 text-xs">(You)</span>}
                        {member.id === chat.creatorId && (
                          <span className="text-muted-foreground ml-2 text-xs">(Admin)</span>
                        )}
                      </span>
                    </div>
                  )

                  // Only show context menu if current user is creator and it's not themselves
                  if (isCreator && member.id !== user.id) {
                    return (
                      <ContextMenu key={member.id}>
                        <ContextMenuTrigger asChild>{memberContent}</ContextMenuTrigger>
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

                {/* Show search results for users not in the group */}
                {isCreator && memberSearch.trim().length > 0 && searchResults && searchResults.length > 0 && (
                  <>
                    {filteredMembers.length > 0 && <Separator className="my-2" />}
                    <div className="text-muted-foreground px-2 py-1 text-xs font-medium">Add to group</div>
                    {searchResults.map((searchUser) => (
                      <div key={searchUser.id} className="hover:bg-primary/5 flex items-center gap-3 rounded-md p-2">
                        <UserAvatar image={searchUser.image} username={searchUser.username} />
                        <span className="flex-1 text-sm font-medium">{searchUser.username}</span>
                        <Button
                          size="sm"
                          className="h-7 px-3 text-xs"
                          onClick={() => addMemberMutation.mutate({ chatId, userId: searchUser.id })}
                          disabled={addMemberMutation.isPending}
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                  </>
                )}

                {/* Show message when no results */}
                {memberSearch.trim().length > 0 &&
                  filteredMembers.length === 0 &&
                  (!searchResults || searchResults.length === 0) && (
                    <div className="text-muted-foreground p-4 text-center text-sm">No users found</div>
                  )}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          <div className="space-y-2">
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive w-full justify-start"
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
          </div>
        </div>
      </div>

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
            makeAdminMutation.mutate({ chatId, memberId: selectedMemberId })
          }
        }}
        title="Make Admin"
        description="Are you sure you want to make this user an admin? This will transfer admin privileges to them and you will no longer be the admin."
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
            removeMemberMutation.mutate({ chatId, userId: selectedMemberId })
          }
        }}
        title="Remove Member"
        description="Are you sure you want to remove this user from the chat? Their messages will remain visible but they will no longer be a member."
        confirmText="Remove Member"
        isLoading={removeMemberMutation.isPending}
      />

      <ConfirmationDialog
        open={showExitChatConfirm}
        onOpenChange={setShowExitChatConfirm}
        onConfirm={() => exitGroupChatMutation.mutate({ chatId, userId: user.id })}
        title="Exit Chat"
        description="Are you sure you want to exit this chat? Your messages will remain visible but you will no longer be a member of this group."
        confirmText="Exit Chat"
        isLoading={exitGroupChatMutation.isPending}
      />
    </div>
  )
}
