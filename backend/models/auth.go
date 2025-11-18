package models

import (
	"time"

	"github.com/google/uuid"
)

// SignUpRequest represents the signup request payload
type SignUpRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50,alphanum"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

// SignInRequest represents the signin request payload
type SignInRequest struct {
	EmailOrUsername string `json:"email_or_username" binding:"required"`
	Password        string `json:"password" binding:"required"`
}

// VerifyResponse represents the JWT verification response
type VerifyResponse struct {
	Success bool      `json:"success"`
	User    *UserInfo `json:"user,omitempty"`
}

// AuthResponse represents the authentication response
type AuthResponse struct {
	Token string    `json:"token"`
	User  UserInfo  `json:"user"`
}

// UserInfo represents user information in responses
type UserInfo struct {
	ID        uuid.UUID `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error string `json:"error"`
}
