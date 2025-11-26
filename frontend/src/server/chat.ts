import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import type { ErrorResponse } from '../types/auth'
import type {
  ChangeChatAdminRequest,
  ChatUser,
  CreateChatRequest,
  CreateChatResponse,
  DeleteMessageRequest,
  EditMessageRequest,
  GetChatByIdResponse,
  GetChatMessagesRequest,
  GetChatMessagesResponse,
  GetChatsResponse,
  ModifyChatMemberRequest,
  RenameChatRequest,
  SearchUsersRequest,
  SendMessageRequest,
} from '../types/chat'
import { useAppSession } from './session'

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8000'

export const getAuthTokenFn = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await useAppSession()
  return session.data.token || null
})

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
        return { success: false, error: error.error, retry_after: error.retry_after, users: [] }
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
        return { success: false, error: error.error }
      }

      const result: GetChatByIdResponse = await response.json()
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to connect to server',
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
      const response = await fetch(`${BACKEND_URL}/messages/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error: ErrorResponse = await response.json()
        return { success: false, error: error.error, items: [] }
      }

      const result: GetChatMessagesResponse = await response.json()
      return { success: true, ...result }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to connect to server',
        items: [],
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

    const response = await fetch(`${BACKEND_URL}/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error: error.error, retry_after: error.retry_after }
    }

    const result = await response.json()
    return { success: true, message_id: result.message_id }
  })

export const editMessageFn = createServerFn({ method: 'POST' })
  .inputValidator((data: EditMessageRequest) => data)
  .handler(async ({ data }) => {
    const session = await useAppSession()
    const token = session.data.token

    if (!token) {
      throw redirect({ to: '/auth' })
    }

    try {
      const response = await fetch(`${BACKEND_URL}/messages/edit`, {
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

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to connect to server',
      }
    }
  })

export const deleteMessageFn = createServerFn({ method: 'POST' })
  .inputValidator((data: DeleteMessageRequest) => data)
  .handler(async ({ data }) => {
    const session = await useAppSession()
    const token = session.data.token

    if (!token) {
      throw redirect({ to: '/auth' })
    }

    try {
      const response = await fetch(`${BACKEND_URL}/messages/delete`, {
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

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to connect to server',
      }
    }
  })

type ChatIdPayload = {
  chatId: string
}

const authenticatedFetch = async (path: string, options: RequestInit, errorFallback: string) => {
  const session = await useAppSession()
  const token = session.data.token

  if (!token) {
    throw redirect({ to: '/auth' })
  }

  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: options.body,
    })

    if (!response.ok) {
      const error: ErrorResponse = await response.json()
      return { success: false, error: error.error }
    }

    if (response.headers.get('content-length') === '0') {
      return { success: true }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: errorFallback,
    }
  }
}

export const clearChatFn = createServerFn({ method: 'POST' })
  .inputValidator((data: ChatIdPayload) => data)
  .handler(async ({ data }) => {
    return authenticatedFetch(`/chat/${data.chatId}/clear`, {}, 'Failed to clear chat')
  })

export const deleteChatFn = createServerFn({ method: 'POST' })
  .inputValidator((data: ChatIdPayload) => data)
  .handler(async ({ data }) => {
    return authenticatedFetch(`/chat/${data.chatId}/delete`, {}, 'Failed to delete chat')
  })

export const leaveChatFn = createServerFn({ method: 'POST' })
  .inputValidator((data: ChatIdPayload) => data)
  .handler(async ({ data }) => {
    return authenticatedFetch(`/chat/${data.chatId}/leave`, {}, 'Failed to leave chat')
  })

export const renameChatFn = createServerFn({ method: 'POST' })
  .inputValidator((data: RenameChatRequest) => data)
  .handler(async ({ data }) => {
    return authenticatedFetch(
      `/chat/${data.chat_id}/rename`,
      {
        body: JSON.stringify({ name: data.name }),
      },
      'Failed to rename chat'
    )
  })

export const addChatMemberFn = createServerFn({ method: 'POST' })
  .inputValidator((data: ModifyChatMemberRequest) => data)
  .handler(async ({ data }) => {
    return authenticatedFetch(
      `/chat/${data.chat_id}/members/add`,
      {
        body: JSON.stringify({ user_id: data.user_id }),
      },
      'Failed to add member'
    )
  })

export const removeChatMemberFn = createServerFn({ method: 'POST' })
  .inputValidator((data: ModifyChatMemberRequest) => data)
  .handler(async ({ data }) => {
    return authenticatedFetch(
      `/chat/${data.chat_id}/members/remove`,
      {
        body: JSON.stringify({ user_id: data.user_id }),
      },
      'Failed to remove member'
    )
  })

export const changeChatAdminFn = createServerFn({ method: 'POST' })
  .inputValidator((data: ChangeChatAdminRequest) => data)
  .handler(async ({ data }) => {
    return authenticatedFetch(
      `/chat/${data.chat_id}/change-admin`,
      {
        body: JSON.stringify({ user_id: data.user_id }),
      },
      'Failed to change admin'
    )
  })
