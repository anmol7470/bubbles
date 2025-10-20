import * as z from 'zod'
import { chatMembers, chats } from '../db/schema/chats'
import { protectedProcedure } from '../lib/orpc'

export const chatRouter = {
  getAllChats: protectedProcedure.handler(async ({ context }) => {
    const { db, user } = context

    return await context.db.query.chats.findMany({
      // only get chats that the user is a participant of
      where: (chat, { exists, and, eq }) =>
        exists(
          db
            .select()
            .from(chatMembers)
            .where(and(eq(chatMembers.chatId, chat.id), eq(chatMembers.userId, user.id)))
        ),
      with: {
        members: {
          columns: {},
          with: {
            user: {
              columns: {
                id: true,
                username: true,
                image: true,
              },
            },
          },
        },
        messages: {
          orderBy: (messages, { desc }) => [desc(messages.sentAt)],
          limit: 1,
          columns: {
            id: true,
            sentAt: true,
            content: true,
            isDeleted: true,
          },
          with: {
            // sender info to say who sent the last message
            sender: {
              columns: {
                id: true,
                username: true,
                image: true,
              },
            },
            // get images too to display if last message is an image
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
  }),

  searchUsers: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        selectedUserIds: z.array(z.string()),
      })
    )
    .handler(async ({ context, input }) => {
      const { db, user: currentUser } = context
      const { query, selectedUserIds } = input

      const normalizedQuery = query.toLowerCase().trim().split(' ').join('%')

      return await db.query.user.findMany({
        where: (user, { and, ilike, not, eq, notInArray }) =>
          and(
            ilike(user.username, `%${normalizedQuery}%`),
            not(eq(user.id, currentUser.id)),
            ...(selectedUserIds.length > 0 ? [notInArray(user.id, selectedUserIds)] : [])
          ),
        columns: {
          id: true,
          username: true,
          image: true,
        },
        limit: 20,
      })
    }),

  createChat: protectedProcedure
    .input(
      z.object({
        memberIds: z.array(z.string()),
        groupName: z.string().optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const { db, user } = context
      const { memberIds, groupName } = input

      const isGroupChat = memberIds.length > 2

      // Check for existing DM (group chats can have duplicates)
      if (!isGroupChat) {
        const existingChat = await db.query.chats.findFirst({
          where: (chat, { exists, and, eq, inArray, sql }) =>
            and(
              eq(chat.type, 'chat'),
              exists(
                db
                  .select({ count: sql<number>`count(*)` })
                  .from(chatMembers)
                  .where(and(eq(chatMembers.chatId, chat.id), inArray(chatMembers.userId, memberIds)))
                  .having(sql`count(*) = 2`)
              )
            ),
        })

        if (existingChat) {
          return { existing: true, chatId: existingChat.id, fullChat: undefined }
        }
      }

      // Create new chat
      if (isGroupChat && !groupName) {
        throw new Error('Group name is required for group chats')
      }

      const chatId = crypto.randomUUID()

      await db.transaction(async (tx) => {
        await tx.insert(chats).values({
          id: chatId,
          creatorId: user.id,
          type: isGroupChat ? 'groupchat' : 'chat',
          name: isGroupChat ? groupName?.trim() : null,
        })

        // Insert members
        await tx
          .insert(chatMembers)
          .values(memberIds.map((memberId) => ({ id: crypto.randomUUID(), chatId, userId: memberId })))
      })

      // Return the newly created chat in the same shape as list items
      const newChat = await db.query.chats.findFirst({
        where: (chat, { eq }) => eq(chat.id, chatId),
        with: {
          members: {
            columns: {},
            with: {
              user: {
                columns: {
                  id: true,
                  username: true,
                  image: true,
                },
              },
            },
          },
          messages: {
            orderBy: (messages, { desc }) => [desc(messages.sentAt)],
            limit: 1,
            columns: {
              id: true,
              sentAt: true,
              content: true,
              isDeleted: true,
            },
            with: {
              sender: {
                columns: {
                  id: true,
                  username: true,
                  image: true,
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

      return { existing: false, chatId: chatId, fullChat: newChat }
    }),

  getChatById: protectedProcedure.input(z.object({ chatId: z.string() })).handler(async ({ context, input }) => {
    const { db, user } = context
    const { chatId } = input

    return await db.query.chats.findFirst({
      // check if the chat exists and the user is a member of the chat
      where: (chat, { eq, exists, and, isNull }) =>
        and(
          eq(chat.id, chatId),
          exists(
            db
              .select()
              .from(chatMembers)
              .where(and(eq(chatMembers.chatId, chat.id), eq(chatMembers.userId, user.id)))
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
                image: true,
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
                image: true,
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
  }),
}
