import type { Context as HonoContext } from 'hono'
import { db } from '../db'
import { auth } from './auth'

export const createContext = async (c: HonoContext) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  })

  return {
    ...c,
    user: session?.user,
    db: db,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
