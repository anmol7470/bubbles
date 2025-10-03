'use server'

import { db } from '@/lib/db'
import { chatMembers, chats, messages } from '@/lib/db/schema'
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
      imageUrls: true,
    },
    with: {
      sender: {
        columns: { id: true, username: true },
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
  await db.insert(messages).values({
    id: messageId,
    sentAt,
    chatId,
    senderId: userId,
    content,
    imageUrls,
  })
}

export async function deleteMessage(messageId: string) {
  const message = await db
    .update(messages)
    .set({ isDeleted: true })
    .where(eq(messages.id, messageId))
    .returning()

  const imageUrls = message[0].imageUrls
  if (imageUrls && imageUrls.length > 0) {
    await deleteImagesFromStorage(imageUrls)
  }
}

export async function editMessage(
  messageId: string,
  newContent: string,
  imageUrls: string[] | null,
  deletedImageUrls?: string[]
) {
  if (deletedImageUrls && deletedImageUrls.length > 0) {
    await deleteImagesFromStorage(deletedImageUrls)
  }

  await db
    .update(messages)
    .set({ content: newContent, isEdited: true, imageUrls })
    .where(eq(messages.id, messageId))
}

// Delete images from any bucket in Supabase storage using public URLs
async function deleteImagesFromStorage(imageUrls: string[]) {
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
