import { eq, inArray } from 'drizzle-orm'
import * as z from 'zod'
import { io } from '..'
import { messageImages, messages } from '../db/schema/chats'
import { protectedProcedure, ServerOutputs } from '../lib/orpc'
import { deleteImages } from '../lib/uploadthing'

type Message = ServerOutputs['chat']['getChatMessages']['items'][number]

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

      const messageId = crypto.randomUUID()
      const messageImagesData: Array<{ id: string; imageUrl: string }> = (images ?? []).map((url) => ({
        id: crypto.randomUUID(),
        imageUrl: url,
      }))

      const newMessage = {
        id: messageId,
        chatId,
        senderId: user.id,
        content,
        sentAt: new Date(),
        isDeleted: false,
        isEdited: false,
        sender: {
          id: user.id,
          username: user.username ?? null,
          image: user.image ?? null,
        },
        images: messageImagesData,
      } satisfies Message

      chatMemberIds.forEach((memberId) => {
        io.to(`user:${memberId}`).emit('message:sent', {
          newMessage,
          chatMemberIds,
        })
      })

      const [message] = await db
        .insert(messages)
        .values({
          id: messageId,
          chatId,
          senderId: user.id,
          content,
        })
        .returning()

      if (messageImagesData.length > 0) {
        await db.insert(messageImages).values(messageImagesData.map((img) => ({ ...img, messageId })))
      }

      return message
    }),

  editMessage: protectedProcedure
    .input(
      z.object({
        messageMeta: z.object({
          id: z.string(),
          chatId: z.string(),
          sentAt: z.date(),
        }),
        chatMemberIds: z.array(z.string()),
        content: z.string(),
        images: z.array(z.object({ id: z.string(), imageUrl: z.string() })).optional(),
        removedImageUrls: z.array(z.string()).optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const { db, user } = context
      const { messageMeta, chatMemberIds, content, images, removedImageUrls } = input

      let updatedImages: Array<{ id: string; imageUrl: string }> = images ?? []

      if (images && removedImageUrls) {
        updatedImages = images.filter((img) => !removedImageUrls.includes(img.imageUrl))
      }

      const editedMessage = {
        id: messageMeta.id,
        chatId: messageMeta.chatId,
        senderId: user.id,
        content,
        sentAt: messageMeta.sentAt,
        isDeleted: false,
        isEdited: true,
        sender: {
          id: user.id,
          username: user.username ?? null,
          image: user.image ?? null,
        },
        images: updatedImages,
      } satisfies Message

      chatMemberIds.forEach((memberId) => {
        io.to(`user:${memberId}`).emit('message:edited', {
          editedMessage,
          chatMemberIds,
        })
      })

      await db.update(messages).set({ content, isEdited: true }).where(eq(messages.id, messageMeta.id))

      // Delete the removed images from uploadthing and database
      if (removedImageUrls && removedImageUrls.length > 0) {
        await db.delete(messageImages).where(inArray(messageImages.id, removedImageUrls))
        await deleteImages(removedImageUrls)
      }
    }),

  deleteMessage: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        messageId: z.string(),
        chatMemberIds: z.array(z.string()),
      })
    )
    .handler(async ({ context, input }) => {
      const { db } = context
      const { chatId, messageId, chatMemberIds } = input

      chatMemberIds.forEach((memberId) => {
        io.to(`user:${memberId}`).emit('message:deleted', {
          messageId,
          chatId,
          chatMemberIds,
        })
      })

      await db.update(messages).set({ isDeleted: true, content: '' }).where(eq(messages.id, messageId))

      const deletedImages = await db.delete(messageImages).where(eq(messageImages.messageId, messageId)).returning()
      await deleteImages(deletedImages.map((img) => img.imageUrl))
    }),
}
