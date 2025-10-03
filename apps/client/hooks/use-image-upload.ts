import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { createSupabaseClient } from '@/lib/supabase/client'
import type { StorageBucket } from '@/lib/types'

export function useImageUpload(
  userId: string,
  bucket: StorageBucket = 'attachments',
  options: {
    maxImages?: number
    autoPreview?: boolean
  } = {}
) {
  const { maxImages = 5, autoPreview = true } = options
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  const createPreviews = useCallback((files: File[]) => {
    return files.map((file) => URL.createObjectURL(file))
  }, [])

  const processFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return

      const uniqueNewFiles = files.filter((newFile) => {
        return !selectedImages.some(
          (existingFile) =>
            existingFile.name === newFile.name &&
            existingFile.size === newFile.size
        )
      })

      if (uniqueNewFiles.length < files.length) {
        const duplicateCount = files.length - uniqueNewFiles.length
        toast.error(
          `${duplicateCount} duplicate image${duplicateCount > 1 ? 's' : ''} skipped`
        )
      }

      const remainingSlots = maxImages - selectedImages.length
      const newImages = uniqueNewFiles.slice(0, remainingSlots)

      if (uniqueNewFiles.length > remainingSlots) {
        toast.error(`You can only upload up to ${maxImages} images at a time`)
      }

      if (newImages.length > 0) {
        setSelectedImages((prev) => [...prev, ...newImages])
        if (autoPreview) {
          const newPreviews = createPreviews(newImages)
          setPreviewUrls((prev) => [...prev, ...newPreviews])
        }
      }
    },
    [selectedImages, maxImages, autoPreview, createPreviews]
  )

  const removeImage = useCallback(
    (index: number) => {
      setSelectedImages((prev) => prev.filter((_, i) => i !== index))
      if (autoPreview) {
        setPreviewUrls((prev) => {
          const newUrls = prev.filter((_, i) => i !== index)
          if (prev[index]) {
            URL.revokeObjectURL(prev[index])
          }
          return newUrls
        })
      }
    },
    [autoPreview]
  )

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || [])
      processFiles(files)
      event.target.value = ''
    },
    [processFiles]
  )

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const uploadImages = useCallback(
    async (images: File[]): Promise<string[]> => {
      const supabase = createSupabaseClient()
      const uploadedUrls: string[] = []

      for (const image of images) {
        const fileExt = image.name.split('.').pop()
        const fileName = `${crypto.randomUUID()}.${fileExt}`
        const filePath = `${userId}/${fileName}`

        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(filePath, image)

        if (error) {
          throw new Error(`Failed to upload ${image.name}: ${error.message}`)
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(data.path)

        uploadedUrls.push(publicUrl)
      }

      return uploadedUrls
    },
    [userId, bucket]
  )

  const uploadWithProgress = useCallback(
    async (images: File[]): Promise<string[]> => {
      setIsUploadingImages(true)
      try {
        const uploadPromise = uploadImages(images)
        toast.promise(uploadPromise, {
          loading: 'Uploading images...',
          success: 'Images uploaded successfully',
          error: (error) =>
            error instanceof Error ? error.message : 'Failed to upload images',
        })
        const urls = await uploadPromise
        setIsUploadingImages(false)
        return urls
      } catch (error) {
        setIsUploadingImages(false)
        throw error
      }
    },
    [uploadImages]
  )

  const clearImages = useCallback(() => {
    setSelectedImages([])
    if (autoPreview) {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
      setPreviewUrls([])
    }
  }, [autoPreview, previewUrls])

  const selectSingleImage = useCallback(
    (file: File) => {
      if (autoPreview) {
        previewUrls.forEach((url) => URL.revokeObjectURL(url))
        const preview = URL.createObjectURL(file)
        setPreviewUrls([preview])
      }
      setSelectedImages([file])
    },
    [autoPreview, previewUrls]
  )

  const clearSingleImage = useCallback(() => {
    if (autoPreview && previewUrls[0]) {
      URL.revokeObjectURL(previewUrls[0])
      setPreviewUrls([])
    }
    setSelectedImages([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [autoPreview, previewUrls])

  return {
    selectedImages,
    isUploadingImages,
    previewUrls,
    fileInputRef,
    processFiles,
    removeImage,
    uploadWithProgress,
    clearImages,
    setSelectedImages,
    handleFileSelect,
    triggerFileSelect,
    selectSingleImage,
    clearSingleImage,
  }
}
