'use client'

import { useState, useRef, useEffect } from 'react'
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
import { useImageUpload } from '@/hooks/use-image-upload'
import {
  ImageIcon,
  TrashIcon,
  Trash2Icon,
  EraserIcon,
  XIcon,
} from 'lucide-react'
import { ConfirmationDialog } from './confirmation-dialog'
import { useRouter } from 'next/navigation'
import type { User } from '@/lib/types'
import Image from 'next/image'
import { Label } from './ui/label'
import { Separator } from './ui/separator'

interface UserSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
}

export function UserSettings({ open, onOpenChange, user }: UserSettingsProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [username, setUsername] = useState(user.user_metadata.username || '')
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false)
  const [isUpdatingImage, setIsUpdatingImage] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showClearChatsConfirm, setShowClearChatsConfirm] = useState(false)
  const [showDeleteChatsConfirm, setShowDeleteChatsConfirm] = useState(false)
  const [currentImageUrl, setCurrentImageUrl] = useState(
    user.user_metadata.imageUrl || ''
  )
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { uploadWithProgress } = useImageUpload(user.id, 'profile_pics')

  // Cleanup preview URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleUpdateUsername = async () => {
    if (!username.trim()) {
      toast.error('Username cannot be empty')
      return
    }

    if (username === user.user_metadata.username) {
      toast.error('Username is the same')
      return
    }

    setIsUpdatingUsername(true)
    try {
      await updateUsername(user.id, username)
      toast.success('Username updated successfully')
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update username'
      )
    } finally {
      setIsUpdatingUsername(false)
    }
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

  const handleSaveImage = async () => {
    if (!selectedFile) return

    setIsUpdatingImage(true)
    try {
      const [imageUrl] = await uploadWithProgress([selectedFile])
      await updateProfileImage(user.id, imageUrl)
      setCurrentImageUrl(imageUrl)

      // Clean up preview and selected file
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      setSelectedFile(null)

      toast.success('Profile picture updated successfully')
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update profile picture'
      )
    } finally {
      setIsUpdatingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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

  const handleDeleteAccount = async () => {
    try {
      await deleteUser(user.id)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete account'
      )
    }
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
                  {previewUrl || currentImageUrl ? (
                    <Image
                      src={previewUrl || currentImageUrl}
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
                    onChange={handleImageSelect}
                    disabled={isUpdatingImage}
                  />
                  <div className="flex justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUpdatingImage || !!selectedFile}
                    >
                      Change Picture
                    </Button>
                    {selectedFile && (
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
                          onClick={handleCancelImageSelect}
                          disabled={isUpdatingImage}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                  {currentImageUrl && !selectedFile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        setIsUpdatingImage(true)
                        try {
                          await updateProfileImage(user.id, '')
                          setCurrentImageUrl('')
                          toast.success('Profile picture removed')
                          router.refresh()
                        } catch (error) {
                          toast.error('Failed to remove profile picture')
                        } finally {
                          setIsUpdatingImage(false)
                        }
                      }}
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
        onConfirm={handleDeleteAccount}
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
        description="Are you sure you want to clear all chat messages? This action is irreversible."
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
