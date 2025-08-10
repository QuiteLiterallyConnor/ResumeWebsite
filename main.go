package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	// "io"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

type ContactMessage struct {
	TS        string `json:"ts"`
	IP        string `json:"ip,omitempty"`
	UserAgent string `json:"user_agent,omitempty"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Message   string `json:"message"`
}

var discordWebhook string

func main() {
	// Load webhook from environment
	discordWebhook = os.Getenv("DISCORD_WEBHOOK")
	if discordWebhook == "" {
		fmt.Println("ERROR: DISCORD_WEBHOOK environment variable is not set")
		os.Exit(1)
	}

	staticDir := "./static"
	saveFile := "contact_messages.jsonl"
	port := 9080

	r := gin.Default()

	// POST /api/contact
	r.POST("/api/contact", func(c *gin.Context) {
		var msg ContactMessage
		if err := c.ShouldBindJSON(&msg); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
			return
		}
		if msg.Name == "" || msg.Email == "" || msg.Message == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required fields"})
			return
		}

		msg.TS = time.Now().UTC().Format(time.RFC3339)
		msg.IP = c.ClientIP()
		msg.UserAgent = c.GetHeader("User-Agent")

		// Save locally
		if err := appendJSONL(saveFile, msg); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Server error"})
			return
		}

		fmt.Printf("[CONTACT] %s from %s - %s\n", msg.TS, msg.Email, msg.Name)

		// Send to Discord
		go sendDiscordNotification(msg)

		c.Status(http.StatusNoContent)
	})

	// Serve static + SPA fallback
	r.NoRoute(func(c *gin.Context) {
		path := filepath.Join(staticDir, c.Request.URL.Path)
		if info, err := os.Stat(path); err == nil && !info.IsDir() {
			c.File(path)
			return
		}
		c.File(filepath.Join(staticDir, "index.html"))
	})

	// Map assets for Angular builds
	r.Static("/assets", filepath.Join(staticDir, "assets"))

	fmt.Printf("Server running: http://127.0.0.1:%d/\n", port)
	r.Run(fmt.Sprintf(":%d", port))
}

func appendJSONL(filePath string, v interface{}) error {
	f, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return err
	}
	defer f.Close()
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	_, err = f.WriteString(string(data) + "\n")
	return err
}

func sendDiscordNotification(msg ContactMessage) {
	embed := map[string]interface{}{
		"title":       "📬 New Contact Form Submission",
		"description": fmt.Sprintf("**Name:** %s\n**Email:** %s\n**Message:**\n%s", msg.Name, msg.Email, msg.Message),
		"color":       3447003, // blue
		"footer": map[string]string{
			"text": fmt.Sprintf("From %s | IP: %s", msg.TS, msg.IP),
		},
	}

	payload := map[string]interface{}{
		"embeds": []map[string]interface{}{embed},
	}

	body, _ := json.Marshal(payload)

	resp, err := http.Post(discordWebhook, "application/json", bytes.NewBuffer(body))
	if err != nil {
		fmt.Println("Error sending Discord notification:", err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		fmt.Println("Discord webhook returned status", resp.Status)
	}
}
