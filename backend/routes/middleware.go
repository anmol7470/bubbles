package routes

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/anmol7470/bubbles/backend/models"
)

// AuthMiddleware is a middleware that validates JWT tokens
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error: "Authorization header is required",
			})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error: "Invalid authorization header format. Expected: Bearer <token>",
			})
			c.Abort()
			return
		}

		token := parts[1]

		// Validate token
		claims, err := models.ValidateJWT(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Error: "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Store user information in context for use in handlers
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("email", claims.Email)

		c.Next()
	}
}
