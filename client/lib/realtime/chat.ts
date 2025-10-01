import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createSupabaseClient } from '@/lib/supabase/client'
import type {
  SupabaseChannel,
  NewChatPayload,
  NewMessagePayload,
  ChatWithMembers,
  User,
} from '@/lib/types'

export function useChatChannel(
  user: User,
  chats?: ChatWithMembers[]
): SupabaseChannel | null {
  const [chatChannel, setChatChannel] = useState<SupabaseChannel | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createSupabaseClient()

    // Create new chat channel
    const chatChannel = supabase.channel('new-chat', {
      config: {
        broadcast: {
          self: true,
        },
      },
    })

    chatChannel
      .on(
        'broadcast' as const,
        { event: 'chatCreated' },
        (payload: { payload: NewChatPayload }) => {
          const { chat } = payload.payload

          // Check if the current user is a member of this new chat
          const isUserMember = chat.members.some(
            (member) => member.user.id === user.id
          )

          if (isUserMember) {
            // Add the new chat to the existing chats list
            queryClient.setQueryData(
              ['chats', user.id],
              (oldChats: ChatWithMembers[]) => {
                if (!oldChats) return [chat]

                // Check if chat already exists to avoid duplicates
                const chatExists = oldChats.some(
                  (existingChat) => existingChat.id === chat.id
                )

                if (!chatExists) {
                  return [chat, ...oldChats]
                }

                return oldChats
              }
            )
          }
        }
      )
      .subscribe()

    setChatChannel(chatChannel)

    // Set up message listening for all user's chats
    const messageChannels: SupabaseChannel[] = []

    if (chats) {
      chats.forEach((chat) => {
        const messageChannel = supabase.channel(`chat:${chat.id}`, {
          config: {
            broadcast: {
              self: true,
            },
          },
        })

        messageChannel
          .on(
            'broadcast' as const,
            { event: 'newMessage' },
            (payload: { payload: NewMessagePayload }) => {
              const { message, chatId } = payload.payload

              // Update the chat's last message info
              queryClient.setQueryData(
                ['chats', user.id],
                (oldChats: ChatWithMembers[]) => {
                  if (!oldChats) return oldChats

                  return oldChats
                    .map((chat) => {
                      if (chat.id === chatId) {
                        return {
                          ...chat,
                          lastMessageContent: message.content,
                          lastMessageSentAt: message.sentAt,
                        }
                      }
                      return chat
                    })
                    .sort((a, b) => {
                      // Sort by last message time, then by creation time
                      const aTime = a.lastMessageSentAt || a.createdAt
                      const bTime = b.lastMessageSentAt || b.createdAt
                      return (
                        new Date(bTime).getTime() - new Date(aTime).getTime()
                      )
                    })
                }
              )
            }
          )
          .subscribe()

        messageChannels.push(messageChannel)
      })
    }

    return () => {
      supabase.removeChannel(chatChannel)
      messageChannels.forEach((channel) => {
        supabase.removeChannel(channel)
      })
    }
  }, [user, queryClient, chats])

  return chatChannel
}
