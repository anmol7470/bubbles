import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import type { ErrorResponse } from '../types/auth'
import type {
  ChatUser,
  CreateChatRequest,
  CreateChatResponse,
  GetChatByIdResponse,
  GetChatMessagesRequest,
  GetChatMessagesResponse,
  GetChatsResponse,
  SearchUsersRequest,
  SendMessageRequest,
} from '../types/chat'
import { useAppSession } from './session'

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8000'

export const searchUsersFn = createServerFn({ method: 'POST' })
  .inputValidator((data: SearchUsersRequest) => data)
  .handler(async ({ data }) => {
    const session = await useAppSession()
    const token = session.data.token

    if (!token) {
      throw redirect({ to: '/auth' })
    }

    try {
      const response = await fetch(`${BACKEND_URL}/chat/search-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error: ErrorResponse = await response.json()
        return { success: false, error: error.error, users: [] }
      }

      const users: ChatUser[] = await response.json()
      return { success: true, users }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to connect to server',
        users: [],
      }
    }
  })

export const createChatFn = createServerFn({ method: 'POST' })
  .inputValidator((data: CreateChatRequest) => data)
  .handler(async ({ data }) => {
    const session = await useAppSession()
    const token = session.data.token

    if (!token) {
      throw redirect({ to: '/auth' })
    }

    try {
      const response = await fetch(`${BACKEND_URL}/chat/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error: ErrorResponse = await response.json()
        return { success: false, error: error.error }
      }

      const result: CreateChatResponse = await response.json()
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to connect to server',
      }
    }
  })

export const getUserChatsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await useAppSession()
  const token = session.data.token

  if (!token) {
    throw redirect({ to: '/auth' })
  }

  try {
    const response = await fetch(`${BACKEND_URL}/chat/all`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error: error.error, chats: [] }
    }

    const result: GetChatsResponse = await response.json()
    return { success: true, chats: result.chats }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to connect to server',
      chats: [],
    }
  }
})

export const getChatByIdFn = createServerFn({ method: 'GET' })
  .inputValidator((chatId: string) => chatId)
  .handler(async ({ data: chatId }) => {
    const session = await useAppSession()
    const token = session.data.token

    if (!token) {
      throw redirect({ to: '/auth' })
    }

    try {
      const response = await fetch(`${BACKEND_URL}/chat/${chatId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error: ErrorResponse = await response.json()
        return { success: false, error: error.error, chat: null }
      }

      const result: GetChatByIdResponse = await response.json()
      return { success: true, chat: result }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to connect to server',
        chat: null,
      }
    }
  })

export const getChatMessagesFn = createServerFn({ method: 'POST' })
  .inputValidator((data: GetChatMessagesRequest) => data)
  .handler(async ({ data }) => {
    const session = await useAppSession()
    const token = session.data.token

    if (!token) {
      throw redirect({ to: '/auth' })
    }

    try {
      const response = await fetch(`${BACKEND_URL}/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error: ErrorResponse = await response.json()
        return { success: false, error: error.error, items: [], next_cursor: undefined }
      }

      const result: GetChatMessagesResponse = await response.json()
      return { success: true, ...result }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to connect to server',
        items: [],
        next_cursor: undefined,
      }
    }
  })

export const sendMessageFn = createServerFn({ method: 'POST' })
  .inputValidator((data: SendMessageRequest) => data)
  .handler(async ({ data }) => {
    const session = await useAppSession()
    const token = session.data.token

    if (!token) {
      throw redirect({ to: '/auth' })
    }

    try {
      const response = await fetch(`${BACKEND_URL}/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error: ErrorResponse = await response.json()
        return { success: false, error: error.error }
      }

      const result = await response.json()
      return { success: true, message_id: result.message_id }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to connect to server',
      }
    }
  })
