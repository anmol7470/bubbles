'use client'

import { useUploadThing } from '@/lib/utils'
import { useRef, useState } from 'react'
import { toast } from 'react-hot-toast'

type SelectedImage = {
  file: File
  uploadedUrl: string
  previewUrl: string
}

type UseImageUploadOptions = {
  /** If true, selecting a new image replaces the previous one instead of adding to it */
  singleImageMode?: boolean
  /** Maximum number of images allowed. Defaults to 5 just as in the uploadthing config. */
  maxCount?: number
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const { singleImageMode = false, maxCount = 5 } = options
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([])

  const { startUpload, isUploading } = useUploadThing('imageUploader', {
    onClientUploadComplete: (res) => {
      setSelectedImages((prev) =>
        prev.map((image) => ({
          ...image,
          uploadedUrl: res.find((r) => r.name === image.file.name)?.ufsUrl ?? image.uploadedUrl,
        }))
      )
    },
    onUploadError: (error) => {
      toast.error(error.message)
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (files.length === 0) return

    // Max file size check
    const exceedMaxSizeFiles = files.filter((file) => file.size > 4 * 1024 * 1024)
    if (exceedMaxSizeFiles.length > 0) {
      toast.error(`File ${exceedMaxSizeFiles.map((f) => f.name).join(', ')} size exceeds 4MB`)
      return
    }

    // In single image mode, clear previous selection
    if (singleImageMode) {
      setSelectedImages((prev) => {
        prev.forEach((img) => URL.revokeObjectURL(img.previewUrl))
        return files.map((file) => ({ file, uploadedUrl: '', previewUrl: URL.createObjectURL(file) }))
      })

      // Reset the input value so the same file can be selected again
      if (e.target) {
        e.target.value = ''
      }
      return
    }

    // Duplicate image check
    const duplicateImages = files.filter((file) => selectedImages.some((f) => f.file.name === file.name))

    if (duplicateImages.length > 0) {
      toast.error(`File ${duplicateImages.map((f) => f.name).join(', ')} is already uploaded`)
      return
    }

    // Max image count check
    if (files.length + selectedImages.length > maxCount) {
      toast.error(`You can only upload up to ${maxCount} files`)
      return
    }

    // Only set preview URLs, don't upload yet
    setSelectedImages((prev) => [
      ...prev,
      ...files.map((file) => ({ file, uploadedUrl: '', previewUrl: URL.createObjectURL(file) })),
    ])

    // Reset the input value so the same file can be selected again
    if (e.target) {
      e.target.value = ''
    }
  }

  const uploadImages = async () => {
    const filesToUpload = selectedImages.filter((img) => !img.uploadedUrl)

    if (filesToUpload.length === 0) {
      throw new Error('No images to upload')
    }

    const uploaded = await startUpload(filesToUpload.map((img) => img.file))

    // Return the updated images with URLs
    return selectedImages.map((image) => {
      if (image.uploadedUrl) return image
      const uploadedFile = uploaded?.find((r) => r.name === image.file.name)
      return {
        ...image,
        uploadedUrl: uploadedFile?.ufsUrl ?? image.uploadedUrl,
      }
    })
  }

  const clearSelected = () => {
    setSelectedImages((prev) => {
      prev.forEach((img) => {
        URL.revokeObjectURL(img.previewUrl)
      })
      return []
    })
  }

  const removeImage = (index: number) => {
    setSelectedImages((prev) => {
      const imageToRemove = prev[index]
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  return {
    imageInputRef,
    selectedImages,
    setSelectedImages,
    isUploading,
    handleFileSelect,
    uploadImages,
    clearSelected,
    removeImage,
  }
}
