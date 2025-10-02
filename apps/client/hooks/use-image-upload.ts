import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { createSupabaseClient } from '@/lib/supabase/client'

export function useImageUpload(userId: string) {
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)

  const processFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return

      // Filter out duplicates based on name and size
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

      // Limit to 5 images total
      const remainingSlots = 5 - selectedImages.length
      const newImages = uniqueNewFiles.slice(0, remainingSlots)

      if (uniqueNewFiles.length > remainingSlots) {
        toast.error(`You can only upload up to 5 images at a time`)
      }

      if (newImages.length > 0) {
        setSelectedImages((prev) => [...prev, ...newImages])
      }
    },
    [selectedImages]
  )

  const removeImage = useCallback((index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
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
          .from('attachments')
          .upload(filePath, image)

        if (error) {
          throw new Error(`Failed to upload ${image.name}: ${error.message}`)
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('attachments').getPublicUrl(data.path)

        uploadedUrls.push(publicUrl)
      }

      return uploadedUrls
    },
    [userId]
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
  }, [])

  return {
    selectedImages,
    isUploadingImages,
    processFiles,
    removeImage,
    uploadWithProgress,
    clearImages,
    setSelectedImages,
  }
}
