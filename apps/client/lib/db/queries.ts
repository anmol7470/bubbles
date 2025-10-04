'use server'

import { db } from '@/lib/db'
import { chatMembers } from '@/lib/db/schema'

export async function getAllChatsForUser(userId: string) {
  return await db.query.chats.findMany({
    // only get chats that the user is a participant of
    where: (chat, { exists, and, eq, isNull }) =>
      exists(
        db
          .select()
          .from(chatMembers)
          .where(
            and(
              eq(chatMembers.chatId, chat.id),
              eq(chatMembers.userId, userId),
              eq(chatMembers.isDeleted, false),
              isNull(chatMembers.leftAt) // User hasn't left the chat
            )
          )
      ),
    with: {
      members: {
        where: (member, { isNull }) => isNull(member.leftAt), // Only show active members
        columns: {},
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              imageUrl: true,
              isActive: true,
            },
          },
        },
      },
      // get the last message sent in the chat
      messages: {
        orderBy: (message, { desc }) => desc(message.sentAt),
        limit: 1,
        where: (message, { gte, exists, and, eq, sql }) =>
          exists(
            db
              .select()
              .from(chatMembers)
              .where(
                and(
                  eq(chatMembers.chatId, message.chatId),
                  eq(chatMembers.userId, userId),
                  eq(chatMembers.isCleared, false),
                  gte(
                    message.sentAt,
                    sql`COALESCE(GREATEST(${chatMembers.clearedAt}, ${chatMembers.deletedAt}), ${chatMembers.joinedAt})`
                  )
                )
              )
          ),
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
              isActive: true,
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
        eq(user.isActive, true), // Only show active users in search
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
    where: (chat, { eq, exists, and, isNull }) =>
      and(
        eq(chat.id, chatId),
        exists(
          db
            .select()
            .from(chatMembers)
            .where(
              and(
                eq(chatMembers.chatId, chat.id),
                eq(chatMembers.userId, userId),
                eq(chatMembers.isDeleted, false),
                isNull(chatMembers.leftAt) // User hasn't left the chat
              )
            )
        )
      ),
    with: {
      members: {
        where: (member, { isNull }) => isNull(member.leftAt), // Only show active members
        columns: {},
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              imageUrl: true,
              isActive: true,
            },
          },
        },
      },
      messages: {
        orderBy: (message, { asc }) => asc(message.sentAt),
        where: (message, { gte, exists, and, eq, sql }) =>
          exists(
            db
              .select()
              .from(chatMembers)
              .where(
                and(
                  eq(chatMembers.chatId, message.chatId),
                  eq(chatMembers.userId, userId),
                  eq(chatMembers.isCleared, false),
                  gte(
                    message.sentAt,
                    sql`COALESCE(GREATEST(${chatMembers.clearedAt}, ${chatMembers.deletedAt}), ${chatMembers.joinedAt})`
                  )
                )
              )
          ),
        with: {
          sender: {
            columns: {
              id: true,
              username: true,
              imageUrl: true,
              isActive: true,
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
