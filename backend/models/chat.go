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
