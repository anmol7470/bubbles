'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/db'
import { chatMembers, users } from '@/lib/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { deleteImagesFromStorage } from '@/lib/db/mutations'

export async function login(email: string, password: string) {
  const supabase = await createSupabaseClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
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
    return { success: false, error: error.message }
  }

  if (data.user) {
    await db.insert(users).values({
      id: data.user.id,
      username: data.user.user_metadata.username,
    })
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function signout() {
  const supabase = await createSupabaseClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateUsername(userId: string, newUsername: string) {
  const supabaseAdmin = await createSupabaseAdminClient()

  const { error: metadataError } = await supabaseAdmin.updateUserById(userId, {
    user_metadata: { username: newUsername },
  })

  if (metadataError) {
    return { success: false, error: metadataError.message }
  }

  await db
    .update(users)
    .set({ username: newUsername })
    .where(eq(users.id, userId))

  revalidatePath('/', 'layout')
  return { success: true }
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
    return { success: false, error: metadataError.message }
  }

  await db
    .update(users)
    .set({ imageUrl: imageUrl ?? null })
    .where(eq(users.id, userId))

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function deleteUser(userId: string) {
  try {
    const supabaseAdmin = await createSupabaseAdminClient()

    // Soft delete: mark user as inactive to anonymize them
    // Messages and DM memberships will remain but show as "Anonymous User"
    await db.update(users).set({ isActive: false }).where(eq(users.id, userId))

    // Remove group chat memberships
    const chatMemberships = await db.query.chatMembers.findMany({
      where: (member, { eq }) => eq(member.userId, userId),
      columns: {
        chatId: true,
      },
      with: {
        chat: {
          columns: {
            isGroupChat: true,
          },
        },
      },
    })

    const groupChatIds = chatMemberships
      .filter((membership) => membership.chat?.isGroupChat)
      .map((membership) => membership.chatId)

    await db
      .delete(chatMembers)
      .where(
        and(
          inArray(chatMembers.chatId, groupChatIds),
          eq(chatMembers.userId, userId)
        )
      )

    // Delete from Supabase auth
    await supabaseAdmin.deleteUser(userId)

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user',
    }
  }
}
