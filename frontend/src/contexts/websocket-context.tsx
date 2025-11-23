import { getAuthTokenFn } from '@/server/chat'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react'

type EventType = 'message_sent' | 'message_edited' | 'message_deleted' | 'typing_start' | 'typing_stop'

type WSMessage = {
  type: EventType
  payload: any
}

type EventHandler = (payload: any) => void

type WebSocketContextType = {
  send: (type: EventType | 'join_chat' | 'leave_chat', payload: any) => void
  on: (type: EventType, handler: EventHandler) => () => void
  isConnected: boolean
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const reconnectAttemptsRef = useRef(0)
  const eventHandlersRef = useRef<Map<EventType, Set<EventHandler>>>(new Map())
  const shouldReconnectRef = useRef(true)
  const isConnectedRef = useRef(false)
  const pendingMessagesRef = useRef<Array<{ type: string; payload: any }>>([])
  const joinedChatsRef = useRef<Set<string>>(new Set())

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
      console.log('[WebSocket] Not connecting:', !token ? 'no token' : 'reconnect disabled')
      return
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'

    console.log('[WebSocket] Connecting...')
    const ws = new WebSocket(wsUrl, `Bearer.${token}`)

    ws.onopen = () => {
      console.log('[WebSocket] Connected')
      reconnectAttemptsRef.current = 0
      isConnectedRef.current = true

      // Re-join all previously joined chats
      joinedChatsRef.current.forEach((chatId) => {
        console.log('[WebSocket] Re-joining chat:', chatId)
        ws.send(JSON.stringify({ type: 'join_chat', payload: { chat_id: chatId } }))
      })

      // Send any pending messages
      while (pendingMessagesRef.current.length > 0) {
        const msg = pendingMessagesRef.current.shift()
        if (msg) {
          console.log('[WebSocket] Sending pending message:', msg.type)
          ws.send(JSON.stringify(msg))
        }
      }
    }

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data)
        console.log('[WebSocket] Received:', message.type, message.payload)
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
      console.log('[WebSocket] Disconnected')
      isConnectedRef.current = false
      wsRef.current = null

      if (!shouldReconnectRef.current) {
        console.log('[WebSocket] Reconnection disabled, not reconnecting')
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
  }, [token])

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

  const send = useCallback((type: EventType | 'join_chat' | 'leave_chat', payload: any) => {
    // Track joined chats
    if (type === 'join_chat' && payload.chat_id) {
      joinedChatsRef.current.add(payload.chat_id)
      console.log('[WebSocket] Tracking joined chat:', payload.chat_id)
    } else if (type === 'leave_chat' && payload.chat_id) {
      joinedChatsRef.current.delete(payload.chat_id)
      console.log('[WebSocket] Untracking left chat:', payload.chat_id)
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Sending:', type, payload)
      wsRef.current.send(JSON.stringify({ type, payload }))
    } else {
      console.log('[WebSocket] Not connected, queuing message:', type)
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
