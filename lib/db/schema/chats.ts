import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  varchar,
  boolean,
  check,
} from 'drizzle-orm/pg-core'
import { user } from './auth'
import { sql, relations } from 'drizzle-orm'

export const chats = pgTable(
  'chats',
  {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    creatorId: text('creator_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    isGroupChat: boolean('is_group_chat').default(false),
    groupChatName: varchar('group_chat_name', { length: 255 }),
    lastMessageSentAt: timestamp('last_message_sent_at'),
    lastMessageContent: text('last_message_content'),
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
      .references(() => user.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.chatId, table.userId] })]
)

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  senderId: text('sender_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  imageUrls: text('image_urls').array(),
})

export const chatRelations = relations(chats, ({ many }) => ({
  members: many(chatMembers),
  messages: many(messages),
}))

export const chatMemberRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, { fields: [chatMembers.chatId], references: [chats.id] }),
  user: one(user, { fields: [chatMembers.userId], references: [user.id] }),
}))

export const messageRelations = relations(messages, ({ one }) => ({
  chat: one(chats, { fields: [messages.chatId], references: [chats.id] }),
  sender: one(user, { fields: [messages.senderId], references: [user.id] }),
}))
