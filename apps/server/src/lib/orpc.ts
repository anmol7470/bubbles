import { ORPCError, os } from '@orpc/server'
import type { Context } from './context'

export const o = os.$context<Context>()

export const publicProcedure = o

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.user) {
    throw new ORPCError('UNAUTHORIZED')
  }

  return next({
    context: {
      user: context.user,
      db: context.db,
    },
  })
})

export const protectedProcedure = publicProcedure.use(requireAuth)
