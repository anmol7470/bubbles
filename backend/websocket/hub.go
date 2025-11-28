package websocket

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/anmol7470/bubbles/backend/database"
	"github.com/google/uuid"
)

type Hub struct {
	Clients        map[*Client]bool
	Broadcast      chan []byte
	Register       chan *Client
	Unregister     chan *Client
	ChatRooms      map[string]map[*Client]bool
	dbService      *database.Service
	mu             sync.RWMutex
	readReceiptSem chan struct{}
}

func NewHub(dbService *database.Service) *Hub {
	return &Hub{
		Clients:        make(map[*Client]bool),
		Broadcast:      make(chan []byte),
		Register:       make(chan *Client),
		Unregister:     make(chan *Client),
		ChatRooms:      make(map[string]map[*Client]bool),
		dbService:      dbService,
		readReceiptSem: make(chan struct{}, 100),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.Clients[client] = true
			h.mu.Unlock()
			log.Printf("Client registered: user_id=%s, total_clients=%d", client.userID, len(h.Clients))

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client.send)

				for chatID, clients := range h.ChatRooms {
					delete(clients, client)
					if len(clients) == 0 {
						delete(h.ChatRooms, chatID)
					}
				}
			}
			h.mu.Unlock()
			log.Printf("Client unregistered: user_id=%s, total_clients=%d", client.userID, len(h.Clients))
		}
	}
}

func (h *Hub) ValidateMembership(userID, chatID string) bool {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		log.Printf("Invalid user ID: %s", userID)
		return false
	}

	chatUUID, err := uuid.Parse(chatID)
	if err != nil {
		log.Printf("Invalid chat ID: %s", chatID)
		return false
	}

	isMember, err := h.dbService.Queries.IsChatMember(context.Background(), database.IsChatMemberParams{
		ChatID: chatUUID,
		UserID: userUUID,
	})

	if err != nil {
		log.Printf("Error checking chat membership: %v", err)
		return false
	}

	return isMember
}

func (h *Hub) SubscribeToChat(client *Client, chatID string) bool {
	if !h.ValidateMembership(client.userID, chatID) {
		log.Printf("Unauthorized subscription attempt: user_id=%s, chat_id=%s", client.userID, chatID)
		return false
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	if h.ChatRooms[chatID] == nil {
		h.ChatRooms[chatID] = make(map[*Client]bool)
	}
	h.ChatRooms[chatID][client] = true

	log.Printf("Client subscribed to chat: user_id=%s, chat_id=%s, chat_members=%d",
		client.userID, chatID, len(h.ChatRooms[chatID]))
	return true
}

func (h *Hub) UnsubscribeFromChat(client *Client, chatID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if clients, ok := h.ChatRooms[chatID]; ok {
		delete(clients, client)
		if len(clients) == 0 {
			delete(h.ChatRooms, chatID)
		}
	}

	log.Printf("Client unsubscribed from chat: user_id=%s, chat_id=%s", client.userID, chatID)
}

func (h *Hub) BroadcastToChat(chatID string, message WSMessage) {
	h.BroadcastToChatExclude(chatID, message, "")
}

func (h *Hub) BroadcastToChatExclude(chatID string, message WSMessage, excludeUserID string) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	clients, ok := h.ChatRooms[chatID]
	if !ok {
		return
	}

	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	sentCount := 0
	for client := range clients {
		if excludeUserID != "" && client.userID == excludeUserID {
			continue
		}
		select {
		case client.send <- data:
			sentCount++
		default:
			log.Printf("Client send buffer full, skipping: user_id=%s", client.userID)
		}
	}

	log.Printf("Broadcast to chat: chat_id=%s, type=%s, sent_to=%d clients", chatID, message.Type, sentCount)
}

func (h *Hub) BroadcastTyping(chatID string, eventType EventType, payload TypingPayload) {
	message := WSMessage{
		Type:    eventType,
		Payload: payload,
	}

	h.BroadcastToChat(chatID, message)
}

func (h *Hub) HandleReadReceipt(userID, chatID, messageID string, messageCreatedAt time.Time) {
	if !h.ValidateMembership(userID, chatID) {
		log.Printf("Unauthorized read receipt attempt: user_id=%s, chat_id=%s", userID, chatID)
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		log.Printf("Invalid user ID for read receipt: %s", userID)
		return
	}

	chatUUID, err := uuid.Parse(chatID)
	if err != nil {
		log.Printf("Invalid chat ID for read receipt: %s", chatID)
		return
	}

	messageUUID, err := uuid.Parse(messageID)
	if err != nil {
		log.Printf("Invalid message ID for read receipt: %s", messageID)
		return
	}

	err = h.dbService.Queries.UpsertChatReadReceipt(context.Background(), database.UpsertChatReadReceiptParams{
		ChatID:            chatUUID,
		UserID:            userUUID,
		LastReadMessageID: messageUUID,
		LastReadAt:        messageCreatedAt,
	})
	if err != nil {
		log.Printf("Failed to upsert read receipt: %v", err)
		return
	}

	h.BroadcastToChatExclude(chatID, WSMessage{
		Type: EventMessageRead,
		Payload: MessageReadPayload{
			ChatID:            chatID,
			UserID:            userID,
			LastReadMessageID: messageID,
			LastReadAt:        messageCreatedAt,
		},
	}, userID)
}
