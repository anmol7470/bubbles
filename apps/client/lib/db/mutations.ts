'use server'

import { db } from '@/lib/db'
import { chatMembers, chats, messages } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

export async function createNewChat(
  userId: string,
  selectedUsers: string[],
  groupChatName?: string
) {
  // Check if a chat already exists with exactly these participants
  const existingChat = await db.query.chats.findFirst({
    where: (chat, { exists, and, eq, inArray }) =>
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
          .having(sql`count(*) = ${selectedUsers.length}`)
      ),
    with: {
      members: {
        columns: {},
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  })

  if (existingChat) {
    return { existing: true, chat: existingChat }
  }

  // Create new chat if no existing chat found
  const newChatId = crypto.randomUUID()

  await db.transaction(async (tx) => {
    await tx.insert(chats).values({
      id: newChatId,
      creatorId: userId,
      isGroupChat: selectedUsers.length > 2,
      ...(groupChatName && { groupChatName }),
    })

    // selectedUsers also includes the current user
    await tx.insert(chatMembers).values(
      selectedUsers.map((userId) => ({
        chatId: newChatId,
        userId,
      }))
    )
  })

  // Fetch the newly created chat with full data
  const newChat = await db.query.chats.findFirst({
    where: (chat, { eq }) => eq(chat.id, newChatId),
    with: {
      members: {
        columns: {},
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  })

  return { existing: false, chat: newChat }
}

export async function sendMessage(
  chatId: string,
  userId: string,
  content: string,
  imageUrls?: string[]
) {
  const messageId = crypto.randomUUID()
  let insertedMessage: typeof messages.$inferSelect

  await db.transaction(async (tx) => {
    const [message] = await tx
      .insert(messages)
      .values({
        id: messageId,
        chatId,
        senderId: userId,
        content,
        imageUrls,
      })
      .returning()

    insertedMessage = message

    await tx
      .update(chats)
      .set({
        lastMessageSentAt: message.sentAt,
        lastMessageContent: message.content,
      })
      .where(eq(chats.id, chatId))
  })

  const participants = await db.query.chatMembers.findMany({
    columns: {
      userId: true,
    },
    where: (chatMember, { eq }) => eq(chatMember.chatId, chatId),
  })

  return { message: insertedMessage!, participants }
}
