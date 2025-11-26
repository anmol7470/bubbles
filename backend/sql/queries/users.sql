-- name: CreateUser :one
INSERT INTO users (username, email, password_hash)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1 LIMIT 1;

-- name: GetUserByUsername :one
SELECT * FROM users WHERE username = $1 LIMIT 1;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1 LIMIT 1;

-- name: UpdatePassword :exec
UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
WHERE id = $2;

-- name: UpdateUserProfile :one
UPDATE users
SET
    username = sqlc.arg(username),
    profile_image_url = CASE
        WHEN sqlc.arg(update_profile_image)::bool THEN sqlc.arg(profile_image_url)
        ELSE profile_image_url
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE id = sqlc.arg(id)
RETURNING *;
