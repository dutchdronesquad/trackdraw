ALTER TABLE audit_events ADD COLUMN actor_kind TEXT NOT NULL DEFAULT 'user';
ALTER TABLE audit_events ADD COLUMN actor_label TEXT;
ALTER TABLE audit_events ADD COLUMN target_label TEXT;

CREATE INDEX IF NOT EXISTS audit_events_actor_kind_idx ON audit_events(actor_kind);
CREATE INDEX IF NOT EXISTS audit_events_entity_idx ON audit_events(entity_type, entity_id);
