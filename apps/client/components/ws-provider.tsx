'use client'

import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

type WsClientContextType = {
  socket: Socket | null
}

export const WsClientContext = createContext<WsClientContextType>({
  socket: null,
})

export function WsClientProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [socket, setSocket] = useState<Socket | null>(null)

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

      return socket
    }

    let currentSocket: Socket | undefined = undefined

    initializeSocket().then((socket) => {
      currentSocket = socket
    })

    return () => {
      currentSocket?.disconnect()
    }
  }, [queryClient])

  return <WsClientContext value={{ socket }}>{children}</WsClientContext>
}

export function useWsClient() {
  return useContext(WsClientContext)
}
