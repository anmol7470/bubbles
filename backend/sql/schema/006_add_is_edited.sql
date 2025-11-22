-- +goose Up
ALTER TABLE messages
ADD COLUMN is_edited BOOLEAN NOT NULL DEFAULT false;

-- +goose Down
ALTER TABLE messages
DROP COLUMN is_edited;
