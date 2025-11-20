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
