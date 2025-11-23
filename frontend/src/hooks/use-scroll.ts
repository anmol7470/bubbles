import type { Message } from '@/types/chat'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TypingUser } from './use-typing-indicator'

export function useScroll(messages: Message[], typingUsers?: TypingUser[]) {
  const [isAtBottom, setIsAtBottom] = useState(true)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

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
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setIsAtBottom(isNearBottom)
      isAtBottomRef.current = isNearBottom
    }

    handleScroll()
    scrollViewport.addEventListener('scroll', handleScroll)
    return () => scrollViewport.removeEventListener('scroll', handleScroll)
  }, [])

  // Scroll to bottom when new messages load (existing behavior)
  useEffect(() => {
    if (messages.length === 0) return
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Only auto-scroll for typing indicators if user is already at bottom
  useEffect(() => {
    if (!typingUsers || typingUsers.length === 0) return
    if (!isAtBottomRef.current) return
    scrollToBottom()
  }, [typingUsers, scrollToBottom])

  return { scrollToBottom, scrollAreaRef, isAtBottom }
}
