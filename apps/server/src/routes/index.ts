import type { RouterClient } from '@orpc/server'
import { chatRouter } from './chat'
import { userRouter } from './user'

export const appRouter = {
  chat: chatRouter,
  user: userRouter,
}

export type AppRouter = RouterClient<typeof appRouter>
