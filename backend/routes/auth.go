package routes

import (
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"

	"github.com/anmol7470/bubbles/backend/database"
	"github.com/anmol7470/bubbles/backend/models"
	"github.com/anmol7470/bubbles/backend/utils"
)

type AuthHandler struct {
	dbService *database.Service
}

func NewAuthHandler(dbService *database.Service) *AuthHandler {
	return &AuthHandler{
		dbService: dbService,
	}
}

type JWTClaims struct {
	UserID   uuid.UUID `json:"user_id"`
	Username string    `json:"username"`
	Email    string    `json:"email"`
	jwt.RegisteredClaims
}

func GenerateJWT(userID uuid.UUID, username, email string) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "", fmt.Errorf("JWT_SECRET environment variable is not set")
	}

	// Get JWT expiration from environment variable (default: 2 hours)
	expirationHours := 2
	if expiryEnv := os.Getenv("JWT_EXPIRY_HOURS"); expiryEnv != "" {
		if hours, err := strconv.Atoi(expiryEnv); err == nil && hours > 0 {
			expirationHours = hours
		}
	}

	claims := JWTClaims{
		UserID:   userID,
		Username: username,
		Email:    email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expirationHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ValidateJWT(tokenString string) (*JWTClaims, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return nil, fmt.Errorf("JWT_SECRET environment variable is not set")
	}

	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

func (h *AuthHandler) SignUp(c *gin.Context) {
	var req models.SignUpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error: err.Error(),
		})
		return
	}

	// Get bcrypt cost from environment variable (default: 12)
	bcryptCost := 12
	if costEnv := os.Getenv("BCRYPT_COST"); costEnv != "" {
		if cost, err := strconv.Atoi(costEnv); err == nil && cost >= bcrypt.MinCost && cost <= bcrypt.MaxCost {
			bcryptCost = cost
		}
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcryptCost)
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
		// Check if it's a duplicate key error using PostgreSQL error codes
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			// 23505 is the PostgreSQL error code for unique_violation
			switch pqErr.Constraint {
			case "users_email_key":
				c.JSON(http.StatusConflict, models.ErrorResponse{
					Error: "Email already exists",
				})
			case "users_username_key":
				c.JSON(http.StatusConflict, models.ErrorResponse{
					Error: "Username already exists",
				})
			default:
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
	token, err := GenerateJWT(user.ID, user.Username, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to generate token",
		})
		return
	}

	// Log successful account creation
	utils.SecurityLogger.Info("User account created",
		"user_id", user.ID.String(),
		"username", user.Username,
		"email", user.Email,
		"ip", c.ClientIP(),
	)

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
			// Log failed login attempt
			utils.SecurityLogger.Warn("Failed login attempt - user not found",
				"input", req.EmailOrUsername,
				"ip", c.ClientIP(),
			)
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
		// Log failed login attempt - wrong password
		utils.SecurityLogger.Warn("Failed login attempt - invalid password",
			"user_id", user.ID.String(),
			"username", user.Username,
			"ip", c.ClientIP(),
		)
		c.JSON(http.StatusUnauthorized, models.ErrorResponse{
			Error: "Invalid credentials",
		})
		return
	}

	// Generate JWT token
	token, err := GenerateJWT(user.ID, user.Username, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to generate token",
		})
		return
	}

	// Log successful login
	utils.SecurityLogger.Info("User logged in",
		"user_id", user.ID.String(),
		"username", user.Username,
		"ip", c.ClientIP(),
	)

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
// Uses AuthMiddleware() which handles token validation and sets user info in context
func (h *AuthHandler) Verify(c *gin.Context) {
	// Get user ID from context (set by AuthMiddleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "User ID not found in context",
		})
		return
	}

	// Get user from database
	user, err := h.dbService.Queries.GetUserByID(c.Request.Context(), userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to retrieve user",
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
