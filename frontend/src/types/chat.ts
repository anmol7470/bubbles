export type ChatUser = {
  id: string
  username: string
  email: string
}

export type ChatMember = {
  id: string
  username: string
  email: string
}

export type MessageSender = {
  id: string
  username: string
}

export type LastMessage = {
  id: string
  content?: string
  sender?: MessageSender
  is_deleted: boolean
  images: string[]
  created_at: string
}

export type SearchUsersRequest = {
  query: string
  selected_user_ids: string[]
}

export type CreateChatRequest = {
  member_ids: string[]
  group_name?: string
}

export type CreateChatResponse = {
  chat_id: string
  existing: boolean
}

export type ChatInfo = {
  id: string
  name?: string
  is_group: boolean
  members: ChatMember[]
  last_message?: LastMessage
  created_at: string
  updated_at: string
}

export type GetChatsResponse = {
  chats: ChatInfo[]
}

export type Message = {
  id: string
  content?: string
  sender_id: string
  sender_username: string
  is_deleted: boolean
  is_edited: boolean
  images: string[]
  created_at: string
  reply_to?: ReplyToMessage
}

export type ReplyToMessage = {
  id: string
  sender_id: string
  sender_username: string
  content?: string
  images: string[]
  is_deleted: boolean
}

export type GetChatByIdResponse = {
  id: string
  name?: string
  is_group: boolean
  members: ChatMember[]
  created_at: string
  updated_at: string
}

export type GetChatMessagesRequest = {
  chat_id: string
  limit: number
  cursor?: {
    sent_at: string
    id: string
  }
}

export type GetChatMessagesResponse = {
  items: Message[]
  next_cursor?: {
    sent_at: string
    id: string
  }
}

export type SendMessageRequest = {
  chat_id: string
  content: string
  images?: string[]
  reply_to_message_id?: string
}

export type EditMessageRequest = {
  message_id: string
  content: string
  removed_images?: string[]
}

export type DeleteMessageRequest = {
  message_id: string
}
