package utils

import (
	"log/slog"
	"os"
)

var SecurityLogger *slog.Logger

func InitLogger() {
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	SecurityLogger = slog.New(handler)
}
