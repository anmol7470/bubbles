import { useImageUpload } from '@/hooks/use-image-upload'
import { updateUserProfileFn, type UpdateUserProfileInput } from '@/server/user'
import type { User } from '@/types/auth'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ImagePlusIcon, Loader2Icon, RotateCcwIcon, TrashIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { UserAvatar } from './user-avatar'

type UserSettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
}

export function UserSettingsDialog({ open, onOpenChange, user }: UserSettingsDialogProps) {
  const router = useRouter()
  const updateProfile = useServerFn(updateUserProfileFn)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [username, setUsername] = useState(user.username)
  const [persistedImage, setPersistedImage] = useState<string | null>(user.profile_image_url ?? null)
  const [removeImage, setRemoveImage] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { selectedImages, handleFileChange, clearImages, uploadImages, isUploading } = useImageUpload({
    maxImages: 1,
    replaceExisting: true,
  })

  useEffect(() => {
    if (open) {
      setUsername(user.username)
      setPersistedImage(user.profile_image_url ?? null)
      setRemoveImage(false)
      setError(null)
      clearImages()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user])

  const previewImage = selectedImages[0]?.previewUrl ?? persistedImage ?? undefined
  const normalizedUsername = username.trim()
  const hasUsernameChanged = normalizedUsername !== user.username
  const hasImageChanges = selectedImages.length > 0 || removeImage

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: UpdateUserProfileInput) => {
      const result = await updateProfile({ data: payload })
      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile')
      }
      return result.user
    },
    onSuccess: async (updatedUser) => {
      toast.success('Profile updated')
      setPersistedImage(updatedUser.profile_image_url ?? null)
      clearImages()
      setRemoveImage(false)
      setError(null)
      onOpenChange(false)
      await router.invalidate()
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : 'Failed to update profile')
    },
  })

  const isSaving = isUploading || updateProfileMutation.isPending

  const handleSelectPhoto = () => {
    setRemoveImage(false)
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRemoveImage(false)
    handleFileChange(event)
  }

  const handleClearSelection = () => {
    clearImages()
    setPersistedImage(user.profile_image_url ?? null)
    setRemoveImage(false)
  }

  const handleRemovePhoto = () => {
    clearImages()
    setPersistedImage(null)
    setRemoveImage(true)
  }

  const handleSave = async () => {
    if (!normalizedUsername) {
      setError('Username is required')
      return
    }

    let uploadedUrl: string | null | undefined
    if (selectedImages.length > 0) {
      try {
        const imageUrls = await uploadImages([selectedImages[0].file])
        uploadedUrl = imageUrls[0] ?? null
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload image')
        return
      }
    } else if (removeImage) {
      uploadedUrl = null
    }

    const payload: UpdateUserProfileInput = { username: normalizedUsername }
    if (uploadedUrl !== undefined) {
      payload.profile_image_url = uploadedUrl
    }

    await updateProfileMutation.mutateAsync(payload)
  }

  const canSave = hasUsernameChanged || hasImageChanges

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User settings</DialogTitle>
          <DialogDescription>Update your display name and profile picture.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <UserAvatar username={normalizedUsername || user.username} image={previewImage} className="size-16" />
            <div className="space-y-2">
              <p className="text-sm font-medium">Profile photo</p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <Button type="button" variant="outline" size="sm" onClick={handleSelectPhoto} disabled={isSaving}>
                  <ImagePlusIcon className="mr-2 size-4" />
                  Change photo
                </Button>
                {selectedImages.length > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleClearSelection}
                    disabled={isSaving}
                  >
                    <RotateCcwIcon className="mr-2 size-4" />
                    Reset selection
                  </Button>
                )}
                {(persistedImage || removeImage) && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleRemovePhoto} disabled={isSaving}>
                    <TrashIcon className="mr-2 size-4" />
                    Remove photo
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG or WebP up to 4MB.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-username">Username</Label>
            <Input
              id="settings-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              maxLength={50}
              autoComplete="off"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving && <Loader2Icon className="mr-2 size-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
