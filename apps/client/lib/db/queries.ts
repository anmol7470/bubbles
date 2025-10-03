'use server'

import { db } from '@/lib/db'
import { chatMembers } from '@/lib/db/schema'

export async function getAllChatsForUser(userId: string) {
  return await db.query.chats.findMany({
    // only get chats that the user is a participant of
    where: (chat, { exists, and, eq }) =>
      exists(
        db
          .select()
          .from(chatMembers)
          .where(
            and(eq(chatMembers.chatId, chat.id), eq(chatMembers.userId, userId))
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
      messages: {
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
            columns: {
              id: true,
              username: true,
            },
          },
          images: {
            columns: {
              id: true,
              imageUrl: true,
            },
          },
        },
      },
    },
    orderBy: (chat, { desc, sql }) => [
      desc(
        sql`(SELECT COALESCE(MAX(sent_at), ${chat.createdAt}) FROM messages WHERE chat_id = ${chat.id})`
      ),
    ],
  })
}

export async function searchUsers(
  query: string,
  userId: string,
  selectedUserIds: string[] = []
) {
  return await db.query.users.findMany({
    where: (user, { and, ilike, not, eq, notInArray }) =>
      and(
        ilike(user.username, `%${query.split(' ').join('%')}%`),
        not(eq(user.id, userId)),
        ...(selectedUserIds.length > 0
          ? [notInArray(user.id, selectedUserIds)]
          : [])
      ),
    columns: {
      id: true,
      username: true,
      imageUrl: true,
    },
    limit: 20,
  })
}

export async function getChatById(chatId: string, userId: string) {
  return await db.query.chats.findFirst({
    // check if the chat exists and the user is a member of the chat
    where: (chat, { eq, exists, and }) =>
      and(
        eq(chat.id, chatId),
        exists(
          db
            .select()
            .from(chatMembers)
            .where(
              and(
                eq(chatMembers.chatId, chat.id),
                eq(chatMembers.userId, userId)
              )
            )
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
      messages: {
        orderBy: (message, { asc }) => asc(message.sentAt),
        with: {
          sender: {
            columns: {
              id: true,
              username: true,
              imageUrl: true,
            },
          },
          images: {
            columns: {
              id: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  })
}
