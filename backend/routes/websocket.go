package routes

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	ws "github.com/anmol7470/bubbles/backend/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		allowedOrigin := os.Getenv("FRONTEND_URL")
		if allowedOrigin == "" {
			allowedOrigin = "http://localhost:3000"
		}
		return origin == allowedOrigin
	},
}

func HandleWebSocket(hub *ws.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		protocols := c.Request.Header.Get("Sec-WebSocket-Protocol")
		if protocols == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Token required in Sec-WebSocket-Protocol",
			})
			return
		}

		parts := strings.Split(protocols, ", ")
		var token string
		for _, p := range parts {
			if after, found := strings.CutPrefix(p, "Bearer."); found {
				token = after
				break
			}
		}

		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid token format in Sec-WebSocket-Protocol",
			})
			return
		}

		claims, err := ValidateJWT(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid or expired token",
			})
			return
		}

		responseHeaders := http.Header{}
		responseHeaders.Add("Sec-WebSocket-Protocol", "Bearer."+token)

		conn, err := upgrader.Upgrade(c.Writer, c.Request, responseHeaders)
		if err != nil {
			log.Printf("Failed to upgrade connection: %v", err)
			return
		}

		client := ws.NewClient(hub, conn, claims.UserID.String(), claims.Username, claims.Email)
		hub.Register <- client

		go client.WritePump()
		go client.ReadPump()
	}
}
