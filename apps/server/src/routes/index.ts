import type { RouterClient } from '@orpc/server'
import { chatRouter } from './chat'
import { messageRouter } from './message'
import { uploadthingRouter } from './uploadthing'

export const appRouter = {
  chat: chatRouter,
  message: messageRouter,
  uploadthing: uploadthingRouter,
}

export type AppRouter = RouterClient<typeof appRouter>
