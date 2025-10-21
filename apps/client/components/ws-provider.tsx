'use client'

import type { User } from '@/lib/get-user'
import { orpc } from '@/lib/orpc'
import type {
  Chats,
  MessageDeletedEventData,
  MessageEditedEventData,
  MessageSentEventData,
  MessagesPage,
  StopTypingEventData,
  TypingEventData,
} from '@/lib/types'
import { InfiniteData, useQueryClient } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

export type TypingState = {
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

export function WsClientProvider({ children, user }: { children: React.ReactNode; user: User }) {
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const chatId = pathname.split('/chats/')[1]?.split('/')[0]
  const currentChatId = useMemo(() => chatId ?? null, [chatId])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [typingUsers, setTypingUsers] = useState<TypingState>({})

  const messagesQueryKey = useMemo(
    () =>
      orpc.chat.getChatMessages.key({
        type: 'infinite',
        input: { chatId: currentChatId },
      }),
    [currentChatId]
  )

  const chatsQueryKey = useMemo(() => orpc.chat.getAllChats.key({ type: 'query' }), [])
  const unreadCountsQueryKey = useMemo(() => orpc.chat.getUnreadCounts.key({ type: 'query' }), [])

  useEffect(() => {
    // can initialize without checking for user because we are rendering the provider in /chats layout which is protected

    const initializeSocket = async () => {
      const socket = io(process.env.NEXT_PUBLIC_SERVER_URL, {
        transports: ['websocket'],
        withCredentials: true,
      })
      socket.connect()
      setSocket(socket)

      socket.on('connect', () => {
        console.log('Connected to WS')
      })

      socket.on('disconnect', () => {
        console.log('Disconnected from WS')
      })

      socket.on('message:sent', (data: MessageSentEventData) => {
        if (!data.chatMemberIds.includes(user.id)) return

        queryClient.setQueriesData({ queryKey: messagesQueryKey }, (oldData: InfiniteData<MessagesPage>) => {
          if (!oldData) return oldData

          // Add new message to the first page
          const newPages = [...oldData.pages]
          if (newPages[0]) {
            newPages[0] = {
              ...newPages[0],
              items: [data.newMessage, ...newPages[0].items],
            }
          }

          return {
            ...oldData,
            pages: newPages,
          }
        })

        // Update chat list to show new last message
        queryClient.setQueriesData({ queryKey: chatsQueryKey }, (oldData: Chats | undefined) => {
          if (!oldData) return oldData

          return oldData.map((chat) => {
            return {
              ...chat,
              messages: [data.newMessage, ...chat.messages.slice(1)],
            }
          })
        })

        queryClient.setQueriesData(
          { queryKey: unreadCountsQueryKey },
          (oldData: Record<string, number> | undefined) => {
            if (!oldData) return oldData
            if (chatId !== data.newMessage.chatId) return oldData

            return {
              ...oldData,
              [data.newMessage.chatId]: oldData[data.newMessage.chatId] + 1,
            }
          }
        )
      })

      socket.on('message:edited', (data: MessageEditedEventData) => {
        if (!data.chatMemberIds.includes(user.id)) return

        queryClient.setQueriesData({ queryKey: messagesQueryKey }, (oldData: InfiniteData<MessagesPage>) => {
          if (!oldData) return oldData

          const newPages = oldData.pages.map((page) => ({
            ...page,
            items: page.items.map((msg) =>
              msg.id === data.editedMessage.id
                ? {
                    ...msg,
                    content: data.editedMessage.content,
                    isEdited: true,
                    images: data.editedMessage.images,
                  }
                : msg
            ),
          }))

          return {
            ...oldData,
            pages: newPages,
          }
        })

        queryClient.setQueriesData({ queryKey: chatsQueryKey }, (oldData: Chats | undefined) => {
          if (!oldData) return oldData

          return oldData.map((chat) => {
            return {
              ...chat,
              messages: chat.messages.map((msg) => (msg.id === data.editedMessage.id ? data.editedMessage : msg)),
            }
          })
        })
      })

      socket.on('message:deleted', (data: MessageDeletedEventData) => {
        if (!data.chatMemberIds.includes(user.id)) return

        queryClient.setQueriesData({ queryKey: messagesQueryKey }, (oldData: InfiniteData<MessagesPage>) => {
          if (!oldData) return oldData

          return oldData.pages.map((page) => ({
            ...page,
            items: page.items.filter((msg) => msg.id !== data.messageId),
          }))
        })

        queryClient.setQueriesData({ queryKey: chatsQueryKey }, (oldData: Chats | undefined) => {
          if (!oldData) return oldData

          return oldData.map((chat) => {
            return {
              ...chat,
              messages: chat.messages.map((msg) => (msg.id === data.messageId ? { ...msg, isDeleted: true } : msg)),
            }
          })
        })
      })

      socket.on('typing', (payload: TypingEventData) => {
        setTypingUsers((prev) => {
          const chatTypers = prev[payload.chatId] || []
          const alreadyTyping = chatTypers.some((user) => user.userId === payload.userId)
          if (alreadyTyping) return prev

          return {
            ...prev,
            [payload.chatId]: [...chatTypers, { userId: payload.userId, username: payload.username }],
          }
        })
      })

      socket.on('stopTyping', (payload: StopTypingEventData) => {
        setTypingUsers((prev) => {
          const chatTypers = prev[payload.chatId] || []
          const updatedTypers = chatTypers.filter((user) => user.userId !== payload.userId)

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

      return socket
    }

    let currentSocket: Socket | undefined = undefined

    initializeSocket().then((socket) => {
      currentSocket = socket
    })

    return () => {
      currentSocket?.disconnect()
    }
  }, [queryClient, messagesQueryKey, chatsQueryKey, unreadCountsQueryKey, user.id, chatId])

  return <WsClientContext value={{ socket, typingUsers }}>{children}</WsClientContext>
}

export function useWsClient() {
  return useContext(WsClientContext)
}
