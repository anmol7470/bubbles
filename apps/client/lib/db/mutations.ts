'use server'

import { db } from '@/lib/db'
import { chatMembers, chats, messages, messageImages } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createSupabaseClient } from '@/lib/supabase/server'

// Shared query configuration for fetching chats with full data
const chatWithFullData = {
  members: {
    columns: {},
    with: {
      user: {
        columns: { id: true, username: true, imageUrl: true },
      },
    },
  },
  messages: {
    orderBy: (message: any, { desc }: any) => desc(message.sentAt),
    limit: 1,
    columns: {
      id: true,
      content: true,
      sentAt: true,
      isDeleted: true,
      senderId: true,
    },
    with: {
      sender: {
        columns: { id: true, username: true },
      },
      images: {
        columns: { id: true, imageUrl: true },
      },
    },
  },
}

export async function createNewChat(
  userId: string,
  selectedUsers: string[],
  groupChatName?: string
) {
  const isGroupChat = selectedUsers.length > 2

  // Check for existing DM (group chats can have duplicates)
  if (!isGroupChat) {
    const existingChat = await db.query.chats.findFirst({
      where: (chat, { exists, and, eq, inArray, sql }) =>
        and(
          eq(chat.isGroupChat, false),
          exists(
            db
              .select({ count: sql<number>`count(*)` })
              .from(chatMembers)
              .where(
                and(
                  eq(chatMembers.chatId, chat.id),
                  inArray(chatMembers.userId, selectedUsers)
                )
              )
              .having(sql`count(*) = 2`)
          )
        ),
      with: chatWithFullData,
    })

    if (existingChat) {
      return { existing: true, chat: existingChat }
    }
  }

  // Create new chat
  const newChatId = crypto.randomUUID()

  await db.transaction(async (tx) => {
    await tx.insert(chats).values({
      id: newChatId,
      creatorId: userId,
      isGroupChat,
      ...(groupChatName && { groupChatName }),
    })

    await tx.insert(chatMembers).values(
      selectedUsers.map((userId) => ({
        chatId: newChatId,
        userId,
      }))
    )
  })

  // Fetch with full data
  const newChat = await db.query.chats.findFirst({
    where: (chat, { eq }) => eq(chat.id, newChatId),
    with: chatWithFullData,
  })

  return { existing: false, chat: newChat }
}

export async function sendMessage(
  messageId: string,
  sentAt: Date,
  chatId: string,
  userId: string,
  content: string,
  imageUrls?: string[]
) {
  await db.transaction(async (tx) => {
    await tx.insert(messages).values({
      id: messageId,
      sentAt,
      chatId,
      senderId: userId,
      content,
    })

    if (imageUrls && imageUrls.length > 0) {
      await tx.insert(messageImages).values(
        imageUrls.map((url) => ({
          id: crypto.randomUUID(),
          messageId,
          imageUrl: url,
        }))
      )
    }
  })
}

export async function deleteMessage(messageId: string) {
  await db.transaction(async (tx) => {
    // Get image URLs before deleting
    const images = await tx.query.messageImages.findMany({
      where: (img, { eq }) => eq(img.messageId, messageId),
      columns: { imageUrl: true },
    })

    // Mark message as deleted
    await tx
      .update(messages)
      .set({ isDeleted: true })
      .where(eq(messages.id, messageId))

    // Delete images from storage if any
    if (images.length > 0) {
      const imageUrls = images.map((img) => img.imageUrl)
      await deleteImagesFromStorage(imageUrls)
    }

    // Delete image records
    await tx.delete(messageImages).where(eq(messageImages.messageId, messageId))
  })
}

export async function editMessage(
  messageId: string,
  newContent: string,
  imageUrls: string[] | null,
  deletedImageUrls?: string[]
) {
  await db.transaction(async (tx) => {
    // Delete removed images from storage
    if (deletedImageUrls && deletedImageUrls.length > 0) {
      await deleteImagesFromStorage(deletedImageUrls)

      // Remove deleted image records from database
      const existingImages = await tx.query.messageImages.findMany({
        where: (img, { eq }) => eq(img.messageId, messageId),
        columns: { id: true, imageUrl: true },
      })

      const imageIdsToDelete = existingImages
        .filter((img) => deletedImageUrls.includes(img.imageUrl))
        .map((img) => img.id)

      for (const imageId of imageIdsToDelete) {
        await tx.delete(messageImages).where(eq(messageImages.id, imageId))
      }
    }

    // Update message content
    await tx
      .update(messages)
      .set({ content: newContent, isEdited: true })
      .where(eq(messages.id, messageId))

    // Handle new images (if imageUrls is provided and has new URLs)
    if (imageUrls && imageUrls.length > 0) {
      const existingImages = await tx.query.messageImages.findMany({
        where: (img, { eq }) => eq(img.messageId, messageId),
        columns: { imageUrl: true },
      })

      const existingUrls = existingImages.map((img) => img.imageUrl)
      const newUrls = imageUrls.filter((url) => !existingUrls.includes(url))

      if (newUrls.length > 0) {
        await tx.insert(messageImages).values(
          newUrls.map((url) => ({
            id: crypto.randomUUID(),
            messageId,
            imageUrl: url,
          }))
        )
      }
    }
  })
}

// Delete images from any bucket in Supabase storage using public URLs
export async function deleteImagesFromStorage(imageUrls: string[]) {
  const supabase = await createSupabaseClient()

  // Group file paths by bucket
  const bucketMap: Record<string, string[]> = {}

  for (const url of imageUrls) {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/object/public/')

    if (pathParts.length < 2) continue // skips invalid URLs

    const [bucketName, ...filePathParts] = pathParts[1].split('/')
    const filePath = filePathParts.join('/')

    if (!bucketMap[bucketName]) {
      bucketMap[bucketName] = []
    }

    bucketMap[bucketName].push(filePath)
  }

  // Delete from each bucket
  for (const [bucket, filePaths] of Object.entries(bucketMap)) {
    const { error } = await supabase.storage.from(bucket).remove(filePaths)

    if (error) {
      throw new Error(
        `Error deleting from bucket "${bucket}": ${error.message}`
      )
    }
  }
}
