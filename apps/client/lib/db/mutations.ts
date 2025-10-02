'use server'

import { db } from '@/lib/db'
import { chatMembers, chats, messages } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function createNewChat(
  userId: string,
  selectedUsers: string[],
  groupChatName?: string
) {
  const isGroupChat = selectedUsers.length > 2

  // Only check for existing DMs (not group chats)
  // Group chats can have duplicates with the same participants
  let existingChat = null
  if (!isGroupChat) {
    existingChat = await db.query.chats.findFirst({
      where: (chat, { exists, and, eq, inArray, sql }) =>
        and(
          eq(chat.isGroupChat, false),
          // Check that both users are members of this chat
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
  }

  // Create new chat if no existing chat found
  const newChatId = crypto.randomUUID()

  await db.transaction(async (tx) => {
    await tx.insert(chats).values({
      id: newChatId,
      creatorId: userId,
      isGroupChat,
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
  messageId: string,
  sentAt: Date,
  chatId: string,
  userId: string,
  content: string,
  imageUrls?: string[]
) {
  await db.transaction(async (tx) => {
    const [message] = await tx
      .insert(messages)
      .values({
        id: messageId,
        sentAt,
        chatId,
        senderId: userId,
        content,
        imageUrls,
      })
      .returning()

    await tx
      .update(chats)
      .set({
        lastMessageSentAt: message.sentAt,
        lastMessageContent: message.content,
      })
      .where(eq(chats.id, chatId))
  })
}
