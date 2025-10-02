'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function login(email: string, password: string) {
  const supabase = await createSupabaseClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/', 'layout')
  redirect('/chats')
}

export async function signup(
  email: string,
  password: string,
  username: string
) {
  const supabase = await createSupabaseClient()

  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        imageUrl: '', // initially empty but can be updated later
      },
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  if (data.user) {
    await db.insert(users).values({
      id: data.user.id,
      username: data.user.user_metadata.username,
    })
  }

  revalidatePath('/', 'layout')
  redirect('/chats')
}

export async function deleteUser(userId: string) {
  const supabaseAdmin = await createSupabaseAdminClient()

  await db.delete(users).where(eq(users.id, userId))
  await supabaseAdmin.deleteUser(userId)

  revalidatePath('/', 'layout')
  redirect('/login')
}
