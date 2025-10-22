import type { Outputs } from '@/lib/orpc'
import { useEffect, useRef, useState } from 'react'

export function useScroll(
  messages: Outputs['chat']['getChatMessages']['items'],
  typingUsers?: { userId: string; username: string }[]
) {
  const [isAtBottom, setIsAtBottom] = useState(true)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages or typing users change
  useEffect(() => {
    if (messages.length > 0 || (typingUsers && typingUsers.length > 0)) {
      scrollToBottom()
    }
  }, [messages, typingUsers])

  // Track scroll position to show/hide scroll to bottom button
  useEffect(() => {
    const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollViewport) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollViewport
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setIsAtBottom(isNearBottom)
    }

    scrollViewport.addEventListener('scroll', handleScroll)
    return () => scrollViewport.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToBottom = () => {
    const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollViewport) {
      scrollViewport.scrollTo({ top: scrollViewport.scrollHeight, behavior: 'instant' })
    }
  }

  return { scrollToBottom, scrollAreaRef, isAtBottom }
}
