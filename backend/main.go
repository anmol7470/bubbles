package main

import (
	"log"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"github.com/anmol7470/bubbles/backend/database"
	"github.com/anmol7470/bubbles/backend/routes"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("Warning: .env file not found")
	}

	// Initialize database connection
	dbService, err := database.NewService()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer dbService.Close()

	router := gin.Default()

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{frontendURL},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Accept", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Initialize auth handler
	authHandler := routes.NewAuthHandler(dbService)

	// Auth routes
	auth := router.Group("/auth")
	{
		auth.POST("/signup", authHandler.SignUp)
		auth.POST("/signin", authHandler.SignIn)
		auth.GET("/verify", routes.AuthMiddleware(), authHandler.Verify)
	}

	// Initialize chat handler
	chatHandler := routes.NewChatHandler(dbService)

	// Chat routes
	chat := router.Group("/chat")
	chat.Use(routes.AuthMiddleware())
	{
		chat.POST("/search-users", chatHandler.SearchUsers)
		chat.POST("/create", chatHandler.CreateChat)
		chat.GET("/all", chatHandler.GetUserChats)
	}

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
