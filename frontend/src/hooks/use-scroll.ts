import type { Message } from '@/types/chat'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TypingUser } from './use-typing-indicator'

export function useScroll(messages: Message[], typingUsers?: TypingUser[]) {
  const [isAtBottom, setIsAtBottom] = useState(true)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)
  const lastMessageIdRef = useRef<string | null>(null)
  const bottomLockThreshold = 4

  const scrollToBottom = useCallback(() => {
    const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollViewport) {
      scrollViewport.scrollTo({ top: scrollViewport.scrollHeight, behavior: 'instant' })
      setIsAtBottom(true)
      isAtBottomRef.current = true
    }
  }, [])

  // Track scroll position to show/hide scroll to bottom button
  useEffect(() => {
    const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollViewport) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollViewport
      const distanceFromBottom = Math.max(scrollHeight - scrollTop - clientHeight, 0)
      const isNearBottom = distanceFromBottom <= bottomLockThreshold
      setIsAtBottom(isNearBottom)
      isAtBottomRef.current = isNearBottom
    }

    handleScroll()
    scrollViewport.addEventListener('scroll', handleScroll)
    return () => scrollViewport.removeEventListener('scroll', handleScroll)
  }, [])

  // Scroll to bottom on initial load or when a newer message arrives while already at bottom
  useEffect(() => {
    if (messages.length === 0) {
      lastMessageIdRef.current = null
      return
    }

    const latestMessageId = messages[messages.length - 1]?.id ?? null
    const isInitialLoad = lastMessageIdRef.current === null
    const hasNewerMessage = lastMessageIdRef.current !== null && lastMessageIdRef.current !== latestMessageId

    if (isInitialLoad || (hasNewerMessage && isAtBottomRef.current)) {
      scrollToBottom()
    }

    lastMessageIdRef.current = latestMessageId
  }, [messages, scrollToBottom])

  // Only auto-scroll for typing indicators if user is already at bottom
  useEffect(() => {
    if (!typingUsers || typingUsers.length === 0) return
    if (!isAtBottomRef.current) return
    scrollToBottom()
  }, [typingUsers?.length, scrollToBottom])

  return { scrollToBottom, scrollAreaRef, isAtBottom }
}
