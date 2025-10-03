'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { deleteImagesFromStorage } from '@/lib/db/mutations'

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
}

export async function signout() {
  const supabase = await createSupabaseClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/', 'layout')
}

export async function updateUsername(userId: string, newUsername: string) {
  const supabaseAdmin = await createSupabaseAdminClient()

  const { error: metadataError } = await supabaseAdmin.updateUserById(userId, {
    user_metadata: { username: newUsername },
  })

  if (metadataError) {
    throw new Error(metadataError.message)
  }

  await db
    .update(users)
    .set({ username: newUsername })
    .where(eq(users.id, userId))

  revalidatePath('/', 'layout')
}

export async function updateProfileImage(
  userId: string,
  imageUrl: string,
  oldImageUrl?: string
) {
  const supabaseAdmin = await createSupabaseAdminClient()

  // Delete old image from storage if it exists and is different from new one
  if (oldImageUrl && oldImageUrl !== imageUrl) {
    await deleteImagesFromStorage([oldImageUrl])
  }

  const { error: metadataError } = await supabaseAdmin.updateUserById(userId, {
    user_metadata: { imageUrl },
  })

  if (metadataError) {
    throw new Error(metadataError.message)
  }

  await db
    .update(users)
    .set({ imageUrl: imageUrl ?? null })
    .where(eq(users.id, userId))

  revalidatePath('/', 'layout')
}

export async function deleteUser(userId: string) {
  const supabaseAdmin = await createSupabaseAdminClient()

  await db.delete(users).where(eq(users.id, userId))
  await supabaseAdmin.deleteUser(userId)

  revalidatePath('/', 'layout')
}
