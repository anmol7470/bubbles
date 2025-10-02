'use server'

import { db } from '@/lib/db'
import { chatMembers, chats, messages } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

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

export async function deleteMessage(messageId: string, chatId: string) {
  await db
    .update(messages)
    .set({ isDeleted: true })
    .where(eq(messages.id, messageId))
}
