import { useWebSocket } from '@/contexts/websocket-context'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { ChatInfo, GetChatMessagesResponse, Message } from '../types/chat'

type MessageSentPayload = {
  id: string
  chat_id: string
  sender_id: string
  sender_username: string
  content?: string
  images: string[]
  is_deleted: boolean
  is_edited: boolean
  created_at: string
}

type MessageEditedPayload = {
  id: string
  chat_id: string
  content?: string
  images: string[]
  is_edited: boolean
  updated_at: string
}

type MessageDeletedPayload = {
  id: string
  chat_id: string
  is_deleted: boolean
}

export function useChatWebSocket(chatId?: string) {
  const queryClient = useQueryClient()
  const { on, send } = useWebSocket()

  useEffect(() => {
    if (!chatId) return

    send('join_chat', { chat_id: chatId })

    return () => {
      send('leave_chat', { chat_id: chatId })
    }
  }, [chatId, send])

  useEffect(() => {
    if (!chatId) return

    const unsubscribeSent = on('message_sent', (payload: MessageSentPayload) => {
      if (payload.chat_id !== chatId) return

      console.log('[useChatWebSocket] Received message_sent for chat:', chatId, payload)

      queryClient.setQueryData<{ pages: GetChatMessagesResponse[]; pageParams: any[] }>(
        ['messages', chatId],
        (oldData) => {
          if (!oldData) {
            console.log('[useChatWebSocket] No existing data, skipping update')
            return oldData
          }

          const newMessage: Message = {
            id: payload.id,
            content: payload.content,
            sender_id: payload.sender_id,
            sender_username: payload.sender_username,
            is_deleted: payload.is_deleted,
            is_edited: payload.is_edited,
            images: payload.images,
            created_at: payload.created_at,
          }

          const firstPage = oldData.pages[0]
          if (!firstPage) {
            console.log('[useChatWebSocket] No first page, skipping update')
            return oldData
          }

          const messageExists = firstPage.items.some((msg) => msg.id === newMessage.id)
          if (messageExists) {
            console.log('[useChatWebSocket] Message already exists, skipping')
            return oldData
          }

          console.log('[useChatWebSocket] Adding new message to cache')
          return {
            ...oldData,
            pages: [
              {
                ...firstPage,
                items: [newMessage, ...firstPage.items],
              },
              ...oldData.pages.slice(1),
            ],
          }
        }
      )
    })

    const unsubscribeEdited = on('message_edited', (payload: MessageEditedPayload) => {
      if (payload.chat_id !== chatId) return

      queryClient.setQueryData<{ pages: GetChatMessagesResponse[]; pageParams: any[] }>(
        ['messages', chatId],
        (oldData) => {
          if (!oldData) return oldData

          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              items: page.items.map((msg) =>
                msg.id === payload.id
                  ? {
                      ...msg,
                      content: payload.content,
                      images: payload.images,
                      is_edited: payload.is_edited,
                    }
                  : msg
              ),
            })),
          }
        }
      )
    })

    const unsubscribeDeleted = on('message_deleted', (payload: MessageDeletedPayload) => {
      if (payload.chat_id !== chatId) return

      queryClient.setQueryData<{ pages: GetChatMessagesResponse[]; pageParams: any[] }>(
        ['messages', chatId],
        (oldData) => {
          if (!oldData) return oldData

          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              items: page.items.map((msg) =>
                msg.id === payload.id
                  ? {
                      ...msg,
                      is_deleted: payload.is_deleted,
                    }
                  : msg
              ),
            })),
          }
        }
      )
    })

    return () => {
      unsubscribeSent()
      unsubscribeEdited()
      unsubscribeDeleted()
    }
  }, [chatId, on, queryClient])
}

type GetChatsResponse = {
  success: boolean
  chats: ChatInfo[]
  error?: string
}

export function useChatListWebSocket() {
  const queryClient = useQueryClient()
  const { on } = useWebSocket()

  useEffect(() => {
    const unsubscribeSent = on('message_sent', (payload: MessageSentPayload) => {
      queryClient.setQueryData<GetChatsResponse>(['chats'], (oldData) => {
        if (!oldData || !oldData.success) return oldData

        const oldChats = oldData.chats
        const chatIndex = oldChats.findIndex((chat) => chat.id === payload.chat_id)
        if (chatIndex === -1) return oldData

        const updatedChat = {
          ...oldChats[chatIndex],
          last_message: {
            id: payload.id,
            content: payload.content,
            sender: {
              id: payload.sender_id,
              username: payload.sender_username,
            },
            is_deleted: payload.is_deleted,
            images: payload.images,
            created_at: payload.created_at,
          },
          updated_at: payload.created_at,
        }

        const updatedChats = [...oldChats]
        updatedChats.splice(chatIndex, 1)
        updatedChats.unshift(updatedChat)

        return {
          ...oldData,
          chats: updatedChats,
        }
      })
    })

    const unsubscribeEdited = on('message_edited', (payload: MessageEditedPayload) => {
      queryClient.setQueryData<GetChatsResponse>(['chats'], (oldData) => {
        if (!oldData || !oldData.success) return oldData

        return {
          ...oldData,
          chats: oldData.chats.map((chat) => {
            if (chat.id === payload.chat_id && chat.last_message?.id === payload.id) {
              return {
                ...chat,
                last_message: {
                  ...chat.last_message,
                  content: payload.content,
                  images: payload.images,
                },
              }
            }
            return chat
          }),
        }
      })
    })

    const unsubscribeDeleted = on('message_deleted', (payload: MessageDeletedPayload) => {
      queryClient.setQueryData<GetChatsResponse>(['chats'], (oldData) => {
        if (!oldData || !oldData.success) return oldData

        return {
          ...oldData,
          chats: oldData.chats.map((chat) => {
            if (chat.id === payload.chat_id && chat.last_message?.id === payload.id) {
              return {
                ...chat,
                last_message: {
                  ...chat.last_message,
                  is_deleted: payload.is_deleted,
                },
              }
            }
            return chat
          }),
        }
      })
    })

    return () => {
      unsubscribeSent()
      unsubscribeEdited()
      unsubscribeDeleted()
    }
  }, [on, queryClient])
}
