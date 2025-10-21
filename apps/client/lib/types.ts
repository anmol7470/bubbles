import type { Outputs } from './orpc'

export type Chats = Outputs['chat']['getAllChats']
export type Chat = Outputs['chat']['getAllChats'][number]
export type MessagesPage = Outputs['chat']['getChatMessages']
export type Messages = Outputs['chat']['getChatMessages']['items']
export type Message = Outputs['chat']['getChatMessages']['items'][number]

export type MessageSentEventData = {
  newMessage: Message
  chatMemberIds: string[]
}

export type MessageEditedEventData = {
  editedMessage: Message
  chatMemberIds: string[]
}

export type MessageDeletedEventData = {
  messageId: string
  chatId: string
  chatMemberIds: string[]
}

export type TypingEventData = {
  chatId: string
  userId: string
  username: string
  chatMemberIds: string[]
}

export type StopTypingEventData = {
  chatId: string
  userId: string
  chatMemberIds: string[]
}
