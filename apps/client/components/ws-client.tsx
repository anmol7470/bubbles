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
  TypingPayload,
  StopTypingPayload,
  DeleteMessagePayload,
  EditMessagePayload,
} from '@/lib/types'

type TypingState = {
  [chatId: string]: {
    userId: string
    username: string
  }[]
}

type WsClientContextType = {
  socket: Socket | null
  typingUsers: TypingState
}

export const WsClientContext = createContext<WsClientContextType>({
  socket: null,
  typingUsers: {},
})

export function WsClientProvider({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseClient()
  const queryClient = useQueryClient()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [typingUsers, setTypingUsers] = useState<TypingState>({})

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
          (member) => member.user?.id === userId
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
              if (!oldChat) return undefined
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

            const updatedChats = oldChats.map((chat) =>
              chat.id === payload.chatId
                ? {
                    ...chat,
                    messages: [
                      {
                        id: payload.message.id,
                        content: payload.message.content,
                        sentAt: payload.message.sentAt,
                        isDeleted: false,
                        isEdited: false,
                        senderId: payload.message.senderId,
                        images: payload.message.images ?? [],
                        sender: payload.message.sender,
                      },
                    ],
                  }
                : chat
            )

            // Sort by latest message sentAt (most recent first)
            return updatedChats.sort((a, b) => {
              const aTime = a.messages?.[0]?.sentAt ?? a.createdAt
              const bTime = b.messages?.[0]?.sentAt ?? b.createdAt
              return new Date(bTime).getTime() - new Date(aTime).getTime()
            })
          }
        )
      })

      socket.on('typing', (payload: TypingPayload) => {
        setTypingUsers((prev) => {
          const chatTypers = prev[payload.chatId] || []
          const alreadyTyping = chatTypers.some(
            (user) => user.userId === payload.userId
          )
          if (alreadyTyping) return prev

          return {
            ...prev,
            [payload.chatId]: [
              ...chatTypers,
              { userId: payload.userId, username: payload.username },
            ],
          }
        })
      })

      socket.on('stopTyping', (payload: StopTypingPayload) => {
        setTypingUsers((prev) => {
          const chatTypers = prev[payload.chatId] || []
          const updatedTypers = chatTypers.filter(
            (user) => user.userId !== payload.userId
          )

          if (updatedTypers.length === 0) {
            const { [payload.chatId]: _, ...rest } = prev
            return rest
          }

          return {
            ...prev,
            [payload.chatId]: updatedTypers,
          }
        })
      })

      socket.on('messageDeleted', (payload: DeleteMessagePayload) => {
        const isUserMember = payload.participants.some(
          (participant) => participant === userId
        )

        if (isUserMember) {
          // Update the chat messages view
          queryClient.setQueryData(
            ['chat', payload.chatId],
            (oldChat: ChatWithMessages) => {
              if (!oldChat) return undefined
              return {
                ...oldChat,
                messages: oldChat.messages.map((msg) =>
                  msg.id === payload.messageId
                    ? { ...msg, isDeleted: true }
                    : msg
                ),
              }
            }
          )

          // Update the chats list if this is the latest message
          queryClient.setQueryData(
            ['chats', userId],
            (oldChats: ChatWithMembers[]) => {
              if (!oldChats) return oldChats

              return oldChats.map((chat) =>
                chat.id === payload.chatId &&
                chat.messages?.[0]?.id === payload.messageId
                  ? {
                      ...chat,
                      messages: [{ ...chat.messages[0], isDeleted: true }],
                    }
                  : chat
              )
            }
          )
        }
      })

      socket.on('messageEdited', (payload: EditMessagePayload) => {
        const isUserMember = payload.participants.some(
          (participant) => participant === userId
        )

        if (isUserMember) {
          // Update the chat messages view
          queryClient.setQueryData(
            ['chat', payload.chatId],
            (oldChat: ChatWithMessages) => {
              if (!oldChat) return undefined
              return {
                ...oldChat,
                messages: oldChat.messages.map((msg) =>
                  msg.id === payload.messageId
                    ? {
                        ...msg,
                        content: payload.content,
                        images: payload.images ?? [],
                        isEdited: true,
                      }
                    : msg
                ),
              }
            }
          )

          // Update the chats list if this is the latest message
          queryClient.setQueryData(
            ['chats', userId],
            (oldChats: ChatWithMembers[]) => {
              if (!oldChats) return oldChats

              return oldChats.map((chat) =>
                chat.id === payload.chatId &&
                chat.messages?.[0]?.id === payload.messageId
                  ? {
                      ...chat,
                      messages: [
                        {
                          ...chat.messages[0],
                          content: payload.content,
                          images: payload.images ?? [],
                        },
                      ],
                    }
                  : chat
              )
            }
          )
        }
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

  return (
    <WsClientContext value={{ socket, typingUsers }}>
      {children}
    </WsClientContext>
  )
}

export function useWsClient() {
  return useContext(WsClientContext)
}
