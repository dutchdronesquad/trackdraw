CREATE TABLE IF NOT EXISTS passkey (
  id TEXT PRIMARY KEY,
  name TEXT,
  publicKey TEXT NOT NULL,
  userId TEXT NOT NULL,
  credentialID TEXT NOT NULL,
  counter INTEGER NOT NULL,
  deviceType TEXT NOT NULL,
  backedUp INTEGER NOT NULL DEFAULT 0,
  transports TEXT,
  createdAt TEXT NOT NULL,
  aaguid TEXT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS passkey_user_id_idx ON passkey(userId);
CREATE INDEX IF NOT EXISTS passkey_credential_id_idx ON passkey(credentialID);
