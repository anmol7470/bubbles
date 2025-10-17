import { chatRouter } from './chat'

export const appRouter = {
  chat: chatRouter,
}

export type AppRouter = typeof appRouter
