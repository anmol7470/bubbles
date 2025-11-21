package routes

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/anmol7470/bubbles/backend/database"
	"github.com/anmol7470/bubbles/backend/models"
)

type ChatHandler struct {
	dbService *database.Service
}

func NewChatHandler(dbService *database.Service) *ChatHandler {
	return &ChatHandler{
		dbService: dbService,
	}
}

func (h *ChatHandler) SearchUsers(c *gin.Context) {
	var req models.SearchUsersRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: err.Error(),
		})
		return
	}

	users, err := h.dbService.Queries.SearchUsers(c.Request.Context(), database.SearchUsersParams{
		Query:       sql.NullString{String: req.Query, Valid: true},
		ExcludedIds: req.SelectedUserIds,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to search users",
		})
		return
	}

	result := make([]models.SearchUsersResponse, len(users))
	for i, user := range users {
		result[i] = models.SearchUsersResponse{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email,
		}
	}

	c.JSON(http.StatusOK, result)
}

func (h *ChatHandler) CreateChat(c *gin.Context) {
	var req models.CreateChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: err.Error(),
		})
		return
	}

	isGroup := len(req.MemberIds) > 2

	var chatID uuid.UUID
	var existing bool

	if !isGroup {
		existingChat, err := h.dbService.Queries.GetChatByMembers(c.Request.Context(), database.GetChatByMembersParams{
			MemberIds:   req.MemberIds,
			MemberCount: int64(len(req.MemberIds)),
		})

		if err == nil {
			chatID = existingChat.ID
			existing = true
		} else if err != sql.ErrNoRows {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error: "Failed to check existing chat",
			})
			return
		}
	}

	if !existing {
		var chatName sql.NullString
		if req.GroupName != "" {
			chatName = sql.NullString{String: req.GroupName, Valid: true}
		}

		chat, err := h.dbService.Queries.CreateChat(c.Request.Context(), database.CreateChatParams{
			Name:    chatName,
			IsGroup: isGroup,
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error: "Failed to create chat",
			})
			return
		}

		chatID = chat.ID

		for _, memberID := range req.MemberIds {
			err := h.dbService.Queries.AddChatMember(c.Request.Context(), database.AddChatMemberParams{
				ChatID: chatID,
				UserID: memberID,
			})

			if err != nil {
				c.JSON(http.StatusInternalServerError, models.ErrorResponse{
					Error: "Failed to add chat member",
				})
				return
			}
		}
	}

	c.JSON(http.StatusOK, models.CreateChatResponse{
		ChatID:   chatID,
		Existing: existing,
	})
}

func (h *ChatHandler) GetUserChats(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error: "User ID not found in context",
		})
		return
	}

	rows, err := h.dbService.Queries.GetChatsWithMembers(c.Request.Context(), userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to get chats",
		})
		return
	}

	// Group rows by chat ID and collect message IDs
	chatsMap := make(map[uuid.UUID]*models.ChatInfo)
	var chatOrder []uuid.UUID
	var messageIDs []uuid.UUID
	messageIDSet := make(map[uuid.UUID]bool)

	for _, row := range rows {
		if _, exists := chatsMap[row.ChatID]; !exists {
			var name *string
			if row.ChatName.Valid {
				name = &row.ChatName.String
			}

			chatInfo := &models.ChatInfo{
				ID:        row.ChatID,
				Name:      name,
				IsGroup:   row.IsGroup,
				Members:   []models.ChatMember{},
				CreatedAt: row.ChatCreatedAt,
				UpdatedAt: row.ChatUpdatedAt,
			}

			// Add last message if exists (check if ID is not zero UUID)
			if row.LastMessageID != uuid.Nil {
				var content *string
				if row.LastMessageContent.Valid {
					content = &row.LastMessageContent.String
				}

				var sender *models.MessageSender
				if row.LastMessageSenderID != uuid.Nil && row.LastMessageSenderUsername.Valid {
					sender = &models.MessageSender{
						ID:       row.LastMessageSenderID,
						Username: row.LastMessageSenderUsername.String,
					}
				}

				chatInfo.LastMessage = &models.LastMessage{
					ID:        row.LastMessageID,
					Content:   content,
					Sender:    sender,
					IsDeleted: row.LastMessageIsDeleted,
					Images:    []string{},
					CreatedAt: row.LastMessageCreatedAt,
				}

				// Collect message ID for fetching images
				if !messageIDSet[row.LastMessageID] {
					messageIDs = append(messageIDs, row.LastMessageID)
					messageIDSet[row.LastMessageID] = true
				}
			}

			chatsMap[row.ChatID] = chatInfo
			chatOrder = append(chatOrder, row.ChatID)
		}

		chatsMap[row.ChatID].Members = append(chatsMap[row.ChatID].Members, models.ChatMember{
			ID:       row.MemberID,
			Username: row.MemberUsername,
			Email:    row.MemberEmail,
		})
	}

	// Fetch images for all messages
	if len(messageIDs) > 0 {
		images, err := h.dbService.Queries.GetLastMessageImages(c.Request.Context(), messageIDs)
		if err == nil {
			// Group images by message ID
			imagesByMessage := make(map[uuid.UUID][]string)
			for _, img := range images {
				imagesByMessage[img.MessageID] = append(imagesByMessage[img.MessageID], img.Url)
			}

			// Assign images to last messages
			for _, chat := range chatsMap {
				if chat.LastMessage != nil {
					if imgs, ok := imagesByMessage[chat.LastMessage.ID]; ok {
						chat.LastMessage.Images = imgs
					}
				}
			}
		}
	}

	// Convert map to array preserving order
	result := make([]models.ChatInfo, 0, len(chatOrder))
	for _, chatID := range chatOrder {
		result = append(result, *chatsMap[chatID])
	}

	c.JSON(http.StatusOK, models.GetChatsResponse{
		Chats: result,
	})
}

func (h *ChatHandler) GetChatById(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error: "User ID not found in context",
		})
		return
	}

	chatIDStr := c.Param("id")
	chatID, err := uuid.Parse(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Invalid chat ID",
		})
		return
	}

	// Get chat info with members
	chatMembers, err := h.dbService.Queries.GetChatByIdWithMembers(c.Request.Context(), chatID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to get chat",
		})
		return
	}

	if len(chatMembers) == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error: "Chat not found",
		})
		return
	}

	// Verify user is a member of the chat
	isMember := false
	for _, member := range chatMembers {
		if member.MemberID == userID.(uuid.UUID) {
			isMember = true
			break
		}
	}

	if !isMember {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error: "You are not a member of this chat",
		})
		return
	}

	// Build members list
	membersMap := make(map[uuid.UUID]models.ChatMember)
	for _, member := range chatMembers {
		membersMap[member.MemberID] = models.ChatMember{
			ID:       member.MemberID,
			Username: member.MemberUsername,
			Email:    member.MemberEmail,
		}
	}

	members := make([]models.ChatMember, 0, len(membersMap))
	for _, member := range membersMap {
		members = append(members, member)
	}

	// Build response
	var name *string
	if chatMembers[0].ChatName.Valid {
		name = &chatMembers[0].ChatName.String
	}

	response := models.GetChatByIdResponse{
		ID:        chatMembers[0].ChatID,
		Name:      name,
		IsGroup:   chatMembers[0].IsGroup,
		Members:   members,
		CreatedAt: chatMembers[0].ChatCreatedAt,
		UpdatedAt: chatMembers[0].ChatUpdatedAt,
	}

	c.JSON(http.StatusOK, response)
}

func (h *ChatHandler) GetChatMessages(c *gin.Context) {
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
	chatMembers, err := h.dbService.Queries.GetChatByIdWithMembers(c.Request.Context(), chatID)
	if err != nil || len(chatMembers) == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error: "Chat not found",
		})
		return
	}

	isMember := false
	for _, member := range chatMembers {
		if member.MemberID == userID.(uuid.UUID) {
			isMember = true
			break
		}
	}

	if !isMember {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error: "You are not a member of this chat",
		})
		return
	}

	// Set default limit
	limit := req.Limit
	if limit <= 0 || limit > 50 {
		limit = 50
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

func (h *ChatHandler) SendMessage(c *gin.Context) {
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

	chatID, err := uuid.Parse(req.ChatID)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Invalid chat ID",
		})
		return
	}

	// Verify user is member of chat
	chatMembers, err := h.dbService.Queries.GetChatByIdWithMembers(c.Request.Context(), chatID)
	if err != nil || len(chatMembers) == 0 {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error: "Chat not found",
		})
		return
	}

	isMember := false
	for _, member := range chatMembers {
		if member.MemberID == userID.(uuid.UUID) {
			isMember = true
			break
		}
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

	// Create message
	var content sql.NullString
	if req.Content != "" {
		content = sql.NullString{String: req.Content, Valid: true}
	}

	message, err := h.dbService.Queries.CreateMessage(c.Request.Context(), database.CreateMessageParams{
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
		err := h.dbService.Queries.AddMessageImage(c.Request.Context(), database.AddMessageImageParams{
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

	c.JSON(http.StatusOK, gin.H{
		"message_id": message.ID,
	})
}
