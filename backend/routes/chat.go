package routes

import (
	"database/sql"
	"net/http"

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
