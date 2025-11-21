import { uploadImageFn } from '@/server/chat'
import { useMutation } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'

type UploadProgress = {
  file: File
  progress: number
  url: string | null
  error: string | null
}

export function useImageUpload() {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map())
  const uploadImageQuery = useServerFn(uploadImageFn)

  const { mutateAsync: uploadSingleImage } = useMutation({
    mutationFn: uploadImageQuery,
  })

  const uploadImages = async (files: File[]): Promise<string[]> => {
    const errors: string[] = []

    // Initialize upload progress for all files
    const newUploads = new Map<string, UploadProgress>()
    files.forEach((file) => {
      const key = `${file.name}-${file.size}`
      newUploads.set(key, {
        file,
        progress: 0,
        url: null,
        error: null,
      })
    })
    setUploads(newUploads)

    // Upload all images concurrently
    const uploadPromises = files.map(async (file) => {
      const key = `${file.name}-${file.size}`

      try {
        // Update progress to indicate upload started
        setUploads((prev) => {
          const next = new Map(prev)
          const upload = next.get(key)
          if (upload) {
            next.set(key, { ...upload, progress: 50 })
          }
          return next
        })

        const result = await uploadSingleImage({ data: { file } })

        if (result.success && result.url) {
          // Update progress to complete
          setUploads((prev) => {
            const next = new Map(prev)
            const upload = next.get(key)
            if (upload) {
              next.set(key, { ...upload, progress: 100, url: result.url })
            }
            return next
          })

          return result.url
        } else {
          const errorMsg = result.error || 'Failed to upload image'
          setUploads((prev) => {
            const next = new Map(prev)
            const upload = next.get(key)
            if (upload) {
              next.set(key, { ...upload, error: errorMsg })
            }
            return next
          })

          errors.push(`${file.name}: ${errorMsg}`)
          return null
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Upload failed'
        setUploads((prev) => {
          const next = new Map(prev)
          const upload = next.get(key)
          if (upload) {
            next.set(key, { ...upload, error: errorMsg })
          }
          return next
        })

        errors.push(`${file.name}: ${errorMsg}`)
        return null
      }
    })

    const results = await Promise.all(uploadPromises)

    // Filter out null values (failed uploads)
    const successfulUrls = results.filter((url): url is string => url !== null)

    // Clear upload state after a delay
    setTimeout(() => {
      setUploads(new Map())
    }, 2000)

    if (errors.length > 0) {
      throw new Error(errors.join('\n'))
    }

    return successfulUrls
  }

  const clearUploads = () => {
    setUploads(new Map())
  }

  return {
    uploadImages,
    uploads,
    clearUploads,
    isUploading: uploads.size > 0,
  }
}
