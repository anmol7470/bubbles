import type { Context as HonoContext } from 'hono'
import { db } from '../db'
import { auth } from './auth'

export const createContext = async (context: HonoContext) => {
  const session = await auth.api.getSession({
    headers: context.req.header(),
  })

  return {
    ...context,
    user: session?.user,
    db: db,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
