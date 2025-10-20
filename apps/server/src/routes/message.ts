import * as z from 'zod'
import { io } from '..'
import { messageImages, messages } from '../db/schema/chats'
import { protectedProcedure } from '../lib/orpc'

export const messageRouter = {
  sendMessage: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        content: z.string(),
        images: z.array(z.string()).optional(),
        chatMemberIds: z.array(z.string()),
      })
    )
    .handler(async ({ context, input }) => {
      const { db, user } = context
      const { chatId, content, images, chatMemberIds } = input

      const newMessage = {
        id: crypto.randomUUID(),
        chatId,
        senderId: user.id,
        content,
        images: images?.map((url) => ({
          id: crypto.randomUUID(),
          imageUrl: url,
        })),
      }

      // Emit socket message instantly before adding to db
      chatMemberIds.forEach((userId) => {
        io.to(`user:${userId}`).emit('newMessage', {
          message: {
            id: crypto.randomUUID(),
            chatId,
            senderId: user.id,
            content,
          },
        })
      })

      await db.transaction(async (tx) => {
        const [message] = await tx
          .insert(messages)
          .values({
            id: crypto.randomUUID(),
            chatId,
            senderId: user.id,
            content,
          })
          .returning()

        if (images && images.length > 0) {
          await tx.insert(messageImages).values(
            images.map((url) => ({
              id: crypto.randomUUID(),
              messageId: message.id,
              imageUrl: url,
            }))
          )
        }
      })
    }),
}
