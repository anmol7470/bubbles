'use client'

import type { User } from '@/lib/get-user'
import { orpc } from '@/lib/orpc'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { UserAvatar } from './chats-list'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'

export function NewChatDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<{ id: string; username: string }[]>([])
  const [showGroupNameInput, setShowGroupNameInput] = useState(false)
  const [groupName, setGroupName] = useState('')

  // Debounce search input into a stable value for querying
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim())
    }, 300)
    return () => clearTimeout(handle)
  }, [searchQuery])

  const { data: searchResults = [], isLoading: isSearching } = useQuery(
    orpc.user.searchUsers.queryOptions({
      input: {
        query: debouncedQuery,
        selectedUserIds: selectedUsers.map((u) => u.id),
      },
      enabled: debouncedQuery.length > 0,
    })
  )

  const handleUserSelect = (userId: string, username: string) => {
    setSelectedUsers((prev) => [...prev, { id: userId, username }])
    setSearchQuery('')
  }

  const handleUserRemove = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((user) => user.id !== userId))
  }

  const { mutateAsync: createChat, isPending: isCreatingChat } = useMutation(
    orpc.chat.createChat.mutationOptions({
      onSuccess: (data) => {
        if (data.existing) {
          toast.error('Chat already exists')
        } else {
          toast.success('Chat created')
        }

        queryClient.invalidateQueries(orpc.chat.getAllChats.queryOptions())
        router.push(`/chats/${data.chatId}`)
      },
    })
  )

  const handleStartNewChat = async () => {
    if (selectedUsers.length >= 2 && !showGroupNameInput) {
      setShowGroupNameInput(true)
      return
    }

    await createChat({
      memberIds: [user.id, ...selectedUsers.map((user) => user.id)],
      groupName,
    })

    // Reset form
    setSelectedUsers([])
    setGroupName('')
    setShowGroupNameInput(false)
    setSearchQuery('')
    onOpenChange(false)
  }

  const handleBack = () => {
    setShowGroupNameInput(false)
    setGroupName('')
  }

  const handleDialogOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen) {
      // Reset everything when dialog closes
      setSelectedUsers([])
      setGroupName('')
      setShowGroupNameInput(false)
      setSearchQuery('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{showGroupNameInput ? 'Create Group Chat' : 'Start New Chat'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showGroupNameInput ? (
            <>
              {/* Search Input */}
              <div className="space-y-2">
                <Input
                  placeholder="Search for users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              {selectedUsers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-muted-foreground text-sm font-medium">Selected ({selectedUsers.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <div key={user.id} className="bg-muted flex items-center gap-2 rounded-md px-2 py-1 text-sm">
                        <span>{user.username}</span>
                        <button
                          onClick={() => handleUserRemove(user.id)}
                          className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchQuery && (
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {isSearching ? (
                    <div className="text-muted-foreground py-2 text-center text-sm">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <Button
                        variant="ghost"
                        key={user.id}
                        onClick={() => handleUserSelect(user.id, user.username!)}
                        className="hover:bg-muted flex w-full justify-start rounded-md px-2 transition-colors"
                        size="lg"
                      >
                        <UserAvatar image={user.image} username={user.username} className="size-8" />
                        <span className="text-sm font-medium">{user.username}</span>
                      </Button>
                    ))
                  ) : (
                    <div className="text-muted-foreground py-2 text-center text-sm">No users found</div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Group Name Input */
            <div className="space-y-2">
              <div className="relative">
                <Input
                  placeholder="Enter group name..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={20}
                  autoFocus
                  className="pr-12"
                />
                <div className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                  {groupName.length}/20
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedUsers.length > 0 && (
          <div className={`flex items-center ${showGroupNameInput ? 'justify-between' : 'justify-end'} pt-4`}>
            {showGroupNameInput && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
            )}
            <Button onClick={handleStartNewChat} disabled={showGroupNameInput && !groupName.trim()}>
              {isCreatingChat
                ? 'Creating chat...'
                : showGroupNameInput
                  ? 'Create Group Chat'
                  : selectedUsers.length > 1
                    ? 'Continue'
                    : 'Start New Chat'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
