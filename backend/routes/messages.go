package routes

import (
	"database/sql"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/anmol7470/bubbles/backend/constants"
	"github.com/anmol7470/bubbles/backend/database"
	"github.com/anmol7470/bubbles/backend/models"
)

type MessageHandler struct {
	dbService *database.Service
}

func NewMessageHandler(dbService *database.Service) *MessageHandler {
	return &MessageHandler{
		dbService: dbService,
	}
}

func (h *MessageHandler) GetChatMessages(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error: "User ID not found in context",
		})
		return
	}

	var req models.GetChatMessagesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: err.Error(),
		})
		return
	}

	chatID, err := uuid.Parse(req.ChatID)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Invalid chat ID",
		})
		return
	}

	// Verify user is member of chat
	isMember, err := h.dbService.Queries.IsChatMember(c.Request.Context(), database.IsChatMemberParams{
		ChatID: chatID,
		UserID: userID.(uuid.UUID),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to verify chat membership",
		})
		return
	}

	if !isMember {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error: "You are not a member of this chat",
		})
		return
	}

	// Set default limit
	limit := req.Limit
	if limit <= 0 {
		limit = constants.DefaultMessagesPerPage
	} else if limit > constants.MaxMessagesPerPage {
		limit = constants.MaxMessagesPerPage
	}

	// Get messages with cursor-based pagination
	var cursorTime sql.NullTime
	var cursorID uuid.NullUUID

	if req.Cursor != nil {
		cursorTime = sql.NullTime{Time: req.Cursor.SentAt, Valid: true}
		cursorID = uuid.NullUUID{UUID: req.Cursor.ID, Valid: true}
	}

	messagesData, err := h.dbService.Queries.GetMessagesByChatPaginated(c.Request.Context(), database.GetMessagesByChatPaginatedParams{
		ChatID:     chatID,
		Limit:      int32(limit + 1), // Fetch one extra to check if there are more
		CursorTime: cursorTime,
		CursorID:   cursorID,
	})

	if err != nil && err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to get messages",
		})
		return
	}

	// Check if there are more messages
	hasMore := len(messagesData) > limit
	filteredMessages := messagesData
	if hasMore {
		filteredMessages = messagesData[:limit]
	}

	// Collect message IDs for images
	messageIDs := make([]uuid.UUID, 0, len(filteredMessages))
	for _, msg := range filteredMessages {
		messageIDs = append(messageIDs, msg.ID)
	}

	// Get images for messages
	var imagesData []database.Image
	if len(messageIDs) > 0 {
		imagesData, err = h.dbService.Queries.GetMessageImages(c.Request.Context(), messageIDs)
		if err != nil && err != sql.ErrNoRows {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error: "Failed to get message images",
			})
			return
		}
	}

	// Group images by message ID
	imagesByMessage := make(map[uuid.UUID][]string)
	for _, img := range imagesData {
		imagesByMessage[img.MessageID] = append(imagesByMessage[img.MessageID], img.Url)
	}

	// Build messages response
	messages := make([]models.Message, len(filteredMessages))
	for i, msg := range filteredMessages {
		var content *string
		if msg.Content.Valid {
			content = &msg.Content.String
		}

		images := imagesByMessage[msg.ID]
		if images == nil {
			images = []string{}
		}

		messages[i] = models.Message{
			ID:             msg.ID,
			Content:        content,
			SenderID:       msg.SenderID,
			SenderUsername: msg.SenderUsername,
			IsDeleted:      msg.IsDeleted,
			IsEdited:       msg.IsEdited,
			Images:         images,
			CreatedAt:      msg.CreatedAt,
		}
	}

	// Build response
	response := models.GetChatMessagesResponse{
		Items: messages,
	}

	if hasMore && len(messages) > 0 {
		lastMsg := messages[len(messages)-1]
		response.NextCursor = &struct {
			SentAt time.Time `json:"sent_at"`
			ID     uuid.UUID `json:"id"`
		}{
			SentAt: lastMsg.CreatedAt,
			ID:     lastMsg.ID,
		}
	}

	c.JSON(http.StatusOK, response)
}

func (h *MessageHandler) SendMessage(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error: "User ID not found in context",
		})
		return
	}

	var req models.SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: err.Error(),
		})
		return
	}

	// Validate input
	req.Content = strings.TrimSpace(req.Content)

	if len(req.Content) > constants.MaxMessageLength {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Message content exceeds maximum length of 5000 characters",
		})
		return
	}

	if len(req.Images) > constants.MaxImagesPerMessage {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Maximum 5 images allowed per message",
		})
		return
	}

	chatID, err := uuid.Parse(req.ChatID)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Invalid chat ID",
		})
		return
	}

	// Verify user is member of chat
	isMember, err := h.dbService.Queries.IsChatMember(c.Request.Context(), database.IsChatMemberParams{
		ChatID: chatID,
		UserID: userID.(uuid.UUID),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to verify chat membership",
		})
		return
	}

	if !isMember {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error: "You are not a member of this chat",
		})
		return
	}

	// Validate that message has content or images
	if req.Content == "" && len(req.Images) == 0 {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Message must have content or images",
		})
		return
	}

	// Use transaction to ensure message creation and image addition are atomic
	tx, err := h.dbService.DB.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to begin transaction",
		})
		return
	}
	defer tx.Rollback()

	qtx := h.dbService.Queries.WithTx(tx)

	// Create message
	var content sql.NullString
	if req.Content != "" {
		content = sql.NullString{String: req.Content, Valid: true}
	}

	message, err := qtx.CreateMessage(c.Request.Context(), database.CreateMessageParams{
		ChatID:   chatID,
		SenderID: userID.(uuid.UUID),
		Content:  content,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to create message",
		})
		return
	}

	// Add images if any
	for _, imageUrl := range req.Images {
		err := qtx.AddMessageImage(c.Request.Context(), database.AddMessageImageParams{
			MessageID: message.ID,
			Url:       imageUrl,
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error: "Failed to add message image",
			})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to commit transaction",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message_id": message.ID,
	})
}

func (h *MessageHandler) EditMessage(c *gin.Context, uploadHandler *UploadHandler) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error: "User ID not found in context",
		})
		return
	}

	var req models.EditMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: err.Error(),
		})
		return
	}

	messageID, err := uuid.Parse(req.MessageID)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Invalid message ID",
		})
		return
	}

	req.Content = strings.TrimSpace(req.Content)

	if len(req.Content) > constants.MaxMessageLength {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Message content exceeds maximum length of 5000 characters",
		})
		return
	}

	message, err := h.dbService.Queries.GetMessageById(c.Request.Context(), messageID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error: "Message not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to get message",
		})
		return
	}

	if message.SenderID != userID.(uuid.UUID) {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error: "You can only edit your own messages",
		})
		return
	}

	if message.IsDeleted {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Cannot edit a deleted message",
		})
		return
	}

	if time.Since(message.CreatedAt) > 15*time.Minute {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Messages can only be edited within 15 minutes of sending",
		})
		return
	}

	tx, err := h.dbService.DB.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to begin transaction",
		})
		return
	}
	defer tx.Rollback()

	qtx := h.dbService.Queries.WithTx(tx)

	var content sql.NullString
	if req.Content != "" {
		content = sql.NullString{String: req.Content, Valid: true}
	}

	err = qtx.EditMessage(c.Request.Context(), database.EditMessageParams{
		ID:      messageID,
		Content: content,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to edit message",
		})
		return
	}

	if len(req.RemovedImages) > 0 {
		err = qtx.DeleteMessageImages(c.Request.Context(), database.DeleteMessageImagesParams{
			MessageID: messageID,
			Column2:   req.RemovedImages,
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error: "Failed to delete images from database",
			})
			return
		}

		for _, imageURL := range req.RemovedImages {
			if err := uploadHandler.DeleteImage(imageURL); err != nil {
				c.JSON(http.StatusInternalServerError, models.ErrorResponse{
					Error: "Failed to delete image from storage",
				})
				return
			}
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to commit transaction",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
	})
}

func (h *MessageHandler) DeleteMessage(c *gin.Context, uploadHandler *UploadHandler) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error: "User ID not found in context",
		})
		return
	}

	var req models.DeleteMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: err.Error(),
		})
		return
	}

	messageID, err := uuid.Parse(req.MessageID)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Invalid message ID",
		})
		return
	}

	message, err := h.dbService.Queries.GetMessageById(c.Request.Context(), messageID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, models.ErrorResponse{
				Error: "Message not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to get message",
		})
		return
	}

	if message.SenderID != userID.(uuid.UUID) {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error: "You can only delete your own messages",
		})
		return
	}

	images, err := h.dbService.Queries.GetMessageImages(c.Request.Context(), []uuid.UUID{messageID})
	if err != nil && err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to get message images",
		})
		return
	}

	tx, err := h.dbService.DB.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to begin transaction",
		})
		return
	}
	defer tx.Rollback()

	qtx := h.dbService.Queries.WithTx(tx)

	err = qtx.DeleteMessage(c.Request.Context(), messageID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to delete message",
		})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to commit transaction",
		})
		return
	}

	for _, image := range images {
		if err := uploadHandler.DeleteImage(image.Url); err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error: "Failed to delete image from storage",
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
	})
}
