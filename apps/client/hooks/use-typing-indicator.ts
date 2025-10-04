import { useState, useMemo, useCallback, useEffect } from 'react'
import debounce from 'lodash.debounce'
import type { Socket } from 'socket.io-client'
import type { ChatWithMessages } from '@/lib/types'

export function useTypingIndicator(
  socket: Socket | null,
  chat: ChatWithMessages | null | undefined,
  chatId: string,
  userId: string,
  username: string
) {
  const [isTyping, setIsTyping] = useState(false)

  const emitStopTyping = useCallback(() => {
    if (socket && chat) {
      setIsTyping(false)
      socket.emit('stopTyping', {
        chatId,
        userId,
        participants: chat.members
          .map((m) => m.user?.id)
          .filter((id): id is string => !!id),
      })
    }
  }, [socket, chat, chatId, userId])

  const debouncedStopTyping = useMemo(
    () => debounce(emitStopTyping, 2000),
    [emitStopTyping]
  )

  const handleTyping = useCallback(() => {
    // Emit typing event only once when starting to type
    if (!isTyping && socket && chat) {
      setIsTyping(true)
      socket.emit('typing', {
        chatId,
        userId,
        username,
        participants: chat.members
          .map((m) => m.user?.id)
          .filter((id): id is string => !!id),
      })
    }

    // This resets the timer on each keystroke
    debouncedStopTyping()
  }, [isTyping, socket, chat, chatId, userId, username, debouncedStopTyping])

  const stopTyping = useCallback(() => {
    debouncedStopTyping.cancel()
    emitStopTyping()
  }, [debouncedStopTyping, emitStopTyping])

  // Clean up on unmount or chat change
  useEffect(() => {
    return () => {
      debouncedStopTyping.cancel()
      if (isTyping) {
        emitStopTyping()
      }
    }
  }, [chatId, isTyping, emitStopTyping, debouncedStopTyping])

  return {
    isTyping,
    handleTyping,
    stopTyping,
  }
}
