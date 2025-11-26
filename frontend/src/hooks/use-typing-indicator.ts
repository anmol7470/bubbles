import { useWebSocket } from '@/contexts/websocket-context'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDebounceCallback } from 'usehooks-ts'

export type TypingUser = {
  user_id: string
  username: string
  profile_image_url?: string | null
}

export function useTypingIndicator(
  chatId: string,
  currentUserId: string,
  currentUsername: string,
  currentUserProfileImageUrl?: string | null
) {
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map())
  const { send, on } = useWebSocket()
  const isTypingRef = useRef(false)

  const sendTypingStart = useCallback(() => {
    if (!isTypingRef.current) {
      send('typing_start', {
        chat_id: chatId,
        user_id: currentUserId,
        username: currentUsername,
        profile_image_url: currentUserProfileImageUrl,
      })
      isTypingRef.current = true
    }
  }, [send, chatId, currentUserId, currentUsername, currentUserProfileImageUrl])

  const sendTypingStop = useCallback(() => {
    if (isTypingRef.current) {
      send('typing_stop', {
        chat_id: chatId,
        user_id: currentUserId,
        username: currentUsername,
        profile_image_url: currentUserProfileImageUrl,
      })
      isTypingRef.current = false
    }
  }, [send, chatId, currentUserId, currentUsername, currentUserProfileImageUrl])

  const debouncedTypingStop = useDebounceCallback(sendTypingStop, 2000)

  const handleTyping = useCallback(() => {
    sendTypingStart()
    debouncedTypingStop()
  }, [sendTypingStart, debouncedTypingStop])

  const stopTyping = useCallback(() => {
    debouncedTypingStop.cancel()
    sendTypingStop()
  }, [debouncedTypingStop, sendTypingStop])

  useEffect(() => {
    const unsubscribeStart = on('typing_start', (payload: TypingUser & { chat_id: string }) => {
      if (payload.chat_id !== chatId || payload.user_id === currentUserId) return

      setTypingUsers((prev) => {
        const next = new Map(prev)
        next.set(payload.user_id, {
          user_id: payload.user_id,
          username: payload.username,
          profile_image_url: payload.profile_image_url,
        })
        return next
      })
    })

    const unsubscribeStop = on('typing_stop', (payload: TypingUser & { chat_id: string }) => {
      if (payload.chat_id !== chatId) return

      setTypingUsers((prev) => {
        const next = new Map(prev)
        next.delete(payload.user_id)
        return next
      })
    })

    return () => {
      unsubscribeStart()
      unsubscribeStop()
      stopTyping()
    }
  }, [chatId, currentUserId, on, stopTyping])

  return {
    typingUsers: Array.from(typingUsers.values()),
    handleTyping,
    stopTyping,
  }
}
