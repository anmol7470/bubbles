import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createSupabaseClient } from '@/lib/supabase/client'
import type {
  SupabaseChannel,
  NewMessagePayload,
  ChatWithMessages,
} from '@/lib/types'

export function useMessageChannel(chatId: string): SupabaseChannel | null {
  const [messageChannel, setMessageChannel] = useState<SupabaseChannel | null>(
    null
  )
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!chatId) return

    const supabase = createSupabaseClient()
    const channel = supabase.channel(`chat:${chatId}`, {
      config: {
        broadcast: {
          self: true,
        },
      },
    })
    setMessageChannel(channel)

    channel
      .on(
        'broadcast' as const,
        { event: 'newMessage' },
        (payload: { payload: NewMessagePayload }) => {
          const { message } = payload.payload

          // Add the new message to the existing messages
          queryClient.setQueryData(
            ['chat', chatId],
            (oldChat: ChatWithMessages) => {
              if (!oldChat) return oldChat

              // Check if message already exists to avoid duplicates
              const messageExists = oldChat.messages.some(
                (existingMessage) => existingMessage.id === message.id
              )

              if (!messageExists) {
                return {
                  ...oldChat,
                  messages: [...oldChat.messages, message],
                }
              }

              return oldChat
            }
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId, queryClient])

  return messageChannel
}
