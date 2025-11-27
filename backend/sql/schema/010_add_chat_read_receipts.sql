-- +goose Up
CREATE TABLE chat_read_receipts (
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP NOT NULL,
    PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX idx_chat_read_receipts_message_id ON chat_read_receipts(last_read_message_id);
CREATE INDEX idx_chat_read_receipts_last_read_at ON chat_read_receipts(chat_id, last_read_at DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_chat_read_receipts_last_read_at;
DROP INDEX IF EXISTS idx_chat_read_receipts_message_id;
DROP TABLE IF EXISTS chat_read_receipts;
