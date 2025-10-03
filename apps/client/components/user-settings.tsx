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
import { useMutation } from '@tanstack/react-query'
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
import { useRouter } from 'next/navigation'

interface UserSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
}

export function UserSettings({ open, onOpenChange, user }: UserSettingsProps) {
  const router = useRouter()
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

  const { mutateAsync: updateUsernameMutation, isPending: isUpdatingUsername } =
    useMutation({
      mutationFn: (newUsername: string) => updateUsername(user.id, newUsername),
      onSuccess: () => {
        toast.success('Username updated successfully')
      },
    })

  const { mutateAsync: updateImageMutation, isPending: isUpdatingImage } =
    useMutation({
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

  const { mutateAsync: deleteUserMutation } = useMutation({
    mutationFn: () => deleteUser(user.id),
    onSuccess: () => {
      router.push('/login')
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

    await updateUsernameMutation(username)
  }

  const handleSaveImage = async () => {
    if (selectedImages.length === 0) return

    await updateImageMutation({
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
                    disabled={isUpdatingImage}
                  />
                  <div className="flex justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={triggerFileSelect}
                      disabled={isUpdatingImage || selectedImages.length > 0}
                    >
                      Change Picture
                    </Button>
                    {selectedImages.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveImage}
                          disabled={isUpdatingImage}
                        >
                          {isUpdatingImage ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearSingleImage}
                          disabled={isUpdatingImage}
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
                        await updateImageMutation({
                          imageUrl: '',
                        })
                      }
                      disabled={isUpdatingImage}
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
                  disabled={isUpdatingUsername}
                />
                <Button
                  onClick={handleUpdateUsername}
                  disabled={isUpdatingUsername}
                >
                  {isUpdatingUsername ? 'Saving...' : 'Save'}
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
        onConfirm={async () => await deleteUserMutation()}
        title="Delete Account"
        description="Are you sure you want to delete your account? This action is irreversible and all your data will be permanently deleted."
        confirmText="Delete Account"
      />

      <ConfirmationDialog
        open={showClearChatsConfirm}
        onOpenChange={setShowClearChatsConfirm}
        onConfirm={() => {
          // TODO: Implement clear all chats
          setShowClearChatsConfirm(false)
        }}
        title="Clear All Chats"
        description="Are you sure you want to clear all chats? This will remove all messages but keep the chat conversations."
        confirmText="Clear Chats"
      />

      <ConfirmationDialog
        open={showDeleteChatsConfirm}
        onOpenChange={setShowDeleteChatsConfirm}
        onConfirm={() => {
          // TODO: Implement delete all chats
          setShowDeleteChatsConfirm(false)
        }}
        title="Delete All Chats"
        description="Are you sure you want to delete all chats? This action is irreversible and all chat data will be permanently deleted."
        confirmText="Delete Chats"
      />
    </>
  )
}
