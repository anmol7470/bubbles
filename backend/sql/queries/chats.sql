-- name: SearchUsers :many
SELECT id, username, email, created_at, updated_at
FROM users
WHERE username ILIKE '%' || sqlc.arg(query) || '%'
AND id != ALL(sqlc.arg(excluded_ids)::uuid[])
LIMIT 20;

-- name: CreateChat :one
INSERT INTO chats (name, is_group)
VALUES ($1, $2)
RETURNING *;

-- name: AddChatMember :exec
INSERT INTO chat_members (chat_id, user_id)
VALUES ($1, $2);

-- name: GetChatByMembers :one
SELECT c.id, c.name, c.is_group, c.created_at, c.updated_at
FROM chats c
WHERE c.is_group = false
AND c.id IN (
    SELECT cm.chat_id
    FROM chat_members cm
    WHERE cm.user_id = ANY(sqlc.arg(member_ids)::uuid[])
    GROUP BY cm.chat_id
    HAVING COUNT(DISTINCT cm.user_id) = sqlc.arg(member_count)::bigint
)
LIMIT 1;

-- name: GetChatByIdWithMembers :many
SELECT
    c.id as chat_id,
    c.name as chat_name,
    c.is_group,
    c.created_at as chat_created_at,
    c.updated_at as chat_updated_at,
    u.id as member_id,
    u.username as member_username,
    u.email as member_email
FROM chats c
INNER JOIN chat_members cm ON c.id = cm.chat_id
INNER JOIN users u ON cm.user_id = u.id
WHERE c.id = $1
ORDER BY u.username ASC;

-- name: GetChatsWithMembers :many
SELECT
    c.id as chat_id,
    c.name as chat_name,
    c.is_group,
    c.created_at as chat_created_at,
    c.updated_at as chat_updated_at,
    u.id as member_id,
    u.username as member_username,
    u.email as member_email,
    COALESCE(c.msg_id, '00000000-0000-0000-0000-000000000000'::uuid) as last_message_id,
    c.msg_content as last_message_content,
    COALESCE(c.msg_sender_id, '00000000-0000-0000-0000-000000000000'::uuid) as last_message_sender_id,
    COALESCE(c.msg_is_deleted, false) as last_message_is_deleted,
    COALESCE(c.msg_created_at, c.created_at) as last_message_created_at,
    c.msg_sender_username as last_message_sender_username
FROM (
    SELECT
        c.id,
        c.name,
        c.is_group,
        c.created_at,
        c.updated_at,
        lm.id as msg_id,
        lm.content as msg_content,
        lm.sender_id as msg_sender_id,
        lm.is_deleted as msg_is_deleted,
        lm.created_at as msg_created_at,
        sender.username as msg_sender_username,
        ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY COALESCE(lm.created_at, c.created_at) DESC) as rn
    FROM chats c
    LEFT JOIN LATERAL (
        SELECT id, chat_id, sender_id, content, is_deleted, created_at
        FROM messages
        WHERE chat_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
    ) lm ON true
    LEFT JOIN users sender ON lm.sender_id = sender.id
    WHERE c.id IN (
        SELECT DISTINCT cm2.chat_id
        FROM chat_members cm2
        WHERE cm2.user_id = $1
    )
) c
INNER JOIN chat_members cm ON c.id = cm.chat_id
INNER JOIN users u ON cm.user_id = u.id
WHERE c.rn = 1
ORDER BY COALESCE(c.msg_created_at, c.created_at) DESC, u.username ASC;

-- name: GetLastMessageImages :many
SELECT message_id, url
FROM images
WHERE message_id = ANY($1::uuid[]);
