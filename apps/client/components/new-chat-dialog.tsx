'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import debounce from 'lodash.debounce'
import { SquarePen, X, ArrowLeft } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { searchUsers } from '@/lib/db/queries'
import { createNewChat } from '@/lib/db/mutations'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { User } from '@/lib/types'
import { UserAvatar } from './user-avatar'
import { useWsClient } from './ws-client'

export function NewChatDialog({ user }: { user: User }) {
  const wsClient = useWsClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<
    { id: string; username: string }[]
  >([])
  const [showGroupNameInput, setShowGroupNameInput] = useState(false)
  const [groupName, setGroupName] = useState('')
  const debouncedSearch = useMemo(
    () => debounce((query: string) => query, 300),
    []
  )

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: [
      'searchUsers',
      debouncedSearch(searchQuery),
      selectedUsers.map((u) => u.id),
    ],
    queryFn: async () => {
      if (!searchQuery.trim()) return []
      return searchUsers(
        searchQuery,
        user.id,
        selectedUsers.map((u) => u.id)
      )
    },
    enabled: !!searchQuery.trim(),
    staleTime: 0,
  })

  const handleUserSelect = (user: {
    id: string
    username: string
    imageUrl: string | null
  }) => {
    const newUser = { id: user.id, username: user.username! }
    setSelectedUsers((prev) => [...prev, newUser])
    setSearchQuery('')
  }

  const handleUserRemove = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((user) => user.id !== userId))
  }

  const { mutateAsync: createChat, isPending: isCreatingChat } = useMutation({
    mutationFn: () =>
      createNewChat(
        user.id,
        [user.id, ...selectedUsers.map((u) => u.id)],
        groupName
      ),
    onSuccess: async (data) => {
      if (data.existing) {
        toast.info('Chat already exists')
      } else {
        toast.success('Chat created')
        // Broadcast the new chat data to all subscribers
        if (data.chat && wsClient) {
          wsClient.emit('chatCreated', {
            chat: data.chat,
          })
        }
      }

      router.push(`/chats/${data.chat?.id}`)
    },
  })

  const handleStartNewChat = async () => {
    if (selectedUsers.length >= 2 && !showGroupNameInput) {
      setShowGroupNameInput(true)
      return
    }

    await createChat()

    // Reset form
    setSelectedUsers([])
    setGroupName('')
    setShowGroupNameInput(false)
    setSearchQuery('')
    setOpen(false)
  }

  const handleBack = () => {
    setShowGroupNameInput(false)
    setGroupName('')
  }

  const handleDialogOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
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
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost">
          <SquarePen className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {showGroupNameInput ? 'Create Group Chat' : 'Start New Chat'}
          </DialogTitle>
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
                  <div className="text-sm font-medium text-muted-foreground">
                    Selected ({selectedUsers.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 bg-muted rounded-md px-2 py-1 text-sm"
                      >
                        <span>{user.username}</span>
                        <button
                          onClick={() => handleUserRemove(user.id)}
                          className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchQuery && (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {isSearching ? (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults
                      .filter((user) => user.username)
                      .map((user) => (
                        <Button
                          variant="ghost"
                          key={user.id}
                          onClick={() => handleUserSelect(user)}
                          className="w-full flex justify-start rounded-md hover:bg-muted transition-colors px-2"
                          size="lg"
                        >
                          <UserAvatar
                            image={user.imageUrl}
                            username={user.username}
                          />
                          <span className="text-sm font-medium">
                            {user.username}
                          </span>
                        </Button>
                      ))
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      No users found
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Group Name Input */
            <div className="space-y-2">
              <Input
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </div>

        {selectedUsers.length > 0 && (
          <div
            className={`flex items-center ${showGroupNameInput ? 'justify-between' : 'justify-end'} pt-4`}
          >
            {showGroupNameInput && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
            )}
            <Button
              onClick={handleStartNewChat}
              disabled={showGroupNameInput && !groupName.trim()}
            >
              {isCreatingChat ? 'Creating chat...' : 'Start New Chat'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
