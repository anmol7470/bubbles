'use client'

import { io, type Socket } from 'socket.io-client'
import { useEffect, useState, useContext, createContext } from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import type {
  NewChatPayload,
  ChatWithMembers,
  ChatWithMessages,
  NewMessagePayload,
} from '@/lib/types'

export const WsClientContext = createContext<Socket | null>(null)

export function WsClientProvider({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseClient()
  const queryClient = useQueryClient()
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const initializeSocket = async () => {
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user.id

      // If user is not authenticated, don't connect to ws
      if (!userId) return

      const socket = io(process.env.NEXT_PUBLIC_WS_URL, {
        transports: ['websocket'],
        auth: {
          userId,
        },
      })
      socket.connect()
      setSocket(socket)

      socket.on('chatCreated', (payload: NewChatPayload) => {
        // Check if the current user is a member of this chat
        const isUserMember = payload.chat.members.some(
          (member) => member.user.id === userId
        )

        if (isUserMember) {
          queryClient.setQueryData<ChatWithMembers[]>(
            ['chats', userId],
            (oldChats) => {
              if (!oldChats) return [payload.chat]
              return [payload.chat, ...oldChats]
            }
          )
        }
      })

      socket.on('newMessage', (payload: NewMessagePayload) => {
        const isUserMember = payload.participants.some(
          (participant) => participant === userId
        )

        if (isUserMember) {
          queryClient.setQueryData(
            ['chat', payload.chatId],
            (oldChat: ChatWithMessages) => {
              if (!oldChat) return [payload.message]
              return {
                ...oldChat,
                messages: [...oldChat.messages, payload.message],
              }
            }
          )
        }

        queryClient.setQueryData(
          ['chats', userId],
          (oldChats: ChatWithMembers[]) => {
            if (!oldChats) return oldChats

            return oldChats.map((chat) =>
              chat.id === payload.chatId
                ? {
                    ...chat,
                    lastMessageContent: payload.message.content,
                    lastMessageSentAt: payload.message.sentAt,
                  }
                : chat
            )
          }
        )
      })

      return socket
    }

    let currentSocket: Socket | undefined = undefined

    initializeSocket().then((socket) => {
      currentSocket = socket
    })

    return () => {
      currentSocket?.disconnect()
    }
  }, [supabase, queryClient])

  return <WsClientContext value={socket}>{children}</WsClientContext>
}

export function useWsClient() {
  return useContext(WsClientContext)
}
