package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

type Service struct {
	DB      *sql.DB
	Queries *Queries
}

func NewService() (*Service, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is not set")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Database connection established successfully")

	queries := New(db)

	return &Service{
		DB:      db,
		Queries: queries,
	}, nil
}

func (s *Service) Close() error {
	if s.DB != nil {
		return s.DB.Close()
	}
	return nil
}
