-- +goose Up
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- +goose Down
ALTER TABLE users
DROP COLUMN IF EXISTS profile_image_url;
