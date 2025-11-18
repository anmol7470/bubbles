package routes

import (
	"database/sql"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"github.com/anmol7470/bubbles/backend/database"
	"github.com/anmol7470/bubbles/backend/models"
)

type AuthHandler struct {
	dbService *database.Service
}

func NewAuthHandler(dbService *database.Service) *AuthHandler {
	return &AuthHandler{
		dbService: dbService,
	}
}

// SignUp handles user registration
func (h *AuthHandler) SignUp(c *gin.Context) {
	var req models.SignUpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: err.Error(),
		})
		return
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to hash password",
		})
		return
	}

	// Create the user
	user, err := h.dbService.Queries.CreateUser(c.Request.Context(), database.CreateUserParams{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
	})

	if err != nil {
		// Check if it's a duplicate key error
		if strings.Contains(err.Error(), "duplicate key") {
			if strings.Contains(err.Error(), "users_email_key") {
				c.JSON(http.StatusConflict, models.ErrorResponse{
					Error: "Email already exists",
				})
			} else if strings.Contains(err.Error(), "users_username_key") {
				c.JSON(http.StatusConflict, models.ErrorResponse{
					Error: "Username already exists",
				})
			} else {
				c.JSON(http.StatusConflict, models.ErrorResponse{
					Error: "User already exists",
				})
			}
			return
		}

		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to create user",
		})
		return
	}

	// Generate JWT token
	token, err := models.GenerateJWT(user.ID, user.Username, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to generate token",
		})
		return
	}

	c.JSON(http.StatusCreated, models.AuthResponse{
		Token: token,
		User: models.UserInfo{
			ID:        user.ID,
			Username:  user.Username,
			Email:     user.Email,
			CreatedAt: user.CreatedAt,
		},
	})
}

// SignIn handles user authentication
func (h *AuthHandler) SignIn(c *gin.Context) {
	var req models.SignInRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: err.Error(),
		})
		return
	}

	// Determine if input is email or username
	isEmail := strings.Contains(req.EmailOrUsername, "@")

	var user database.User
	var err error

	if isEmail {
		user, err = h.dbService.Queries.GetUserByEmail(c.Request.Context(), req.EmailOrUsername)
	} else {
		user, err = h.dbService.Queries.GetUserByUsername(c.Request.Context(), req.EmailOrUsername)
	}

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error: "Invalid credentials",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to retrieve user",
		})
		return
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error: "Invalid credentials",
		})
		return
	}

	// Generate JWT token
	token, err := models.GenerateJWT(user.ID, user.Username, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to generate token",
		})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{
		Token: token,
		User: models.UserInfo{
			ID:        user.ID,
			Username:  user.Username,
			Email:     user.Email,
			CreatedAt: user.CreatedAt,
		},
	})
}

// Verify validates the JWT token and returns user details
func (h *AuthHandler) Verify(c *gin.Context) {
	// Get token from Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusOK, models.VerifyResponse{
			Success: false,
		})
		return
	}

	// Extract token from "Bearer <token>"
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		c.JSON(http.StatusOK, models.VerifyResponse{
			Success: false,
		})
		return
	}

	token := parts[1]

	// Validate token
	claims, err := models.ValidateJWT(token)
	if err != nil {
		c.JSON(http.StatusOK, models.VerifyResponse{
			Success: false,
		})
		return
	}

	// Get user from database
	user, err := h.dbService.Queries.GetUserByID(c.Request.Context(), claims.UserID)
	if err != nil {
		c.JSON(http.StatusOK, models.VerifyResponse{
			Success: false,
		})
		return
	}

	c.JSON(http.StatusOK, models.VerifyResponse{
		Success: true,
		User: &models.UserInfo{
			ID:        user.ID,
			Username:  user.Username,
			Email:     user.Email,
			CreatedAt: user.CreatedAt,
		},
	})
}
