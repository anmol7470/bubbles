'use client'

import { authClient } from '@/lib/auth-client'
import type { User } from '@/lib/get-user'
import { ImageIcon, XIcon } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'

type UserSettingsProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
}

export function UserSettings({ open, onOpenChange, user }: UserSettingsProps) {
  const [username, setUsername] = useState(user.username ?? '')
  const [currentImageUrl, setCurrentImageUrl] = useState(user.image ?? '')
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(user.image ?? null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false)
  const [isUpdatingImage, setIsUpdatingImage] = useState(false)

  const handleUpdateUsername = async () => {
    try {
      if (!username.trim()) {
        toast.error('Username cannot be empty')
        return
      }

      if (username === user.username) {
        toast.error('Username is the same')
        return
      }

      setIsUpdatingUsername(true)
      const { error } = await authClient.updateUser({
        username,
      })

      if (error) {
        throw error.message ?? 'Failed to update username'
      }

      toast.success('Username updated successfully')
    } catch (error) {
      toast.error(error as string)
    } finally {
      setIsUpdatingUsername(false)
    }
  }

  const handleSaveImage = async () => {
    try {
      if (!selectedImage) {
        toast.error('No image selected')
        return
      }

      setIsUpdatingImage(true)
      const { error } = await authClient.updateUser({
        image: selectedImageUrl,
      })

      if (error) {
        throw error.message ?? 'Failed to update image'
      }

      setCurrentImageUrl(selectedImageUrl || '')
      setSelectedImage(null)
      toast.success('Image updated successfully')
    } catch (error) {
      toast.error(error as string)
    } finally {
      setIsUpdatingImage(false)
    }
  }

  const handleRemoveImage = async () => {
    try {
      setIsUpdatingImage(true)

      const { error } = await authClient.updateUser({
        image: '',
      })

      if (error) {
        throw error.message ?? 'Failed to remove image'
      }

      setCurrentImageUrl('')
      setSelectedImageUrl(null)
      toast.success('Image removed successfully')
    } catch (error) {
      toast.error(error as string)
    } finally {
      setIsUpdatingImage(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Settings</DialogTitle>
            <DialogDescription>Manage your profile settings</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Profile Picture</Label>
              <div className="flex items-center gap-4">
                <div className="bg-muted flex h-20 w-20 items-center justify-center overflow-hidden rounded-full">
                  {selectedImageUrl || currentImageUrl ? (
                    <Image
                      src={selectedImageUrl || currentImageUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                      width={80}
                      height={80}
                    />
                  ) : (
                    <ImageIcon className="text-muted-foreground h-8 w-8" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setSelectedImage(e.target.files?.[0] ?? null)}
                    disabled={isUpdatingImage}
                  />
                  <div className="flex justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUpdatingImage}
                    >
                      Change Picture
                    </Button>
                    {selectedImage && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveImage} disabled={isUpdatingImage}>
                          {isUpdatingImage ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedImage(null)}
                          disabled={isUpdatingImage}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                  {currentImageUrl && !selectedImage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveImage}
                      disabled={isUpdatingImage}
                      className="text-destructive self-start"
                    >
                      <XIcon className="size-4" />
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
                <Button onClick={handleUpdateUsername} disabled={isUpdatingUsername}>
                  {isUpdatingUsername ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
