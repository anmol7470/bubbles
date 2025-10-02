import { getAllChatsForUser, getChatById } from './db/queries'
import { createSupabaseClient } from './supabase/client'
import { z } from 'zod'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  email: z.email('Invalid email address'),
  username: z.string().min(4, 'Username must be at least 4 characters'),
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
  message: ChatWithMessages['messages'][number]
  chatId: string
  participants: string[]
}

export type SupabaseChannel = ReturnType<
  ReturnType<typeof createSupabaseClient>['channel']
>
