import { createUploadthing, UploadThingError, UTApi, type FileRouter } from 'uploadthing/server'
import { auth } from './auth'

const f = createUploadthing()

export const uploadRouter = {
  imageUploader: f({
    image: {
      maxFileSize: '4MB',
      maxFileCount: 5,
    },
  })
    .middleware(async ({ req }) => {
      const user = await auth.api.getSession({
        headers: req.headers,
      })

      if (!user) {
        throw new UploadThingError('Unauthorized')
      }

      return { userId: user.user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('upload completed for userId:', metadata.userId)
      console.log('file url:', file.ufsUrl)
      return { uploadedBy: metadata.userId }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof uploadRouter

const utapi = new UTApi()

export async function deleteImages(imageUrls: string[]) {
  const keys = imageUrls.map((url) => url.split('/f/').pop() as string)
  await Promise.all(keys.map((key) => utapi.deleteFiles(key)))
}
