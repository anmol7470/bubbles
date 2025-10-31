import { onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { Server as Engine } from '@socket.io/bun-engine'
import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { createRouteHandler } from 'uploadthing/server'
import { auth } from './lib/auth'
import { createContext } from './lib/context'
import { io } from './lib/io'
import { uploadRouter } from './lib/uploadthing'
import { appRouter } from './routes'

const app = new Hono()
const engine = new Engine()
io.bind(engine)

io.on('connection', async (socket) => {
  const headers = socket.handshake.headers
  const headersObj = Object.fromEntries(Object.entries(headers as Record<string, string>))

  const session = await auth.api.getSession({
    headers: new Headers(headersObj),
  })

  if (!session) {
    socket.disconnect()
    return
  }

  socket.join(`user:${session.user.id}`)
  socket.data.userId = session.user.id

  socket.on('typing', (data: { chatId: string; userId: string; username: string; chatMemberIds: string[] }) => {
    // Broadcast typing event to all chat members except the sender
    data.chatMemberIds.forEach((memberId) => {
      if (memberId !== data.userId) {
        io.to(`user:${memberId}`).emit('typing', {
          chatId: data.chatId,
          userId: data.userId,
          username: data.username,
        })
      }
    })
  })

  socket.on('stopTyping', (data: { chatId: string; userId: string; chatMemberIds: string[] }) => {
    // Broadcast stopTyping event to all chat members except the sender
    data.chatMemberIds.forEach((memberId) => {
      if (memberId !== data.userId) {
        io.to(`user:${memberId}`).emit('stopTyping', {
          chatId: data.chatId,
          userId: data.userId,
        })
      }
    })
  })
})

const { websocket } = engine.handler()

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN!,
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'B3',
      'Traceparent',
      'X-Uploadthing-Package',
      'X-Uploadthing-Version',
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
)

const handler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
})

app.use('/rpc/*', async (c, next) => {
  const { matched, response } = await handler.handle(c.req.raw, {
    prefix: '/rpc',
    context: await createContext(c),
  })

  if (matched) {
    return c.newResponse(response.body, response)
  }

  await next()
})

app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

const handlers = createRouteHandler({
  router: uploadRouter,
})

app.all('/api/uploadthing', (c) => handlers(c.req.raw))

export default {
  port: 3001,
  idleTimeout: 30,
  fetch(req: Request, server: Bun.ServerWebSocket) {
    const url = new URL(req.url)

    if (url.pathname === '/socket.io/') {
      return engine.handleRequest(req, server)
    } else {
      return app.fetch(req, server)
    }
  },
  websocket,
}
