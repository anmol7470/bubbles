-- name: CreateMessage :one
INSERT INTO messages (chat_id, sender_id, content)
VALUES ($1, $2, $3)
RETURNING *;

-- name: AddMessageImage :exec
INSERT INTO images (message_id, url)
VALUES ($1, $2);

-- name: GetMessagesByChat :many
SELECT
    m.id,
    m.chat_id,
    m.sender_id,
    m.content,
    m.is_deleted,
    m.created_at,
    m.updated_at,
    u.username as sender_username,
    u.email as sender_email
FROM messages m
INNER JOIN users u ON m.sender_id = u.id
WHERE m.chat_id = $1
ORDER BY m.created_at DESC
LIMIT 50;

-- name: GetMessageImages :many
SELECT id, message_id, url, created_at
FROM images
WHERE message_id = ANY($1::uuid[]);

-- name: DeleteMessage :exec
UPDATE messages
SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
WHERE id = $1;
