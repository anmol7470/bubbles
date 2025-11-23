package models

import (
	"time"

	"github.com/google/uuid"
)

type SearchUsersRequest struct {
	Query           string      `json:"query" binding:"required"`
	SelectedUserIds []uuid.UUID `json:"selected_user_ids"`
}

type SearchUsersResponse struct {
	ID       uuid.UUID `json:"id"`
	Username string    `json:"username"`
	Email    string    `json:"email"`
}

type CreateChatRequest struct {
	MemberIds []uuid.UUID `json:"member_ids" binding:"required,min=2"`
	GroupName string      `json:"group_name"`
}

type CreateChatResponse struct {
	ChatID   uuid.UUID `json:"chat_id"`
	Existing bool      `json:"existing"`
}

type ChatMember struct {
	ID       uuid.UUID `json:"id"`
	Username string    `json:"username"`
	Email    string    `json:"email"`
}

type MessageSender struct {
	ID       uuid.UUID `json:"id"`
	Username string    `json:"username"`
}

type LastMessage struct {
	ID        uuid.UUID      `json:"id"`
	Content   *string        `json:"content,omitempty"`
	Sender    *MessageSender `json:"sender,omitempty"`
	IsDeleted bool           `json:"is_deleted"`
	Images    []string       `json:"images"`
	CreatedAt time.Time      `json:"created_at"`
}

type ChatInfo struct {
	ID          uuid.UUID    `json:"id"`
	Name        *string      `json:"name,omitempty"`
	IsGroup     bool         `json:"is_group"`
	Members     []ChatMember `json:"members"`
	LastMessage *LastMessage `json:"last_message,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

type GetChatsResponse struct {
	Chats []ChatInfo `json:"chats"`
}

type Message struct {
	ID             uuid.UUID       `json:"id"`
	Content        *string         `json:"content,omitempty"`
	SenderID       uuid.UUID       `json:"sender_id"`
	SenderUsername string          `json:"sender_username"`
	IsDeleted      bool            `json:"is_deleted"`
	IsEdited       bool            `json:"is_edited"`
	Images         []string        `json:"images"`
	CreatedAt      time.Time       `json:"created_at"`
	ReplyTo        *ReplyToMessage `json:"reply_to,omitempty"`
}

type ReplyToMessage struct {
	ID             uuid.UUID `json:"id"`
	SenderID       uuid.UUID `json:"sender_id"`
	SenderUsername string    `json:"sender_username"`
	Content        *string   `json:"content,omitempty"`
	Images         []string  `json:"images"`
	IsDeleted      bool      `json:"is_deleted"`
}

type GetChatByIdResponse struct {
	ID        uuid.UUID    `json:"id"`
	Name      *string      `json:"name,omitempty"`
	IsGroup   bool         `json:"is_group"`
	Members   []ChatMember `json:"members"`
	CreatedAt time.Time    `json:"created_at"`
	UpdatedAt time.Time    `json:"updated_at"`
}

type GetChatMessagesRequest struct {
	ChatID string `json:"chat_id" binding:"required"`
	Limit  int    `json:"limit"`
	Cursor *struct {
		SentAt time.Time `json:"sent_at"`
		ID     uuid.UUID `json:"id"`
	} `json:"cursor,omitempty"`
}

type GetChatMessagesResponse struct {
	Items      []Message `json:"items"`
	NextCursor *struct {
		SentAt time.Time `json:"sent_at"`
		ID     uuid.UUID `json:"id"`
	} `json:"next_cursor,omitempty"`
}

type SendMessageRequest struct {
	ChatID           string   `json:"chat_id" binding:"required"`
	Content          string   `json:"content"`
	Images           []string `json:"images,omitempty"`
	ReplyToMessageID *string  `json:"reply_to_message_id"`
}

type EditMessageRequest struct {
	MessageID     string   `json:"message_id" binding:"required"`
	Content       string   `json:"content"`
	RemovedImages []string `json:"removed_images,omitempty"`
}

type DeleteMessageRequest struct {
	MessageID string `json:"message_id" binding:"required"`
}
