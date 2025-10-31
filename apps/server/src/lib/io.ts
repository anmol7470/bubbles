import { Server } from 'socket.io'

export const io = new Server({
  cors: {
    origin: process.env.CORS_ORIGIN!,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
})
