package utils

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/anmol7470/bubbles/backend/models"
)

func NullableString(value sql.NullString) *string {
	if value.Valid {
		v := value.String
		return &v
	}
	return nil
}

func GetUserIDFromContext(c *gin.Context) (uuid.UUID, bool) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error: "User ID not found in context",
		})
		return uuid.Nil, false
	}

	return userIDValue.(uuid.UUID), true
}

func ParseChatIDParam(c *gin.Context) (uuid.UUID, bool) {
	chatIDStr := c.Param("id")
	chatID, err := uuid.Parse(chatIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: "Invalid chat ID",
		})
		return uuid.Nil, false
	}
	return chatID, true
}
