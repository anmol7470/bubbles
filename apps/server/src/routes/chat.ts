import * as z from 'zod'
import { protectedProcedure } from '../lib/orpc'

export const chatRouter = {
  getChats: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
      })
    )
    .handler(async ({ context }) => {
      return 'Hello, world!'
    }),
}
