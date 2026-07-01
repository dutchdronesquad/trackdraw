ALTER TABLE users ADD COLUMN banned_at TEXT;
ALTER TABLE users ADD COLUMN ban_reason TEXT;

CREATE INDEX IF NOT EXISTS users_banned_at_idx ON users(banned_at);
