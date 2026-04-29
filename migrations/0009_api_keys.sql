CREATE TABLE IF NOT EXISTS apikey (
  id TEXT PRIMARY KEY,
  configId TEXT NOT NULL DEFAULT 'default',
  name TEXT,
  start TEXT,
  referenceId TEXT NOT NULL,
  prefix TEXT,
  key TEXT NOT NULL,
  refillInterval INTEGER,
  refillAmount INTEGER,
  lastRefillAt TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  rateLimitEnabled INTEGER NOT NULL DEFAULT 1,
  rateLimitTimeWindow INTEGER,
  rateLimitMax INTEGER,
  requestCount INTEGER NOT NULL DEFAULT 0,
  remaining INTEGER,
  lastRequest TEXT,
  expiresAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  permissions TEXT,
  metadata TEXT,
  FOREIGN KEY (referenceId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS apikey_config_id_idx ON apikey(configId);
CREATE INDEX IF NOT EXISTS apikey_reference_id_idx ON apikey(referenceId);
CREATE UNIQUE INDEX IF NOT EXISTS apikey_key_idx ON apikey(key);
CREATE INDEX IF NOT EXISTS apikey_expires_at_idx ON apikey(expiresAt);
