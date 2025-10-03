import { getAllChatsForUser, getChatById } from './db/queries'
import { z } from 'zod'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  email: z.email('Invalid email address'),
  username: z
    .string()
    .min(4, 'Username must be at least 4 characters')
    .max(20, 'Username must be less than 20 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type SignupFormData = z.infer<typeof signupSchema>

export type User = SupabaseUser & {
  user_metadata: SupabaseUser['user_metadata'] & {
    username?: string
    imageUrl?: string
  }
}

export type ChatWithMembers = NonNullable<
  Awaited<ReturnType<typeof getAllChatsForUser>>
>[number]

export type ChatWithMessages = NonNullable<
  Awaited<ReturnType<typeof getChatById>>
>

export type NewChatPayload = {
  chat: ChatWithMembers
}

export type NewMessagePayload = {
  message: {
    id: string
    chatId: string
    senderId: string
    content: string
    sentAt: Date
    images: { id: string; imageUrl: string }[]
    sender: {
      id: string
      username: string
      imageUrl: string | null
    }
  }
  chatId: string
  participants: string[]
}

export type TypingPayload = {
  chatId: string
  userId: string
  username: string
  participants: string[]
}

export type StopTypingPayload = {
  chatId: string
  userId: string
  participants: string[]
}

export type DeleteMessagePayload = {
  messageId: string
  chatId: string
  participants: string[]
}

export type EditMessagePayload = {
  messageId: string
  chatId: string
  content: string
  images: { id: string; imageUrl: string }[]
  participants: string[]
  deletedImageUrls?: string[]
}

export type StorageBucket = 'attachments' | 'avatars'
