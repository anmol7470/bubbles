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

    socket.on(
      'typing',
      (data: {
        chatId: string
        userId: string
        username: string
        participants: string[]
      }) => {
        // Emit to all participants except the sender
        data.participants
          .filter((participant: string) => participant !== data.userId)
          .forEach((participant: string) => {
            io.to(userRoom(participant)).emit('typing', {
              chatId: data.chatId,
              userId: data.userId,
              username: data.username,
              participants: data.participants,
            })
          })
      }
    )

    socket.on(
      'stopTyping',
      (data: { chatId: string; userId: string; participants: string[] }) => {
        // Emit to all participants except the sender
        data.participants
          .filter((participant: string) => participant !== data.userId)
          .forEach((participant: string) => {
            io.to(userRoom(participant)).emit('stopTyping', {
              chatId: data.chatId,
              userId: data.userId,
              participants: data.participants,
            })
          })
      }
    )

    socket.on(
      'messageDeleted',
      (data: { messageId: string; chatId: string; participants: string[] }) => {
        data.participants.forEach((participant: string) => {
          io.to(userRoom(participant)).emit('messageDeleted', {
            messageId: data.messageId,
            chatId: data.chatId,
            participants: data.participants,
          })
        })
      }
    )

    socket.on(
      'messageEdited',
      (data: {
        messageId: string
        chatId: string
        content: string
        images: { id: string; imageUrl: string }[]
        participants: string[]
        deletedImageUrls?: string[]
      }) => {
        data.participants.forEach((participant: string) => {
          io.to(userRoom(participant)).emit('messageEdited', {
            messageId: data.messageId,
            chatId: data.chatId,
            content: data.content,
            images: data.images,
            participants: data.participants,
            deletedImageUrls: data.deletedImageUrls,
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
