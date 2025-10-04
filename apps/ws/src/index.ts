import { Server } from 'socket.io'
import { Server as Engine } from '@socket.io/bun-engine'
import { Hono } from 'hono'
import { setupWebsocket } from './ws'

const io = new Server()
const engine = new Engine()
io.bind(engine)

// Setup websocket handlers
setupWebsocket(io)

const app = new Hono()

const { websocket } = engine.handler()

app.get('/', (c) => c.text('Hello from the server!'))

export default {
  port: 3001,
  idleTimeout: 30,

  fetch(req: Request, server: Bun.Server) {
    const url = new URL(req.url)

    if (url.pathname === '/socket.io/') {
      return engine.handleRequest(req, server)
    } else {
      return app.fetch(req, server)
    }
  },

  websocket,
}
