'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { toast } from 'sonner'
import {
  updateUsername,
  updateProfileImage,
  deleteUser,
} from '@/lib/auth-actions'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useImageUpload } from '@/hooks/use-image-upload'
import {
  ImageIcon,
  TrashIcon,
  Trash2Icon,
  XIcon,
  EraserIcon,
} from 'lucide-react'
import { ConfirmationDialog } from './confirmation-dialog'
import type { User } from '@/lib/types'
import Image from 'next/image'
import { Label } from './ui/label'
import { Separator } from './ui/separator'
import { usePathname, useRouter } from 'next/navigation'
import { clearAllChats, deleteAllChats } from '@/lib/db/mutations'

interface UserSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
}

export function UserSettings({ open, onOpenChange, user }: UserSettingsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const chatId = pathname.split('/chats/')[1]?.split('/')[0]
  const [username, setUsername] = useState(user.user_metadata.username || '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteChatsConfirm, setShowDeleteChatsConfirm] = useState(false)
  const [showClearChatsConfirm, setShowClearChatsConfirm] = useState(false)
  const [currentImageUrl, setCurrentImageUrl] = useState(
    user.user_metadata.imageUrl || ''
  )

  const {
    selectedImages,
    previewUrls,
    fileInputRef,
    uploadWithProgress,
    handleFileSelect,
    triggerFileSelect,
    clearSingleImage,
  } = useImageUpload(user.id, 'avatars', { maxImages: 1 })

  const updateUsernameMutation = useMutation({
    mutationFn: (newUsername: string) => updateUsername(user.id, newUsername),
    onSuccess: () => {
      toast.success('Username updated successfully')
    },
  })

  const updateImageMutation = useMutation({
    mutationFn: async ({
      file,
      imageUrl,
    }: {
      file?: File
      imageUrl: string
    }) => {
      let finalImageUrl = imageUrl
      if (file) {
        const [uploadedUrl] = await uploadWithProgress([file])
        finalImageUrl = uploadedUrl
      }
      await updateProfileImage(user.id, finalImageUrl, currentImageUrl)
      return finalImageUrl
    },
    onSuccess: (imageUrl) => {
      setCurrentImageUrl(imageUrl)
      clearSingleImage()
      toast.success(
        imageUrl
          ? 'Profile picture updated successfully'
          : 'Profile picture removed'
      )
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: () => deleteUser(user.id),
    onSuccess: () => {
      router.push('/login')
    },
  })

  const clearAllChatsMutation = useMutation({
    mutationFn: () => clearAllChats(user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      if (chatId) {
        queryClient.invalidateQueries({ queryKey: ['chat', chatId] })
      }
      toast.success('All chats cleared successfully')
    },
  })

  const deleteAllChatsMutation = useMutation({
    mutationFn: () => deleteAllChats(user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      if (chatId) {
        router.push('/chats')
      }
      toast.success('All chats deleted successfully')
    },
  })

  const handleUpdateUsername = async () => {
    if (!username.trim()) {
      toast.error('Username cannot be empty')
      return
    }

    if (username === user.user_metadata.username) {
      toast.error('Username is the same')
      return
    }

    updateUsernameMutation.mutate(username)
  }

  const handleSaveImage = async () => {
    if (selectedImages.length === 0) return

    updateImageMutation.mutate({
      file: selectedImages[0],
      imageUrl: '',
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Settings</DialogTitle>
            <DialogDescription>
              Manage your profile and account settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Profile Picture</Label>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                  {previewUrls[0] || currentImageUrl ? (
                    <Image
                      src={previewUrls[0] || currentImageUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                      width={80}
                      height={80}
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={updateImageMutation.isPending}
                  />
                  <div className="flex justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={triggerFileSelect}
                      disabled={
                        updateImageMutation.isPending ||
                        selectedImages.length > 0
                      }
                    >
                      Change Picture
                    </Button>
                    {selectedImages.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveImage}
                          disabled={updateImageMutation.isPending}
                        >
                          {updateImageMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearSingleImage}
                          disabled={updateImageMutation.isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                  {currentImageUrl && selectedImages.length === 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () =>
                        updateImageMutation.mutate({
                          imageUrl: '',
                        })
                      }
                      disabled={updateImageMutation.isPending}
                      className="text-destructive self-start"
                    >
                      <XIcon className="size-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <div className="flex gap-2">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  disabled={updateUsernameMutation.isPending}
                />
                <Button
                  onClick={handleUpdateUsername}
                  disabled={updateUsernameMutation.isPending}
                >
                  {updateUsernameMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Separator />
              <Label className="text-sm font-medium">Danger Zone</Label>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowClearChatsConfirm(true)}
                >
                  <EraserIcon className="size-4 mr-2" />
                  Clear All Chats
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowDeleteChatsConfirm(true)}
                >
                  <Trash2Icon className="size-4 mr-2" />
                  Delete All Chats
                </Button>
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <TrashIcon className="size-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={() => deleteUserMutation.mutate()}
        title="Delete Account"
        description="Are you sure you want to delete your account? This action is irreversible and all your data will be permanently deleted."
        confirmText="Delete Account"
        isLoading={deleteUserMutation.isPending}
      />

      <ConfirmationDialog
        open={showClearChatsConfirm}
        onOpenChange={setShowClearChatsConfirm}
        onConfirm={() => {
          clearAllChatsMutation.mutate()
          setShowClearChatsConfirm(false)
        }}
        title="Clear All Chats"
        description="Are you sure you want to clear all chats? This will remove all messages but keep the chat conversations."
        confirmText="Clear Chats"
        isLoading={clearAllChatsMutation.isPending}
      />

      <ConfirmationDialog
        open={showDeleteChatsConfirm}
        onOpenChange={setShowDeleteChatsConfirm}
        onConfirm={() => {
          deleteAllChatsMutation.mutate()
          setShowDeleteChatsConfirm(false)
        }}
        title="Delete All Chats"
        description="Are you sure you want to delete all chats? This action is irreversible and all chat data will be permanently deleted."
        confirmText="Delete Chats"
        isLoading={deleteAllChatsMutation.isPending}
      />
    </>
  )
}
