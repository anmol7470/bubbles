.PHONY: help build run dev test sqlc-gen migrate-up migrate-down migrate-status docker-up docker-down docker-logs docker-reset install-tools tidy

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

docker-up: ## Start PostgreSQL database in Docker
	docker compose up -d

docker-down: ## Stop PostgreSQL database
	docker compose down

docker-logs: ## View PostgreSQL logs
	docker compose logs -f postgres

docker-reset: ## Reset database (removes all data)
	docker compose down -v
	docker compose up -d

build: ## Build the application
	go build -o tmp/main main.go

run: ## Run the application
	go run main.go

dev: ## Run the application with hot reload (requires air)
	air

test: ## Run tests
	go test -v ./...

sqlc-gen: ## Generate sqlc code
	sqlc generate

tidy: ## Tidy go modules
	go mod tidy

install-tools: ## Install development tools
	go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
	go install github.com/air-verse/air@latest
	go install github.com/pressly/goose/v3/cmd/goose@latest

migrate-up: ## Run database migrations
	goose -dir sql/schema postgres "$(DATABASE_URL)" up

migrate-down: ## Rollback last database migration
	goose -dir sql/schema postgres "$(DATABASE_URL)" down

migrate-status: ## Show migration status
	goose -dir sql/schema postgres "$(DATABASE_URL)" status
