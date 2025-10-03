import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  varchar,
  boolean,
  check,
  index,
} from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'

// minimal copy of Supabase auth table
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull(),
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('users_username_idx').on(table.username)]
)

export const chats = pgTable(
  'chats',
  {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    creatorId: text('creator_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    isGroupChat: boolean('is_group_chat').default(false),
    groupChatName: varchar('group_chat_name', { length: 255 }),
  },
  (table) => [
    check(
      'is_group_chat',
      sql`${table.isGroupChat} = false OR ${table.groupChatName} IS NOT NULL`
    ),
  ]
)

export const chatMembers = pgTable(
  'chat_members',
  {
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.chatId, table.userId] })]
)

export const messages = pgTable(
  'messages',
  {
    id: text('id').primaryKey(),
    chatId: text('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    senderId: text('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').default('').notNull(),
    sentAt: timestamp('sent_at').defaultNow().notNull(),
    isDeleted: boolean('is_deleted').default(false),
    isEdited: boolean('is_edited').default(false),
  },
  (table) => [
    index('messages_chat_id_sent_at_idx').on(table.chatId, table.sentAt.desc()),
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
  user: one(users, { fields: [chatMembers.userId], references: [users.id] }),
}))

export const messageRelations = relations(messages, ({ one, many }) => ({
  chat: one(chats, { fields: [messages.chatId], references: [chats.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
  images: many(messageImages),
}))

export const messageImageRelations = relations(messageImages, ({ one }) => ({
  message: one(messages, {
    fields: [messageImages.messageId],
    references: [messages.id],
  }),
}))
