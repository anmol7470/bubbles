import { createSupabaseClient } from './utils'
import { getAllChatsForUser } from './db/queries'
import { getUser } from './auth/get-user'
import { z } from 'zod'

export const loginSchema = z.object({
  usernameOrEmail: z
    .string()
    .min(4, 'Username or email must be at least 4 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  email: z.email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(4, 'Username must be at least 4 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type SignupFormData = z.infer<typeof signupSchema>

export type User = NonNullable<Awaited<ReturnType<typeof getUser>>>

export type ChatWithMembers = NonNullable<
  Awaited<ReturnType<typeof getAllChatsForUser>>
>[number]

export type NewChatPayload = {
  chat: ChatWithMembers
}

export type SupabaseChannel = ReturnType<
  ReturnType<typeof createSupabaseClient>['channel']
>
