import type { Server, Socket } from 'socket.io'
import { createClient } from '@supabase/supabase-js'

let ioRef: Server | null = null

export async function setupWebsocket(io: Server) {
  ioRef = io

  io.on('connection', async (socket: Socket) => {
    const { userId } = socket.handshake.auth

    if (userId) {
      const supabase = await createSupabaseClient()
      const { data, error } = await supabase.getUserById(userId)

      if (error) {
        socket.disconnect()
        return
      }

      socket.join(userRoom(data.user.id))
      socket.data.user = data
    }

    socket.on('chatCreated', (data: { chat: any }) => {
      // Emit to all members of the new chat
      data.chat.members.forEach((member: { user: { id: string } }) => {
        io.to(userRoom(member.user.id)).emit('chatCreated', {
          chat: data.chat,
        })
      })
    })

    socket.on(
      'newMessage',
      (data: { message: any; chatId: string; participants: string[] }) => {
        data.participants.forEach((participant: string) => {
          io.to(userRoom(participant)).emit('newMessage', {
            message: data.message,
            chatId: data.chatId,
            participants: data.participants,
          })
        })
      }
    )
  })
}

function userRoom(userId: string) {
  return `user:${userId}`
}

async function createSupabaseClient() {
  const supabase = createClient(
    Bun.env.SUPABASE_URL!,
    Bun.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  return supabase.auth.admin
}
