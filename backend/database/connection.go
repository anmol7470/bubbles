package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

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

	// Configure connection pool
	db.SetMaxOpenConns(25)                 // Maximum number of open connections to the database
	db.SetMaxIdleConns(5)                  // Maximum number of idle connections in the pool
	db.SetConnMaxLifetime(5 * time.Minute) // Maximum amount of time a connection may be reused (5 minutes)
	db.SetConnMaxIdleTime(3 * time.Minute) // Maximum amount of time a connection may be idle (3 minutes)

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
