import type { RouterClient } from '@orpc/server'
import { chatRouter } from './chat'

export const appRouter = {
  chat: chatRouter,
}

export type AppRouter = RouterClient<typeof appRouter>
