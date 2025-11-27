import { getAuthTokenFn } from '@/server/chat'
import type { ChatInfo } from '@/types/chat'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { createContext, useCallback, useContext, useEffect, useRef } from 'react'

type EventType = 'message_sent' | 'message_edited' | 'message_deleted' | 'message_read' | 'typing_start' | 'typing_stop'

type WSMessage = {
  type: EventType
  payload: any
}

type EventHandler = (payload: any) => void

type WebSocketContextType = {
  send: (type: EventType, payload: any) => void
  on: (type: EventType, handler: EventHandler) => () => void
  isConnected: boolean
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const reconnectAttemptsRef = useRef(0)
  const eventHandlersRef = useRef<Map<EventType, Set<EventHandler>>>(new Map())
  const shouldReconnectRef = useRef(true)
  const isConnectedRef = useRef(false)
  const pendingMessagesRef = useRef<Array<{ type: string; payload: any }>>([])
  const joinedChatsRef = useRef<Set<string>>(new Set())

  const queryClient = useQueryClient()
  const getAuthTokenQuery = useServerFn(getAuthTokenFn)

  const { data: token } = useQuery({
    queryKey: ['authToken'],
    queryFn: async () => {
      const result = await getAuthTokenQuery()
      return result
    },
  })

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    if (!token || !shouldReconnectRef.current) {
      return
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'

    console.log('[WebSocket] Connecting...')
    const ws = new WebSocket(wsUrl, `Bearer.${token}`)

    ws.onopen = () => {
      console.log('[WebSocket] Connected')
      reconnectAttemptsRef.current = 0
      isConnectedRef.current = true

      // Get chats from TanStack Query cache
      const chats = queryClient.getQueryData<ChatInfo[]>(['chats'])

      if (chats) {
        chats.forEach((chat) => {
          joinedChatsRef.current.add(chat.id)
          ws.send(JSON.stringify({ type: 'join_chat', payload: { chat_id: chat.id } }))
        })
      } else {
        // Fallback: re-join previously tracked chats
        joinedChatsRef.current.forEach((chatId) => {
          ws.send(JSON.stringify({ type: 'join_chat', payload: { chat_id: chatId } }))
        })
      }

      // Send any pending messages
      while (pendingMessagesRef.current.length > 0) {
        const msg = pendingMessagesRef.current.shift()
        if (msg) {
          ws.send(JSON.stringify(msg))
        }
      }
    }

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data)
        const handlers = eventHandlersRef.current.get(message.type)

        if (handlers) {
          handlers.forEach((handler) => handler(message.payload))
        }
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error)
    }

    ws.onclose = () => {
      isConnectedRef.current = false
      wsRef.current = null

      if (!shouldReconnectRef.current) {
        return
      }

      const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
      console.log(`[WebSocket] Reconnecting in ${backoffDelay}ms...`)

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current++
        connect()
      }, backoffDelay)
    }

    wsRef.current = ws
  }, [token, queryClient])

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = undefined
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const send = useCallback((type: EventType, payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }))
    } else {
      pendingMessagesRef.current.push({ type, payload })
    }
  }, [])

  const on = useCallback((type: EventType, handler: EventHandler) => {
    if (!eventHandlersRef.current.has(type)) {
      eventHandlersRef.current.set(type, new Set())
    }
    eventHandlersRef.current.get(type)!.add(handler)

    return () => {
      const handlers = eventHandlersRef.current.get(type)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          eventHandlersRef.current.delete(type)
        }
      }
    }
  }, [])

  useEffect(() => {
    shouldReconnectRef.current = true
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  const value: WebSocketContextType = {
    send,
    on,
    isConnected: isConnectedRef.current,
  }

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
