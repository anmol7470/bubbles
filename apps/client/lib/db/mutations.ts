'use server'

import { db } from '@/lib/db'
import { chatMembers, chats, messages, messageImages } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { createSupabaseClient } from '@/lib/supabase/server'

// Shared query configuration for fetching chats with full data
const chatWithFullData = {
  members: {
    // @ts-expect-error - not typed
    where: (member, { isNull }) => isNull(member.leftAt), // Only show active members
    columns: {},
    with: {
      user: {
        columns: { id: true, username: true, imageUrl: true, isActive: true },
      },
    },
  },
  messages: {
    // @ts-expect-error - not typed
    orderBy: (message, { desc }) => desc(message.sentAt),
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
        columns: { id: true, username: true, isActive: true },
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
        id: crypto.randomUUID(),
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
    const chatMemberRows = await tx.query.chatMembers.findMany({
      where: (member, { eq }) => eq(member.chatId, chatId),
      columns: {
        userId: true,
        isDeleted: true,
      },
    })

    const memberCount = chatMemberRows.length

    // Un-delete the chat if other user deleted the chat because the chat recieved a message
    if (memberCount === 2) {
      const otherMember = chatMemberRows.find(
        (member) => member.userId !== userId && member.userId !== null
      )

      if (otherMember && otherMember.userId && otherMember.isDeleted) {
        await tx
          .update(chatMembers)
          .set({
            isDeleted: false,
          })
          .where(
            and(
              eq(chatMembers.chatId, chatId),
              eq(chatMembers.userId, otherMember.userId)
            )
          )
      }
    }

    const otherMembers = chatMemberRows.filter(
      (member) => member.userId !== userId && member.userId !== null
    )

    // Un-clear the chat for all members once a new message is sent
    if (otherMembers.length > 0) {
      const otherMemberIds = otherMembers
        .map((member) => member.userId)
        .filter((id): id is string => id !== null)

      if (otherMemberIds.length > 0) {
        await tx
          .update(chatMembers)
          .set({
            isCleared: false,
          })
          .where(inArray(chatMembers.userId, otherMemberIds))
      }
    }

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

export async function makeMemberAdmin(chatId: string, userId: string) {
  await db.update(chats).set({ creatorId: userId }).where(eq(chats.id, chatId))
}

// Mark user as left from group chat (preserves messages, anonymizes user)
// Also used by admin to remove a member from a group chat
export async function exitGroupChat(chatId: string, userId: string) {
  await db
    .update(chatMembers)
    .set({ leftAt: new Date() })
    .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)))
}

export async function deleteGroupChat(chatId: string) {
  await db.delete(chats).where(eq(chats.id, chatId))
}

// Remove all messages from the chat for current user, but keep the chat in their chats list
// Other users will still see messages in the chat
export async function clearChat(chatId: string, userId: string) {
  await db
    .update(chatMembers)
    .set({ isCleared: true, clearedAt: new Date() })
    .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)))
}

// Remove the chat from the chats list of the user
// Keep the messages
// If user starts the chat again, chat will be undeleted
// If both users delete the chat, the chat will be deleted from the db
export async function deleteChat(chatId: string, userId: string) {
  await db.transaction(async (tx) => {
    await tx
      .update(chatMembers)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(
        and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId))
      )

    const allMembers = await tx.query.chatMembers.findMany({
      where: (member, { eq }) => eq(member.chatId, chatId),
      columns: {
        userId: true,
        isDeleted: true,
      },
    })

    const allDeleted = allMembers.every((member) => member.isDeleted)

    // Also delete the chat if the other member is not active
    const isOtherMemberActive = allMembers.find(
      (member) => member.userId !== userId && member.userId !== null
    )?.isDeleted

    if (allDeleted || !isOtherMemberActive) {
      await tx.delete(chats).where(eq(chats.id, chatId))
    }
  })
}

export async function clearAllChats(userId: string) {
  await db
    .update(chatMembers)
    .set({ isCleared: true, clearedAt: new Date() })
    .where(eq(chatMembers.userId, userId))
}

export async function deleteAllChats(userId: string) {
  await db
    .update(chatMembers)
    .set({ isDeleted: true, deletedAt: new Date() })
    .where(eq(chatMembers.userId, userId))
}

export async function updateGroupChatName(chatId: string, newName: string) {
  await db
    .update(chats)
    .set({ groupChatName: newName })
    .where(eq(chats.id, chatId))
}

export async function updateGroupChatImage(
  chatId: string,
  newImageUrl: string
) {
  await db
    .update(chats)
    .set({ groupChatImageUrl: newImageUrl })
    .where(eq(chats.id, chatId))
}

// This won't work because of rls policy preventing any body else to delete image other than the user who uploaded it
// So images uploaded by other users will not be deleted when the chat is deleted by the current user

// async function deleteAllImagesFromChat(chatId: string) {
//   const messageIds = await db.query.messages.findMany({
//     where: (msg, { eq }) => eq(msg.chatId, chatId),
//     columns: { id: true },
//   })

//   const imageUrls = await db
//     .delete(messageImages)
//     .where(
//       inArray(
//         messageImages.messageId,
//         messageIds.map((msg) => msg.id)
//       )
//     )
//     .returning({ imageUrl: messageImages.imageUrl })

//   if (imageUrls.length > 0) {
//     await deleteImagesFromStorage(imageUrls.map((img) => img.imageUrl))
//   }
// }
