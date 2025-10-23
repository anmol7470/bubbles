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
import { type InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

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

export function WsClientProvider({ children, user }: { children: React.ReactNode; user: User }) {
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [typingUsers, setTypingUsers] = useState<TypingState>({})

  const currentChatId = useMemo(() => {
    const chatId = pathname.split('/chats/')[1]?.split('/')[0]
    return chatId ?? null
  }, [pathname])

  // Keep the latest chatId in a ref to avoid re-registering socket listeners
  const currentChatIdRef = useRef<string | null>(currentChatId)
  useEffect(() => {
    currentChatIdRef.current = currentChatId
  }, [currentChatId])

  const chatsQueryKey = useMemo(() => orpc.chat.getAllChats.key({ type: 'query' }), [])
  const unreadCountsQueryKey = useMemo(() => orpc.chat.getUnreadCounts.key({ type: 'query' }), [])
  const { mutate: markChatAsRead } = useMutation(orpc.chat.markChatAsRead.mutationOptions())

  useEffect(() => {
    // can initialize without checking for user because we are rendering the provider in /chats layout which is protected

    const initializeSocket = async () => {
      const socket = io(process.env.NEXT_PUBLIC_SERVER_URL, {
        transports: ['websocket'],
        withCredentials: true,
      })
      socket.connect()
      setSocket(socket)

      socket.on('message:sent', (data: MessageSentEventData) => {
        if (!data.chatMemberIds.includes(user.id)) return

        // Only update messages if we are on this chat
        if (currentChatIdRef.current === data.newMessage.chatId) {
          const messagesQueryKey = orpc.chat.getChatMessages.key({
            type: 'infinite',
            input: { chatId: data.newMessage.chatId },
          })
          queryClient.setQueriesData({ queryKey: messagesQueryKey }, (oldData: InfiniteData<MessagesPage>) => {
            // If query doesn't exist yet, trigger a refetch instead
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
        }

        // Update chat list to show new last message and re-sort by most recent
        queryClient.setQueriesData({ queryKey: chatsQueryKey }, (oldData: Chats | undefined) => {
          if (!oldData) return oldData

          const updatedChats = oldData.map((chat) => {
            if (chat.id === data.newMessage.chatId) {
              return {
                ...chat,
                messages: [data.newMessage],
              }
            }
            return chat
          })

          // Sort chats by last message sentAt time (most recent first)
          return updatedChats.sort((a, b) => {
            const aTime = a.messages[0]?.sentAt
              ? new Date(a.messages[0].sentAt).getTime()
              : new Date(a.createdAt).getTime()
            const bTime = b.messages[0]?.sentAt
              ? new Date(b.messages[0].sentAt).getTime()
              : new Date(b.createdAt).getTime()
            return bTime - aTime
          })
        })

        // If user is on this chat, mark it as read
        // Else, increment the unread countof that particular chat
        if (currentChatIdRef.current === data.newMessage.chatId) {
          markChatAsRead({ chatId: data.newMessage.chatId })
        } else {
          queryClient.setQueriesData(
            { queryKey: unreadCountsQueryKey },
            (oldData: Record<string, number> | undefined) => {
              if (!oldData) return oldData

              return {
                ...oldData,
                [data.newMessage.chatId]: oldData[data.newMessage.chatId] + 1,
              }
            }
          )
        }
      })

      socket.on('message:edited', (data: MessageEditedEventData) => {
        if (!data.chatMemberIds.includes(user.id)) return

        // Only update messages if we are on this chat
        if (currentChatIdRef.current === data.editedMessage.chatId) {
          const messagesQueryKey = orpc.chat.getChatMessages.key({
            type: 'infinite',
            input: { chatId: data.editedMessage.chatId },
          })
          queryClient.setQueriesData({ queryKey: messagesQueryKey }, (oldData: InfiniteData<MessagesPage>) => {
            // If query doesn't exist yet, trigger a refetch instead
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
        }

        // Update chat list if this was the last message
        queryClient.setQueriesData({ queryKey: chatsQueryKey }, (oldData: Chats | undefined) => {
          if (!oldData) return oldData

          return oldData.map((chat) => {
            if (chat.id === data.editedMessage.chatId && chat.messages[0]?.id === data.editedMessage.id) {
              return {
                ...chat,
                messages: [data.editedMessage],
              }
            }
            return chat
          })
        })
      })

      socket.on('message:deleted', (data: MessageDeletedEventData) => {
        if (!data.chatMemberIds.includes(user.id)) return

        // Only update messages if we are on this chat
        if (currentChatIdRef.current === data.chatId) {
          const messagesQueryKey = orpc.chat.getChatMessages.key({
            type: 'infinite',
            input: { chatId: data.chatId },
          })
          queryClient.setQueriesData({ queryKey: messagesQueryKey }, (oldData: InfiniteData<MessagesPage>) => {
            if (!oldData) return oldData

            return {
              ...oldData,
              pages: oldData.pages.map((page) => ({
                ...page,
                items: page.items.map((msg) =>
                  msg.id === data.messageId ? { ...msg, isDeleted: true, content: '' } : msg
                ),
              })),
            }
          })
        }

        // Update chat list if this was the last message
        queryClient.setQueriesData({ queryKey: chatsQueryKey }, (oldData: Chats | undefined) => {
          if (!oldData) return oldData

          return oldData.map((chat) => {
            if (chat.id === data.chatId && chat.messages[0]?.id === data.messageId) {
              return {
                ...chat,
                messages: [{ ...chat.messages[0], isDeleted: true, content: '' }],
              }
            }
            return chat
          })
        })
      })

      socket.on('typing', (payload: TypingEventData) => {
        if (payload.userId === user.id) return

        setTypingUsers((prev) => {
          const chatTypers = prev[payload.chatId] || []
          const alreadyTyping = chatTypers.some((u) => u.userId === payload.userId)
          if (alreadyTyping) return prev

          return {
            ...prev,
            [payload.chatId]: [...chatTypers, { userId: payload.userId, username: payload.username }],
          }
        })
      })

      socket.on('stopTyping', (payload: StopTypingEventData) => {
        if (payload.userId === user.id) return

        setTypingUsers((prev) => {
          const chatTypers = prev[payload.chatId] || []
          const updatedTypers = chatTypers.filter((u) => u.userId !== payload.userId)

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
      if (currentSocket) {
        // Clean up all event listeners before disconnecting
        currentSocket.off('connect')
        currentSocket.off('disconnect')
        currentSocket.off('message:sent')
        currentSocket.off('message:edited')
        currentSocket.off('message:deleted')
        currentSocket.off('typing')
        currentSocket.off('stopTyping')
        currentSocket.disconnect()
      }
    }
  }, [queryClient, chatsQueryKey, unreadCountsQueryKey, user.id])

  return <WsClientContext value={{ socket, typingUsers }}>{children}</WsClientContext>
}

export function useWsClient() {
  return useContext(WsClientContext)
}
