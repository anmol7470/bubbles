-- +goose Up
ALTER TABLE chats
ADD COLUMN created_by UUID;

WITH first_members AS (
    SELECT chat_id, user_id
    FROM (
        SELECT
            chat_id,
            user_id,
            ROW_NUMBER() OVER (PARTITION BY chat_id ORDER BY joined_at ASC) AS rn
        FROM chat_members
    ) ranked_members
    WHERE rn = 1
)
UPDATE chats c
SET created_by = fm.user_id
FROM first_members fm
WHERE c.id = fm.chat_id;

ALTER TABLE chats
ALTER COLUMN created_by SET NOT NULL;

ALTER TABLE chats
ADD CONSTRAINT fk_chats_created_by
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE chat_members
ADD COLUMN cleared_at TIMESTAMP;

ALTER TABLE chat_members
ADD COLUMN deleted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_chat_members_cleared_at ON chat_members(cleared_at);
CREATE INDEX IF NOT EXISTS idx_chat_members_deleted_at ON chat_members(deleted_at);

-- +goose Down
DROP INDEX IF EXISTS idx_chat_members_deleted_at;
DROP INDEX IF EXISTS idx_chat_members_cleared_at;

ALTER TABLE chat_members
DROP COLUMN deleted_at;

ALTER TABLE chat_members
DROP COLUMN cleared_at;

ALTER TABLE chats
DROP CONSTRAINT IF EXISTS fk_chats_created_by;

ALTER TABLE chats
DROP COLUMN created_by;
