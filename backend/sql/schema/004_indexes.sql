-- +goose Up
-- Enable pg_trgm extension for better text search performance
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create covering index for chat_members lookups
-- This optimizes queries that filter by user_id and need chat_id
CREATE INDEX IF NOT EXISTS idx_chat_members_covering ON chat_members(user_id, chat_id);

-- Create index for efficient message pagination
-- This optimizes the GetMessagesByChatPaginated query
CREATE INDEX IF NOT EXISTS idx_messages_pagination ON messages(chat_id, created_at DESC, id DESC);

-- Create trigram index for username search
-- This significantly improves ILIKE queries on username
DROP INDEX IF EXISTS idx_users_username;
CREATE INDEX idx_users_username_trgm ON users USING gin(username gin_trgm_ops);

-- +goose Down
DROP INDEX IF EXISTS idx_users_username_trgm;
CREATE INDEX idx_users_username ON users(username);

DROP INDEX IF EXISTS idx_messages_pagination;

DROP INDEX IF EXISTS idx_chat_members_covering;

DROP EXTENSION IF EXISTS pg_trgm;
