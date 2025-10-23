import { relations, sql } from 'drizzle-orm'
import { boolean, check, index, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core'
import { user } from './auth'

export const chatType = pgEnum('chat_type', ['chat', 'groupchat'])

export const chats = pgTable(
  'chats',
  {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    creatorId: text('creator_id').references(() => user.id, {
      onDelete: 'cascade',
    }),
    type: chatType('type').notNull().default('chat'),
    name: varchar('name', { length: 20 }),
  },
  // enforce that if the chat is a group chat, the name is not null
  (table) => [check('is_group_chat', sql`${table.type} = 'chat' OR ${table.name} IS NOT NULL`)]
)

export const chatMembers = pgTable(
  'chat_members',
  {
    id: text('id').primaryKey(),
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, {
      onDelete: 'cascade',
    }),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    lastReadAt: timestamp('last_read_at').defaultNow().notNull(),
    isActive: boolean('is_active').default(true).notNull(),
  },
  (table) => [
    index('chat_members_chat_id_idx').on(table.chatId),
    index('chat_members_user_id_idx').on(table.userId),
    uniqueIndex('chat_members_chat_id_user_id_unique').on(table.chatId, table.userId),
  ]
)

export const messages = pgTable(
  'messages',
  {
    id: text('id').primaryKey(),
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    senderId: text('sender_id').references(() => user.id, {
      onDelete: 'cascade',
    }),
    content: text('content').default('').notNull(),
    sentAt: timestamp('sent_at').defaultNow().notNull(),
    isDeleted: boolean('is_deleted').default(false),
    isEdited: boolean('is_edited').default(false),
  },
  (table) => [
    index('messages_chat_id_sent_at_idx').on(table.chatId, table.sentAt.desc(), table.id.desc()),
    index('messages_sender_id_idx').on(table.senderId),
  ]
)

export const messageImages = pgTable(
  'message_images',
  {
    id: text('id').primaryKey(),
    messageId: text('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    imageUrl: text('image_url').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('message_images_message_id_idx').on(table.messageId)]
)

export const chatRelations = relations(chats, ({ many }) => ({
  members: many(chatMembers),
  messages: many(messages),
}))

export const chatMemberRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, { fields: [chatMembers.chatId], references: [chats.id] }),
  user: one(user, { fields: [chatMembers.userId], references: [user.id] }),
}))

export const messageRelations = relations(messages, ({ one, many }) => ({
  chat: one(chats, { fields: [messages.chatId], references: [chats.id] }),
  sender: one(user, { fields: [messages.senderId], references: [user.id] }),
  images: many(messageImages),
}))

export const messageImageRelations = relations(messageImages, ({ one }) => ({
  message: one(messages, {
    fields: [messageImages.messageId],
    references: [messages.id],
  }),
}))
