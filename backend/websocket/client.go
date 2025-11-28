package websocket

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512 * 1024
)

type Client struct {
	hub      *Hub
	conn     *websocket.Conn
	send     chan []byte
	userID   string
	username string
	email    string
}

func NewClient(hub *Hub, conn *websocket.Conn, userID, username, email string) *Client {
	return &Client{
		hub:      hub,
		conn:     conn,
		send:     make(chan []byte, 256),
		userID:   userID,
		username: username,
		email:    email,
	}
}

func (c *Client) ReadPump() {
	defer func() {
		c.hub.Unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	c.conn.SetReadLimit(maxMessageSize)

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		var clientMsg ClientMessage
		if err := json.Unmarshal(message, &clientMsg); err != nil {
			log.Printf("Error unmarshaling client message: %v", err)
			continue
		}

		switch clientMsg.Type {
		case EventJoinChat:
			if !c.hub.SubscribeToChat(c, clientMsg.Payload.ChatID) {
				log.Printf("Failed to join chat: user_id=%s, chat_id=%s", c.userID, clientMsg.Payload.ChatID)
			}

		case EventLeaveChat:
			c.hub.UnsubscribeFromChat(c, clientMsg.Payload.ChatID)

		case EventTypingStart:
			if c.hub.ValidateMembership(c.userID, clientMsg.Payload.ChatID) {
				c.hub.BroadcastTyping(clientMsg.Payload.ChatID, EventTypingStart, TypingPayload{
					ChatID:          clientMsg.Payload.ChatID,
					UserID:          c.userID,
					Username:        c.username,
					ProfileImageURL: clientMsg.Payload.ProfileImageURL,
				})
			}

		case EventTypingStop:
			if c.hub.ValidateMembership(c.userID, clientMsg.Payload.ChatID) {
				c.hub.BroadcastTyping(clientMsg.Payload.ChatID, EventTypingStop, TypingPayload{
					ChatID:          clientMsg.Payload.ChatID,
					UserID:          c.userID,
					Username:        c.username,
					ProfileImageURL: clientMsg.Payload.ProfileImageURL,
				})
			}

		case EventMessageRead:
			if clientMsg.Payload.MessageID == "" || clientMsg.Payload.ChatID == "" || clientMsg.Payload.MessageCreatedAt == nil {
				log.Printf("Invalid read receipt payload from user_id=%s", c.userID)
				continue
			}

			select {
			case c.hub.readReceiptSem <- struct{}{}:
				go func(uid, cid, mid string, createdAt time.Time) {
					defer func() { <-c.hub.readReceiptSem }()
					c.hub.HandleReadReceipt(uid, cid, mid, createdAt)
				}(c.userID, clientMsg.Payload.ChatID, clientMsg.Payload.MessageID, *clientMsg.Payload.MessageCreatedAt)
			default:
				log.Printf("Read receipt queue full, dropping receipt: user_id=%s, chat_id=%s", c.userID, clientMsg.Payload.ChatID)
			}
		}
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
