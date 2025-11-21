-- name: IsChatMember :one
SELECT EXISTS(
    SELECT 1
    FROM chat_members
    WHERE chat_id = $1 AND user_id = $2
) AS is_member;
