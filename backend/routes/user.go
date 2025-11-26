package routes

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/lib/pq"

	"github.com/anmol7470/bubbles/backend/database"
	"github.com/anmol7470/bubbles/backend/models"
)

type UserHandler struct {
	dbService *database.Service
}

func NewUserHandler(dbService *database.Service) *UserHandler {
	return &UserHandler{
		dbService: dbService,
	}
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error: "User ID not found in context",
		})
		return
	}

	var req models.UpdateUserProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: err.Error(),
		})
		return
	}

	updateImage := false
	var profileImage sql.NullString

	if req.ProfileImageURL != nil {
		updateImage = true
		trimmed := strings.TrimSpace(*req.ProfileImageURL)
		if trimmed == "" {
			profileImage = sql.NullString{Valid: false}
		} else {
			profileImage = sql.NullString{String: trimmed, Valid: true}
		}
	}

	user, err := h.dbService.Queries.UpdateUserProfile(c.Request.Context(), database.UpdateUserProfileParams{
		ID:                 userID.(uuid.UUID),
		Username:           req.Username,
		UpdateProfileImage: updateImage,
		ProfileImageUrl:    profileImage,
	})

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			c.JSON(http.StatusConflict, models.ErrorResponse{
				Error: "Username already exists",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to update profile",
		})
		return
	}

	c.JSON(http.StatusOK, models.UpdateUserProfileResponse{
		User: models.UserInfo{
			ID:              user.ID,
			Username:        user.Username,
			Email:           user.Email,
			ProfileImageURL: nullableString(user.ProfileImageUrl),
			CreatedAt:       user.CreatedAt,
		},
	})
}
