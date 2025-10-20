import * as z from 'zod'
import { protectedProcedure } from '../lib/orpc'
import { deleteImages } from '../lib/uploadthing'

// Single endpoint to delete images from uploadthing if not using function directly in other routers
export const uploadthingRouter = {
  deleteImages: protectedProcedure.input(z.array(z.string())).handler(async ({ input }) => {
    await deleteImages(input)
  }),
}
